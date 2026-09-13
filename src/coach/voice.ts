/** The voice session CoachHost exposes (kept separate so the ElevenLabs SDK can load lazily). */
export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface VoiceStart {
  token: string
  prompt: string
  firstMessage: string
  voiceId?: string
}

export interface VoiceHandle {
  status: VoiceStatus
  speaking: boolean
  /** Call synchronously inside a tap (iOS audio). */
  start: (o: VoiceStart) => void
  end: () => void
  /** Silent context. */
  context: (text: string) => void
  /** A message the agent answers out loud. */
  say: (text: string) => void
}
