export interface HealingMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  isVoice?: boolean
}

export interface HealingToolCall {
  name: 'healing_music' | 'mindfulness' | 'breathing'
  reason?: string
  input?: Record<string, unknown>
}

export interface HealingToolEvent {
  id: string
  name: string
  description: string
  icon: string
  status: 'running' | 'done'
}
