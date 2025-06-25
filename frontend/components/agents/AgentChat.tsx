'use client'

import { useMutation } from '@tanstack/react-query'
import { Send, X, Bot, User, Loader2, Wifi, WifiOff } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'

import { apiClient } from '@/lib/api/client'
import {
  useWebSocket,
  type LegacyWebSocketMessage as WebSocketMessage,
} from '@/lib/hooks/useWebSocketNew'

interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: Date
  agentName?: string
  status?: 'sending' | 'sent' | 'error'
}

interface AgentChatProps {
  agent: {
    id: string
    name: string
    agent_type: string
    department: string
  }
  isOpen: boolean
  onClose: () => void
}

export default function AgentChat({ agent, isOpen, onClose }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'agent',
      content: `Hello! I'm ${agent.name}, your ${agent.agent_type} for ${agent.department}. How can I assist you today?`,
      timestamp: new Date(),
      agentName: agent.name,
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatSessionId = useRef<string>(`chat-${agent.id}-${Date.now()}`)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  // Handle incoming chat messages via WebSocket
  const handleChatMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type === 'chat_message' && message.data) {
        const { session_id, sender_id, content, timestamp } = message.data

        // Only process messages for this chat session
        if (session_id === chatSessionId.current && sender_id === agent.id) {
          setMessages((prev) => [
            ...prev,
            {
              id: `ws-${Date.now()}`,
              role: 'agent',
              content: content,
              timestamp: new Date(timestamp || Date.now()),
              agentName: agent.name,
              status: 'sent',
            },
          ])
          setIsTyping(false)
        }
      } else if (message.type === 'agent_status' && message.data) {
        // Handle typing indicators
        if (message.data.agent_id === agent.id && message.data.status === 'typing') {
          setIsTyping(true)
        }
      }
    },
    [agent.id, agent.name]
  )

  // WebSocket connection for real-time chat
  const {
    isConnected,
    connectionState,
    sendMessage: sendWebSocketMessage,
    registerHandler,
    subscribeToChannel,
  } = useWebSocket({
    channels: [`chat-${agent.id}`, `agent-${agent.id}`],
    onConnect: () => {
      // Connected to chat for agent
    },
  })

  // Register chat message handler
  useEffect(() => {
    const unregister = registerHandler(handleChatMessage, 'chat_message')
    return unregister
  }, [registerHandler, handleChatMessage])

  // Fallback HTTP chat mutation
  const sendMessageHttp = useMutation({
    mutationFn: async (message: string) => {
      return apiClient.chatWithAgent(agent.agent_type, message)
    },
    onSuccess: (response) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'agent',
          content: response.message,
          timestamp: new Date(),
          agentName: agent.name,
          status: 'sent',
        },
      ])
      setIsTyping(false)
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'agent',
          content:
            "I apologize, but I'm experiencing some technical difficulties. Please try again later.",
          timestamp: new Date(),
          agentName: agent.name,
          status: 'error',
        },
      ])
      setIsTyping(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sendMessageHttp.isPending) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      status: 'sending',
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Try WebSocket first, fallback to HTTP
    if (isConnected) {
      sendWebSocketMessage({
        type: 'chat_message',
        channel: `chat-${agent.id}`,
        data: {
          session_id: chatSessionId.current,
          sender_id: 'user',
          recipient_id: agent.id,
          agent_type: agent.agent_type,
          content: input,
          timestamp: new Date().toISOString(),
        },
      })

      // Update message status
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg))
        )
      }, 100)
    } else {
      // Fallback to HTTP
      sendMessageHttp.mutate(input)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <Bot className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {agent.agent_type} • {agent.department}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Connection status */}
            <div
              className={`flex items-center space-x-1 text-xs ${
                isConnected
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span>Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[80%] ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : 'bg-primary-50 dark:bg-primary-900/20'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  )}
                </div>
                <div>
                  {message.role === 'agent' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {message.agentName}
                    </p>
                  )}
                  <div
                    className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    } ${message.status === 'sending' ? 'opacity-70' : ''}`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {message.status === 'error' && (
                      <span className="text-xs text-red-500 dark:text-red-400">Failed to send</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(sendMessageHttp.isPending || isTyping) && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2 max-w-[80%]">
                <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                  <Bot className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{agent.name}</p>
                  <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${agent.name} anything...`}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={sendMessageHttp.isPending}
            />
            <button
              type="submit"
              disabled={!input.trim() || sendMessageHttp.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
