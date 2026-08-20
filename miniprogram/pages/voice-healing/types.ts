export interface HealingMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  isVoice?: boolean
}

export interface HealingToolCall {
  id?: string
  name: 'start_soundscape' | 'start_breathing' | 'start_grounding' | 'start_art_exercise' | 'analyze_artwork' | 'handoff_support'
  phase?: 'offer' | 'execute'
  requiresConsent?: boolean
  reason?: string
  input?: Record<string, unknown>
}

export interface HealingToolEvent {
  id: string
  name: string
  description: string
  icon: string
  status: 'waiting' | 'running' | 'done' | 'cancelled'
}
