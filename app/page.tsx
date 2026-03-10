"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import "./chat.css"

type Role = "user" | "assistant"
type Message = {
  role: Role
  content: string
}

// ── Syntax highlight ──────────────────────────────────────────────────────────
const TOKEN_PATTERNS: Array<{ regex: RegExp; className: string }> = [
  { regex: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, className: "tok-string" },
  {
    regex:
      /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|typeof|instanceof|void|null|undefined|true|false|this|super|extends|implements|interface|type|enum|in|of|do|switch|case|break|continue|yield|static|public|private|protected|readonly|abstract|override|declare|namespace|module|require)\b/g,
    className: "tok-keyword",
  },
  { regex: /\b([A-Z][A-Za-z0-9_]*)\b/g, className: "tok-class" },
  { regex: /\b(\d+\.?\d*)\b/g, className: "tok-number" },
  { regex: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g, className: "tok-comment" },
  { regex: /\b([a-z_][a-z0-9_]*)(?=\s*\()/gi, className: "tok-function" },
]

function syntaxHighlight(code: string): string {
  const placeholder = "\x00PH\x00"
  const store: string[] = []

  let result = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  result = result.replace(TOKEN_PATTERNS[0].regex, (m) => {
    store.push(`<span class="${TOKEN_PATTERNS[0].className}">${m}</span>`)
    return `${placeholder}${store.length - 1}${placeholder}`
  })

  result = result.replace(TOKEN_PATTERNS[5].regex, (m) => {
    store.push(`<span class="${TOKEN_PATTERNS[5].className}">${m}</span>`)
    return `${placeholder}${store.length - 1}${placeholder}`
  })

  for (let i = 1; i <= 4; i++) {
    const { regex, className } = TOKEN_PATTERNS[i]
    result = result.replace(regex, (m) => {
      if (m.includes(placeholder)) return m
      return `<span class="${className}">${m}</span>`
    })
  }

  result = result.replace(
    new RegExp(`${placeholder}(\\d+)${placeholder}`, "g"),
    (_, idx) => store[+idx]
  )

  return result
}

// ── Message parser ────────────────────────────────────────────────────────────
type Segment =
  | { type: "text"; content: string }
  | { type: "code"; language: string; content: string }

function parseMessage(raw: string): Segment[] {
  const segments: Segment[] = []
  const regex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex)
      segments.push({ type: "text", content: raw.slice(lastIndex, match.index) })
    segments.push({ type: "code", language: match[1] || "plaintext", content: match[2].trimEnd() })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < raw.length)
    segments.push({ type: "text", content: raw.slice(lastIndex) })

  return segments
}

// ── Inline text renderer ──────────────────────────────────────────────────────
function renderInlineText(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="inline-code">{part.slice(1, -1)}</code>
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>
    return <span key={i}>{part}</span>
  })
}

// ── Code Block ────────────────────────────────────────────────────────────────
function CodeBlock({ language, content }: { language: string; content: string }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [content])

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-lang">{language || "code"}</span>
        <button className={`copy-btn${copied ? " copied" : ""}`} onClick={copy}>
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20,6 9,17 4,12" />
              </svg>
              Copiado!
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copiar
            </>
          )}
        </button>
      </div>
      <pre className="code-body">
        <code dangerouslySetInnerHTML={{ __html: syntaxHighlight(content) }} />
      </pre>
    </div>
  )
}

// ── Message content renderer ──────────────────────────────────────────────────
function MessageContent({ content }: { content: string }) {
  const segments = parseMessage(content)
  return (
    <div className="msg-content">
      {segments.map((seg, i) =>
        seg.type === "code" ? (
          <CodeBlock key={i} language={seg.language} content={seg.content} />
        ) : (
          <div key={i} className="msg-text">
            {seg.content.split("\n").map((line, j) => (
              <p key={j}>{renderInlineText(line)}</p>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="typing-dots">
      <span />
      <span />
      <span />
    </div>
  )
}

// ── Main Chat Component ───────────────────────────────────────────────────────
export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState<string>("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        setModels(data)
        if (data.length > 0) setModel(data[0])
      })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px"
  }, [input])

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!input.trim() || loading) return

    const userMsg: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg.content, model }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro ao gerar resposta." },
      ])
    }

    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-root">
      <header className="chat-header">
        <div className="header-brand">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="8.5" x2="22" y2="8.5" />
              <line x1="2" y1="15.5" x2="22" y2="15.5" />
            </svg>
          </div>
          <span className="brand-name">jAI.me</span>
        </div>
        <select
          className="model-select"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </header>

      <main className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">⬡</div>
            <p>Pronto para codificar. Pergunte qualquer coisa.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg-row ${m.role}`}>
            <div className={`msg-bubble ${m.role}`}>
              {m.role === "assistant" ? (
                <MessageContent content={m.content} />
              ) : (
                <span>{m.content}</span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="msg-row assistant">
            <div className="msg-bubble assistant">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="chat-footer">
        <form className="input-form" onSubmit={sendMessage}>
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte algo… (Enter para enviar, Shift+Enter para nova linha)"
              rows={1}
            />
            <button
              className={`send-btn${loading || !input.trim() ? " disabled" : ""}`}
              type="submit"
              disabled={loading || !input.trim()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22,2 15,22 11,13 2,9" />
              </svg>
            </button>
          </div>
          <p className="input-hint">Enter para enviar · Shift+Enter nova linha</p>
        </form>
      </footer>
    </div>
  )
}
