// Loaded lazily: the ElevenLabs SDK (with LiveKit for WebRTC) is large and only needed during a workout.
import { useEffect, useMemo, useRef, useState } from 'react'
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import type { VoiceHandle, VoiceStatus } from './voice'

interface Props {
  register: (voice: VoiceHandle | null) => void
  muted: boolean
  volume: number
}

export default function CoachHost(props: Props) {
  return (
    <ConversationProvider>
      <Bridge {...props}/>
    </ConversationProvider>
  )
}

function Bridge({ register, muted, volume }: Props) {
  const [failed, setFailed] = useState(false)
  const { startSession, endSession, sendContextualUpdate, sendUserMessage, status, isSpeaking } = useConversation({
    micMuted: muted,
    volume: muted ? 0 : volume,
    onError: (message: string) => {
      console.warn('[coach]', message)
      setFailed(true)
    },
  })
  const connected = useRef(false)
  connected.current = status === 'connected'

  const voiceStatus: VoiceStatus = failed || status === 'error' ? 'error'
    : status === 'connected' ? 'connected'
    : status === 'connecting' ? 'connecting'
    : 'idle'

  const voice = useMemo<VoiceHandle>(() => ({
    status: voiceStatus,
    speaking: isSpeaking,
    start: ({ token, prompt, firstMessage, voiceId }) => {
      setFailed(false)
      // Safari 17+: a mic + speaker session, so the coach doesn't drop to the earpiece and the ringer switch
      // doesn't silence it.
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
      if (session) session.type = 'play-and-record'
      startSession({
        conversationToken: token,
        connectionType: 'webrtc',
        useWakeLock: false, // the camera screen already holds one
        overrides: {
          agent: { prompt: { prompt }, firstMessage },
          ...(voiceId ? { tts: { voiceId } } : {}),
        },
      })
    },
    end: () => endSession(),
    context: text => { if (connected.current) sendContextualUpdate(text) },
    say: text => { if (connected.current) sendUserMessage(text) },
  }), [voiceStatus, isSpeaking, startSession, endSession, sendContextualUpdate, sendUserMessage])

  useEffect(() => register(voice), [register, voice])
  useEffect(() => () => {
    register(null)
    endSession()
  }, [register, endSession])
  return null
}
