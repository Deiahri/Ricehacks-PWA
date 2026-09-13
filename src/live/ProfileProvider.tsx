import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Equipped, Slot } from '../config/cosmetics'
import { storage } from '../platform'
import { api, ApiError } from './api'
import { useSocket } from './LiveProvider'

/** My account as the server sees it. */
export interface Profile {
  username: string | null
  shirt: string | null
  /** Skin tone id (src/config/appearance.ts); null = the default tone. */
  skin: string | null
  bp: number
  level: number
  wins: number
  losses: number
  equipped: Equipped
  owned: string[]
}

export interface Friend extends Profile {
  username: string
  /** Friends list only: connected right now, in a set, and the connection id to challenge. */
  online?: boolean
  busy?: boolean
  presenceId?: string | null
}

export interface FriendLists {
  friends: Friend[]
  incoming: Friend[]
  outgoing: Friend[]
}

/** Something that happened while I wasn't looking. So far: what became of a friend request I sent. */
export interface AppNotification {
  id: number
  type: 'friend_accepted' | 'friend_declined'
  createdAt: string
  read: boolean
  /** Who did it. */
  actor: Profile | null
}

export interface Inbox {
  items: AppNotification[]
  unread: number
}

/** loading: first contact · ready: have a profile · offline: can't reach the server (retrying) · no-db: server runs without accounts. */
export type AccountStatus = 'loading' | 'ready' | 'offline' | 'no-db'

interface Account {
  status: AccountStatus
  profile: Profile | null
  /** My username, or the last one seen while the server is out of reach. */
  username: string | null
  friends: FriendLists
  inbox: Inbox
  refresh: () => void
  claimUsername: (username: string) => Promise<void>
  /** Skin tone id and/or shirt colour (free). */
  setAppearance: (look: { skin?: string; shirt?: string }) => Promise<void>
  buy: (itemId: string) => Promise<void>
  equip: (slot: Slot, itemId: string | null) => Promise<void>
  /** 'accepted' when they had already asked you. */
  sendRequest: (username: string) => Promise<'sent' | 'accepted'>
  respond: (username: string, accept: boolean) => Promise<void>
  /** Mark every notification read. */
  markRead: () => void
}

const NO_FRIENDS: FriendLists = { friends: [], incoming: [], outgoing: [] }
const EMPTY_INBOX: Inbox = { items: [], unread: 0 }
const RETRY_MS = 5_000 // Render's free tier can take a minute to wake up
const FRIENDS_POLL_MS = 15_000 // online dots
export const NAME_KEY = 'account.username'

const AccountContext = createContext<Account | null>(null)

/** Account, friends, inbox and shop state from the server's JSON API, kept fresh by the socket's pushes. Inside <LiveProvider>. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { connected, subscribe } = useSocket()
  const [status, setStatus] = useState<AccountStatus>('loading')
  const [profile, setProfileState] = useState<Profile | null>(null)
  const [friends, setFriends] = useState<FriendLists>(NO_FRIENDS)
  const [inbox, setInbox] = useState<Inbox>(EMPTY_INBOX)
  const [attempt, setAttempt] = useState(0)

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p)
    setStatus('ready')
    if (p.username) {
      storage.set(NAME_KEY, p.username)
      storage.set('presence.name', p.username) // the name the socket's hello carries next time
    }
  }, [])
  const refresh = useCallback(() => setAttempt(a => a + 1), [])

  useEffect(() => {
    let cancelled = false
    api<Profile>('GET', '/api/me').then(
      p => { if (!cancelled) setProfile(p) },
      (e: unknown) => {
        if (cancelled) return
        const noDb = e instanceof ApiError && e.code === 'no-db'
        setStatus(s => (s === 'ready' ? s : noDb ? 'no-db' : 'offline'))
      },
    )
    return () => { cancelled = true }
  }, [attempt, setProfile])

  useEffect(() => {
    if (status !== 'offline') return
    const t = setTimeout(refresh, RETRY_MS)
    return () => clearTimeout(t)
  }, [status, attempt, refresh])
  useEffect(() => { if (connected) refresh() }, [connected, refresh])

  const username = profile?.username ?? null
  const loadFriends = useCallback(() => {
    api<FriendLists>('GET', '/api/friends').then(setFriends, () => {})
  }, [])
  useEffect(() => {
    if (!username) return
    loadFriends()
    const t = setInterval(loadFriends, FRIENDS_POLL_MS)
    return () => clearInterval(t)
  }, [username, loadFriends])

  // Notifications pushed while this device was offline are picked up on every (re)connect.
  const loadInbox = useCallback(() => {
    api<Inbox>('GET', '/api/notifications').then(setInbox, () => {})
  }, [])
  useEffect(() => {
    if (username && connected) loadInbox()
  }, [username, connected, loadInbox])

  useEffect(() => subscribe(msg => {
    if (msg.type === 'profile' && msg.profile) setProfile(msg.profile as Profile)
    else if (msg.type === 'friend_request' || msg.type === 'friend_update') loadFriends()
    else if (msg.type === 'notification' && msg.notification) {
      const n = msg.notification as AppNotification
      setInbox(b => b.items.some(x => x.id === n.id) ? b : { items: [n, ...b.items].slice(0, 30), unread: b.unread + (n.read ? 0 : 1) })
    }
  }), [subscribe, setProfile, loadFriends])

  const claimUsername = useCallback(async (name: string) => {
    setProfile(await api<Profile>('POST', '/api/username', { username: name }))
  }, [setProfile])
  const setAppearance = useCallback(async (look: { skin?: string; shirt?: string }) => {
    setProfile(await api<Profile>('POST', '/api/appearance', look))
  }, [setProfile])
  const buy = useCallback(async (itemId: string) => {
    setProfile(await api<Profile>('POST', '/api/shop/buy', { itemId }))
  }, [setProfile])
  const equip = useCallback(async (slot: Slot, itemId: string | null) => {
    setProfile(await api<Profile>('POST', '/api/equip', { slot, itemId }))
  }, [setProfile])
  const sendRequest = useCallback(async (to: string) => {
    const { status: s } = await api<{ status: 'sent' | 'accepted' }>('POST', '/api/friends/requests', { username: to })
    loadFriends()
    return s
  }, [loadFriends])
  const respond = useCallback(async (from: string, accept: boolean) => {
    await api('POST', '/api/friends/respond', { username: from, accept })
    loadFriends()
  }, [loadFriends])
  const markRead = useCallback(() => {
    setInbox(b => ({ items: b.items.map(n => (n.read ? n : { ...n, read: true })), unread: 0 }))
    api('POST', '/api/notifications/read').catch(() => {})
  }, [])

  const value = useMemo<Account>(() => ({
    status,
    profile,
    username: username ?? (status === 'ready' ? null : storage.get(NAME_KEY) || null),
    friends,
    inbox,
    refresh, claimUsername, setAppearance, buy, equip, sendRequest, respond, markRead,
  }), [status, profile, username, friends, inbox, refresh, claimUsername, setAppearance, buy, equip, sendRequest, respond, markRead])

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useProfile(): Account {
  const account = useContext(AccountContext)
  if (!account) throw new Error('useProfile must be used inside <ProfileProvider>')
  return account
}

export const sameName = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase()
