export type ChatMode = 'comfort' | 'therapist' | 'companion'

export interface ChatMessage {
  id: number
  type: 'user' | 'bot'
  text: string
  richText?: string
}

export interface RagHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface VoiceAsrResult {
  success: boolean
  source?: 'vivo'
  text?: string
  requestId?: string
  sid?: string
  message?: string
}
