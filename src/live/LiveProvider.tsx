import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useLiveLocation } from './useLiveLocation'
import { usePresence, type RemotePlayer, type ServerMessage } from './usePresence'

interface Live {
  location: ReturnType<typeof useLiveLocation>
  connected: boolean
  others: RemotePlayer[]
}

interface Socket {
  connected: boolean
  send: (msg: object) => boolean
  subscribe: (listener: (msg: ServerMessage) => void) => () => void
}

const LiveContext = createContext<Live | null>(null)
// Separate, stable context so challenge/workout screens don't re-render on every GPS or compass update.
const SocketContext = createContext<Socket | null>(null)

/**
 * One GPS watch + one presence socket for the whole app. It used to live in MapScreen, which unmounts on
 * other tabs and during the battle flow — that dropped the socket, and with it any challenge in progress.
 */
export function LiveProvider({ children }: { children: ReactNode }) {
  const location = useLiveLocation()
  const { connected, others, send, subscribe } = usePresence(location.position, location.heading)
  const socket = useMemo(() => ({ connected, send, subscribe }), [connected, send, subscribe])
  return (
    <SocketContext.Provider value={socket}>
      <LiveContext.Provider value={{ location, connected, others }}>{children}</LiveContext.Provider>
    </SocketContext.Provider>
  )
}

export function useLive(): Live {
  const live = useContext(LiveContext)
  if (!live) throw new Error('useLive must be used inside <LiveProvider>')
  return live
}

export function useSocket(): Socket {
  const socket = useContext(SocketContext)
  if (!socket) throw new Error('useSocket must be used inside <LiveProvider>')
  return socket
}
