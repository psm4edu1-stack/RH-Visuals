import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import type { ChatMessage } from '../../types'
import { ApiError, api } from '../../lib/api'
import { uid } from '../../lib/utils'

const quickPrompts = [
  'What services do you offer?',
  'What does a project cost?',
  'Are you available for my date?',
]

type ChatMode = 'ai' | 'rules'

export function StudioChatbot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [mode, setMode] = useState<ChatMode>('rules')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello — I’m the RH VISUALS studio guide. I can help with services, selected work, process, availability or the right way to send a brief.\n\nWhat are you planning?',
      at: new Date().toISOString(),
    },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sendingRef = useRef(false)

  useEffect(() => {
    let active = true
    api.public
      .chatStatus()
      .then((result) => {
        if (active) setMode(result.mode)
      })
      .catch(() => {
        if (active) setMode('rules')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const focusTimeout = window.setTimeout(() => inputRef.current?.focus(), 250)
    return () => window.clearTimeout(focusTimeout)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, typing, open])

  const send = async (raw?: string) => {
    const value = (raw ?? input).trim()
    if (!value || sendingRef.current) return

    const history = messages
      .filter((message) => message.id !== 'welcome')
      .map((message) => ({ role: message.role, content: message.content }))

    sendingRef.current = true
    setInput('')
    setMessages((current) => [
      ...current,
      { id: uid('msg'), role: 'user', content: value, at: new Date().toISOString() },
    ])
    setTyping(true)
    try {
      const result = await api.public.chat(value, history)
      setMode(result.mode)
      setMessages((current) => [
        ...current,
        {
          id: uid('msg'),
          role: 'assistant',
          content: result.reply,
          at: new Date().toISOString(),
        },
      ])
    } catch (error) {
      console.warn('Studio guide request failed.', error)
      let content =
        'I can’t reach the studio guide service right now. Your brief will still reach the team through the contact form, or you can email hello@rhvisuals.studio.'
      if (error instanceof ApiError) {
        if (error.status === 408) {
          content =
            'The studio guide took too long to respond. Please try again, or send your brief through the contact form so a producer can reply directly.'
        } else if (error.status === 429) {
          content =
            'The studio guide is receiving a lot of messages right now. Please try again shortly, or send your brief through the contact form.'
        } else if (error.status === 0) {
          content =
            'I can’t reach the studio guide service right now. Please check your connection, or send your brief through the contact form and a producer will reply.'
        } else if (error.message) {
          content = `${error.message} You can also send your brief through the contact form.`
        }
      }
      setMessages((current) => [
        ...current,
        {
          id: uid('msg'),
          role: 'assistant',
          content,
          at: new Date().toISOString(),
        },
      ])
    } finally {
      sendingRef.current = false
      setTyping(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`chat-launcher ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? 'Close studio chat' : 'Chat with the studio'}
        aria-expanded={open}
        aria-controls="studio-chat-panel"
      >
        {open ? <X size={21} /> : <MessageCircle size={21} strokeWidth={1.8} />}
        {!open && <span className="chat-launcher__pulse" aria-hidden="true" />}
      </button>

      <aside
        id="studio-chat-panel"
        className={`chat-panel ${open ? 'is-open' : ''}`}
        aria-hidden={!open}
        aria-busy={typing}
        role="dialog"
        aria-label="Studio guide"
      >
        <header className="chat-panel__header">
          <span className="chat-panel__mark">
            <img src="/rh-visuals-mark.svg" alt="" />
          </span>
          <div>
            <div className="chat-panel__title">
              Studio guide <span>{mode === 'ai' ? 'AI' : 'Guide'}</span>
            </div>
            <p>
              <span className="chat-panel__online" />
              {mode === 'ai' ? 'AI-assisted · replies instantly' : 'Rule-based · verified studio info'}
            </p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close chat">
            <X size={18} />
          </button>
        </header>

        <div className="chat-panel__messages" ref={scrollRef} aria-live="polite">
          <div className="chat-panel__intro">
            <Sparkles size={14} />
            <span>Built to help you find the right start</span>
          </div>
          {messages.map((message) => (
            <div
              className={`chat-message chat-message--${message.role}`}
              key={message.id}
            >
              {message.role === 'assistant' && (
                <span className="chat-message__avatar">RH</span>
              )}
              <div className="chat-message__bubble">{message.content}</div>
            </div>
          ))}
          {typing && (
            <div className="chat-message chat-message--assistant">
              <span className="chat-message__avatar">RH</span>
              <div className="chat-typing" role="status">
                <i />
                <i />
                <i />
                <span className="sr-only">The studio guide is replying</span>
              </div>
            </div>
          )}
          {messages.length <= 1 && !typing && (
            <div className="chat-suggestions">
              {quickPrompts.map((prompt) => (
                <button type="button" key={prompt} onClick={() => void send(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="chat-panel__composer">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void send()
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about your event…"
              aria-label="Message the studio guide"
              maxLength={500}
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || typing}
            >
              <Send size={17} />
            </button>
          </form>
          <Link to="/#contact" className="chat-panel__cta" onClick={() => setOpen(false)}>
            Share your brief with a producer <ArrowUpRight size={13} />
          </Link>
        </div>
      </aside>
    </>
  )
}
