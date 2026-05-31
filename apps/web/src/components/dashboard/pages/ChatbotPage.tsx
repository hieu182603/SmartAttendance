import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChatbot } from '../../../context/ChatbotContext'
import { useAuth } from '../../../context/AuthContext'
import { useTranslation } from 'react-i18next'

// ── Role-based suggestion chips ──────────────────────────────────────────────
type IconKey = 'clock' | 'calendar' | 'users' | 'dollar' | 'check' | 'trend'
interface Chip { icon: IconKey; text: string }

const ROLE_CHIPS: Record<string, Chip[]> = {
  EMPLOYEE: [
    { icon: 'clock',    text: 'Hôm nay tôi đã chấm công chưa?' },
    { icon: 'calendar', text: 'Tôi còn bao nhiêu ngày phép?' },
    { icon: 'check',    text: 'Đơn nào của tôi đang chờ duyệt?' },
    { icon: 'dollar',   text: 'Phiếu lương tháng này của tôi' },
  ],
  MANAGER: [
    { icon: 'users',    text: 'Có bao nhiêu nhân viên đang làm?' },
    { icon: 'clock',    text: 'Ai đi muộn hôm nay?' },
    { icon: 'check',    text: 'Đơn nào đang chờ duyệt?' },
    { icon: 'trend',    text: 'Ai đi muộn nhiều nhất tháng?' },
  ],
  HR_MANAGER: [
    { icon: 'users',    text: 'Danh sách nhân viên thử việc' },
    { icon: 'check',    text: 'Tổng đơn nghỉ phép chờ duyệt' },
    { icon: 'calendar', text: 'Nhân viên sắp hết phép năm' },
    { icon: 'dollar',   text: 'Tổng quỹ lương tháng này' },
  ],
  ADMIN: [
    { icon: 'users',  text: 'Tổng nhân sự toàn hệ thống' },
    { icon: 'dollar', text: 'Tổng quỹ lương tháng này' },
    { icon: 'clock',  text: 'Thống kê đi muộn theo chi nhánh' },
    { icon: 'trend',  text: 'Báo cáo chấm công tuần này' },
  ],
  SUPER_ADMIN: [
    { icon: 'users',  text: 'Tổng nhân sự toàn hệ thống' },
    { icon: 'dollar', text: 'Tổng quỹ lương tháng này' },
    { icon: 'clock',  text: 'Thống kê đi muộn theo chi nhánh' },
    { icon: 'trend',  text: 'Báo cáo chấm công tuần này' },
  ],
}

// ── SVG icon paths ────────────────────────────────────────────────────────────
function ChipIcon({ name }: { name: IconKey }) {
  return (
    <svg viewBox="0 0 24 24" stroke="#22d3ee" strokeWidth="2" fill="none" width="16" height="16">
      {name === 'clock'    && <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
      {name === 'calendar' && <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>}
      {name === 'users'    && <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></>}
      {name === 'dollar'   && <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>}
      {name === 'check'    && <polyline points="20 6 9 17 4 12"/>}
      {name === 'trend'    && <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>}
    </svg>
  )
}

function BotSvg() {
  return (
    <svg viewBox="0 0 24 24" stroke="#22d3ee" strokeWidth="2" fill="none" width="20" height="20"
      style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.45))' }}>
      <rect x="3" y="6" width="18" height="14" rx="3"/>
      <circle cx="9" cy="13" r="1.2" fill="#22d3ee"/>
      <circle cx="15" cy="13" r="1.2" fill="#22d3ee"/>
      <path d="M12 6V3M9 3h6"/>
    </svg>
  )
}

// ── Conversation grouping ─────────────────────────────────────────────────────
function groupConvs<T extends { lastActivity: string }>(list: T[]) {
  const now = Date.now()
  const out = { today: [] as T[], yesterday: [] as T[], week: [] as T[] }
  for (const c of list) {
    const h = (now - new Date(c.lastActivity).getTime()) / 3_600_000
    if (h < 24)       out.today.push(c)
    else if (h < 48)  out.yesterday.push(c)
    else              out.week.push(c)
  }
  return out
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const h = (Date.now() - d.getTime()) / 3_600_000
  if (h < 24)  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  if (h < 168) return d.toLocaleDateString('vi-VN', { weekday: 'short' })
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

// ── Shared style constants ────────────────────────────────────────────────────
const CYAN_GLOW = 'rgba(34,211,238,0.45)'

// ── Component ─────────────────────────────────────────────────────────────────
const ChatbotPage: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    isLoadingConversations,
    loadConversation,
    createNewConversation,
    sendChatMessage,
    deleteChatConversation,
  } = useChatbot()

  const [sidebarOpen,     setSidebarOpen]     = useState(false)
  const [inputValue,      setInputValue]      = useState('')
  const [searchQuery,     setSearchQuery]     = useState('')
  const [showSlash,       setShowSlash]       = useState(false)
  const [composerFocused, setComposerFocused] = useState(false)

  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const chips = ROLE_CHIPS[user?.role ?? ''] ?? ROLE_CHIPS.EMPLOYEE

  // Slash suggestions: role chips filtered by keyword after "/"
  const slashKw = inputValue.startsWith('/') ? inputValue.slice(1).toLowerCase() : ''
  const slashItems = chips.filter(c => !slashKw || c.text.toLowerCase().includes(slashKw))

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Auto-resize textarea
  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    autoResize()
    setShowSlash(e.target.value.trimStart().startsWith('/'))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') { setShowSlash(false); return }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (showSlash && slashItems.length > 0) { pickSlash(slashItems[0].text); return }
      void doSend()
    }
  }

  const doSend = async () => {
    const text = inputValue.trim()
    if (!text || isLoading) return
    setInputValue('')
    setShowSlash(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    await sendChatMessage(text)
    textareaRef.current?.focus()
  }

  const pickSlash = (text: string) => {
    setInputValue(text)
    setShowSlash(false)
    textareaRef.current?.focus()
  }

  const copyMsg = (content: string) => navigator.clipboard?.writeText(content).catch(() => {})

  const filtered = searchQuery.trim()
    ? conversations.filter(c => (c.preview ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations

  const grouped = groupConvs(filtered)
  const groupLabels = {
    today: t('dashboard:chatbotPage.groups.today'),
    yesterday: t('dashboard:chatbotPage.groups.yesterday'),
    week: t('dashboard:chatbotPage.groups.week'),
  } as const

  const initials = user?.name
    ? user.name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'
  const displayName =
    user?.name?.trim() ||
    user?.email?.split('@')[0] ||
    t('dashboard:chatbotPage.defaultUserName')
  const newConversationLabel = t('dashboard:chatbotPage.newConversation')
  const latestUserQuestion = [...messages].reverse().find(msg => msg.role === 'user')?.content

  // Overlay layout: sidebar floats above chat content
  const gridStyle: React.CSSProperties = {
    display: 'block',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    background: 'var(--background)',
    borderRadius: '0',
    position: 'relative',
  }

  return (
    <div style={gridStyle}>
      {sidebarOpen && (
        <button
          type="button"
          aria-label={t('dashboard:chatbotPage.aria.closeConversationList')}
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 z-20 bg-black/35 backdrop-blur-[1px]"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col overflow-hidden"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          bottom: 16,
          width: 300,
          zIndex: 30,
          background: 'rgba(30,41,59,0.4)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '20px',
          boxShadow: `0 8px 32px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-120%)',
          opacity: sidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen ? 'auto' : 'none',
          transition: 'transform 0.3s cubic-bezier(0.2,0.8,0.2,1), opacity 0.3s',
        }}
      >
        {/* Header */}
        <div className="flex flex-col gap-3.5 px-5 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={() => { createNewConversation(); setSidebarOpen(false) }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13.5px] font-semibold text-slate-100 cursor-pointer transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.background = 'rgba(34,211,238,0.1)'
              el.style.borderColor = 'rgba(34,211,238,0.3)'
              el.style.color = '#22d3ee'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.background = 'rgba(255,255,255,0.03)'
              el.style.borderColor = 'rgba(255,255,255,0.05)'
              el.style.color = '#f1f5f9'
            }}
          >
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" width="16" height="16">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            {newConversationLabel}
          </button>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              viewBox="0 0 24 24" stroke="#64748b" strokeWidth="2" fill="none" width="14" height="14">
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder={t('dashboard:chatbotPage.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-[10px] py-2 pr-3 pl-9 text-[13px] text-slate-100 placeholder-slate-500 outline-none transition-all duration-200"
              style={{
                background: 'rgba(15,23,42,0.4)',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(34,211,238,0.4)'
                e.currentTarget.style.background = 'rgba(15,23,42,0.6)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.background = 'rgba(15,23,42,0.4)'
              }}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-4 py-3"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {isLoadingConversations ? (
            <div className="flex items-center justify-center p-6">
              <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-cyan-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-500 text-xs py-8">
              {t('dashboard:chatbotPage.emptyConversations')}
            </p>
          ) : (
            (Object.entries(grouped) as [keyof typeof grouped, (typeof filtered)[number][]][]).map(([key, items]) => {
              if (!items.length) return null
              return (
                <div key={key} className="mb-4">
                  <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-slate-500 px-2 pb-2 pt-1">
                    {groupLabels[key]}
                  </div>
                  {items.map(conv => (
                    <div key={conv.id}
                      className="group relative flex flex-col gap-1 px-3.5 py-2.5 rounded-xl cursor-pointer mt-1 border transition-all duration-200"
                      style={{
                        background: currentConversation?.id === conv.id ? 'rgba(34,211,238,0.06)' : 'transparent',
                        borderColor: currentConversation?.id === conv.id ? 'rgba(34,211,238,0.15)' : 'transparent',
                      }}
                      onClick={() => { loadConversation(conv); if (window.innerWidth < 900) setSidebarOpen(false) }}
                      onMouseEnter={e => {
                        if (currentConversation?.id !== conv.id)
                          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'
                      }}
                      onMouseLeave={e => {
                        if (currentConversation?.id !== conv.id)
                          (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                      }}
                    >
                      <div
                        className="text-[13px] font-semibold truncate pr-6"
                        style={{ color: currentConversation?.id === conv.id ? '#22d3ee' : '#f1f5f9' }}
                      >
                        {conv.preview || newConversationLabel}
                      </div>
                      <div className="text-[11.5px] truncate text-slate-500">{conv.preview ?? ''}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5" style={{ fontFamily: 'monospace' }}>
                        {fmtTime(conv.lastActivity)}
                      </div>
                      {/* Delete button */}
                      <button
                        className="absolute right-2.5 top-3 opacity-0 group-hover:opacity-100 w-6 h-6 grid place-items-center rounded-md transition-all duration-200"
                        style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.05)' }}
                        onClick={e => { e.stopPropagation(); deleteChatConversation(conv.id) }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
                          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(15,23,42,0.8)'
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                        }}
                      >
                        <svg viewBox="0 0 24 24" stroke="#64748b" strokeWidth="2" fill="none" width="12" height="12">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Main chat area ───────────────────────────────────────────────── */}
      <section
        className="flex h-full flex-col min-h-0 overflow-hidden"
        style={{
          position: 'relative',
          zIndex: 10,
          background: 'var(--background)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid var(--border)',
          borderRadius: '0',
          boxShadow: 'none',
          transition: 'none',
        }}
      >
        {/* Chat header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 flex-shrink-0"
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {/* Toggle sidebar button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-9 h-9 grid place-items-center rounded-[10px] flex-shrink-0 transition-all duration-200 text-[var(--text-sub)]"
              style={{ border: '1px solid var(--border)' }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#22d3ee'
                e.currentTarget.style.background = 'var(--shell)'
                e.currentTarget.style.borderColor = 'rgba(34,211,238,0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-sub)'
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
              title={t('dashboard:chatbotPage.actions.toggleSidebar')}
            >
              <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" width="14" height="14">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="text-[16px] font-semibold text-[var(--text-main)] truncate">
              {latestUserQuestion ?? currentConversation?.preview ?? newConversationLabel}
            </div>
          </div>
          {currentConversation && (
            <button
              onClick={() => deleteChatConversation(currentConversation.id)}
              className="w-9 h-9 grid place-items-center rounded-[10px] text-[var(--text-sub)] transition-all duration-200"
              style={{ border: '1px solid transparent' }}
              title={t('dashboard:chatbotPage.actions.deleteConversation')}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
                e.currentTarget.style.color = '#ef4444'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.color = 'var(--text-sub)'
              }}
            >
              <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" width="14" height="14">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>
              </svg>
            </button>
          )}
        </div>

        {/* Messages area */}
        <div
          className="flex-1 min-h-0 overflow-y-scroll px-8 py-8"
          style={{ scrollBehavior: 'smooth', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
        >
          <AnimatePresence mode="wait">
            {messages.length === 0 ? (
              /* Welcome state */
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                className="min-h-full flex items-center justify-center p-10"
              >
                <div className="max-w-[680px] text-center w-full">
                  {/* Logo */}
                  <div className="w-24 h-24 mx-auto mb-8 rounded-2xl grid place-items-center relative"
                    style={{
                      background: 'linear-gradient(135deg, #22d3ee, #22c55e)',
                      boxShadow: `0 0 0 1px rgba(34,211,238,0.4), 0 16px 48px -12px ${CYAN_GLOW}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                    }}>
                    {/* Glow halo */}
                    <div className="absolute -inset-3 rounded-[36px] -z-10 animate-pulse"
                      style={{ background: 'linear-gradient(135deg,#22d3ee,#22c55e)', filter: 'blur(24px)', opacity: 0.35 }} />
                    <img src="/ai-brain.png" alt="AI" className="w-16 h-16 object-contain"
                      style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }} />
                  </div>

                  <h1
                    className="text-[38px] font-bold tracking-tight mb-3 leading-tight text-[var(--text-main)]"
                  >
                    {t('dashboard:chatbotPage.greeting')}, {displayName}
                  </h1>

                  <p className="text-[15px] text-[var(--text-sub)] mb-12 max-w-[520px] mx-auto leading-relaxed">
                    {t('dashboard:chatbotPage.description')}
                  </p>

                </div>
              </motion.div>
            ) : (
              /* Messages */
              <div key="msgs" className="max-w-[860px] mx-auto w-full flex flex-col gap-8">
                {messages.map((msg, i) => {
                  const isUser = msg.role === 'user'
                  const time = msg.timestamp
                    ? new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    : ''
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                      className="flex gap-4 items-start group"
                    >
                      {/* Avatar */}
                      {isUser ? (
                        <div className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0 text-[14px] font-bold"
                          style={{
                            background: 'linear-gradient(135deg,#22d3ee,#22c55e)',
                            color: '#042f2e',
                            boxShadow: `0 0 0 1px rgba(34,211,238,0.2), 0 8px 16px -4px ${CYAN_GLOW}`,
                          }}>
                          {initials}
                        </div>
                      ) : (
                        /* Bot avatar with conic-gradient ring */
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 relative"
                          style={{ border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', background: 'rgba(30,41,59,0.8)' }}>
                          {/* Spinning ring */}
                          <div className="absolute animate-spin"
                            style={{
                              inset: '-50%',
                              background: `conic-gradient(from 0deg, transparent, ${CYAN_GLOW}, transparent 30%)`,
                              animationDuration: '3s',
                              animationTimingFunction: 'linear',
                            }} />
                          {/* Dark overlay */}
                          <div className="absolute inset-[1px] rounded-[11px]" style={{ background: 'rgba(30,41,59,0.9)' }} />
                          {/* Icon */}
                          <div className="absolute inset-0 z-10 grid place-items-center"><BotSvg /></div>
                        </div>
                      )}

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="text-[14px] font-bold text-[var(--text-main)]">
                            {isUser
                              ? t('dashboard:chatbotPage.userLabel')
                              : t('dashboard:chatbotPage.assistantLabel')}
                          </span>
                          {time && <span className="text-[11px] text-[var(--text-sub)]" style={{ fontFamily: 'monospace' }}>{time}</span>}
                        </div>

                        {isUser ? (
                          <div className="text-[14.5px] leading-[1.7] text-[var(--text-main)] inline-block max-w-[90%]"
                            style={{
                              background: 'linear-gradient(135deg,rgba(34,211,238,0.1),rgba(34,197,94,0.05))',
                              border: '1px solid rgba(34,211,238,0.2)',
                              borderRadius: '16px 16px 16px 4px',
                              padding: '14px 20px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                            }}>
                            {msg.content}
                          </div>
                        ) : (
                          <div className="text-[14.5px] leading-[1.7] text-[var(--text-main)] prose-chatbot">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                strong: ({ children }) => <strong style={{ color: '#22d3ee', fontWeight: 600 }}>{children}</strong>,
                                code: ({ children, className }) => {
                                  const isBlock = className?.includes('language-')
                                  return isBlock
                                    ? <code style={{ display: 'block', fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', color: '#f59e0b', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>{children}</code>
                                    : <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '6px', fontSize: '12.5px', color: '#f59e0b', border: '1px solid rgba(255,255,255,0.05)' }}>{children}</code>
                                },
                                table: ({ children }) => (
                                  <div style={{ overflowX: 'auto', marginTop: '16px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '13.5px', background: 'rgba(15,23,42,0.3)', overflow: 'hidden' }}>{children}</table>
                                  </div>
                                ),
                                th: ({ children }) => <th style={{ padding: '12px 16px', textAlign: 'left', background: 'rgba(30,41,59,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{children}</th>,
                                td: ({ children }) => <td style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-main)', borderBottom: '1px solid var(--border)' }}>{children}</td>,
                                ul: ({ children }) => <ul style={{ margin: '8px 0', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>{children}</ul>,
                                ol: ({ children }) => <ol style={{ margin: '8px 0', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>{children}</ol>,
                                p: ({ children }) => <p style={{ margin: '0 0 10px' }}>{children}</p>,
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}

                        {/* Actions (bot only, show on group hover) */}
                        {!isUser && (
                          <div className="flex gap-1.5 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            {[
                              { title: t('dashboard:chatbotPage.actions.copy'), onClick: () => copyMsg(msg.content), path: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></> },
                              { title: t('dashboard:chatbotPage.actions.helpful'),  onClick: () => {}, path: <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/> },
                              { title: t('dashboard:chatbotPage.actions.notHelpful'), onClick: () => {}, path: <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z"/> },
                            ].map((btn, bi) => (
                              <button key={bi} title={btn.title} onClick={btn.onClick}
                                className="w-[30px] h-[30px] rounded-lg grid place-items-center text-slate-500 transition-all duration-200"
                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid transparent' }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = 'rgba(34,211,238,0.08)'
                                  e.currentTarget.style.borderColor = 'rgba(34,211,238,0.2)'
                                  e.currentTarget.style.color = '#22d3ee'
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                                  e.currentTarget.style.borderColor = 'transparent'
                                  e.currentTarget.style.color = '#64748b'
                                }}
                              >
                                <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" width="14" height="14">
                                  {btn.path}
                                </svg>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}

                {/* Typing indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 items-start"
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 relative"
                      style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,41,59,0.8)' }}>
                      <div className="absolute animate-spin"
                        style={{ inset: '-50%', background: `conic-gradient(from 0deg, transparent, ${CYAN_GLOW}, transparent 30%)`, animationDuration: '3s', animationTimingFunction: 'linear' }} />
                      <div className="absolute inset-[1px] rounded-[11px]" style={{ background: 'rgba(30,41,59,0.9)' }} />
                      <div className="absolute inset-0 z-10 grid place-items-center"><BotSvg /></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-[14px] font-bold text-[var(--text-main)]">SmartAttendance AI</span>
                        <span className="text-[11px] text-[var(--text-sub)]">
                          {t('dashboard:chatbotPage.typing')}
                        </span>
                      </div>
                      <div className="flex gap-1.5 py-2.5">
                        {[0, 150, 300].map(delay => (
                          <span key={delay} className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                            style={{ animationDelay: `${delay}ms`, boxShadow: `0 0 8px ${CYAN_GLOW}` }} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Composer ─────────────────────────────────────────────────── */}
        <div className="shrink-0 px-8 pb-10 pt-4 relative z-20 overflow-visible"
          style={{ background: 'var(--surface)' }}>
          <div className="max-w-[860px] mx-auto w-full overflow-visible">
            {/* Composer box */}
            <div
              className="relative rounded-[20px] transition-all duration-300 overflow-visible"
              onFocus={() => setComposerFocused(true)}
              onBlur={() => setComposerFocused(false)}
              style={{
                background: composerFocused ? 'var(--shell)' : 'var(--surface)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: composerFocused ? '1px solid rgba(34,211,238,0.5)' : '1px solid var(--border)',
                boxShadow: composerFocused
                  ? `0 0 0 4px rgba(34,211,238,0.1), 0 12px 48px -8px ${CYAN_GLOW}, inset 0 1px 0 rgba(255,255,255,0.1)`
                  : '0 8px 24px -12px rgba(0,0,0,0.15)',
                transform: composerFocused ? 'translateY(-2px)' : 'translateY(0)',
              }}
            >
              {/* Slash suggestions panel */}
              <AnimatePresence>
                {showSlash && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute left-4 right-4 rounded-2xl z-50 max-h-[min(280px,50vh)] overflow-y-auto"
                    style={{
                      bottom: 'calc(100% + 10px)',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 16px 30px -18px rgba(0,0,0,0.2)',
                    }}
                  >
                    {slashItems.length === 0 ? (
                      <p className="px-3.5 py-3 text-[13px] text-[var(--text-sub)]">
                        {t('dashboard:chatbotPage.noSuggestions')}
                      </p>
                    ) : (
                      slashItems.map((s, i) => (
                        <button key={i} className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left text-[var(--text-main)] transition-colors duration-150 border-b border-[var(--border)] last:border-b-0"
                          style={{ background: 'transparent' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,211,238,0.1)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                          onClick={() => pickSlash(s.text)}
                        >
                          <span className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <ChipIcon name={s.icon} />
                          </span>
                          <span className="text-[13.5px]">{s.text}</span>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={t('dashboard:chatbotPage.composerPlaceholder')}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="w-full bg-transparent border-0 outline-none resize-none text-[15px] leading-[1.5] text-[var(--text-main)] placeholder-[var(--text-sub)] disabled:opacity-60"
                style={{
                  minHeight: '58px',
                  maxHeight: '200px',
                  padding: '18px 56px 18px 24px',
                  overflowY: 'auto',
                }}
              />

              {/* Send */}
              <div className="absolute right-3 bottom-3 flex gap-2 items-center">
                <button
                  onClick={() => void doSend()}
                  disabled={!inputValue.trim() || isLoading}
                  className="w-10 h-10 rounded-xl grid place-items-center transition-all duration-200 disabled:cursor-not-allowed"
                  style={{
                    background: (!inputValue.trim() || isLoading) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#22d3ee,#22c55e)',
                    color: (!inputValue.trim() || isLoading) ? 'var(--text-sub)' : '#042f2e',
                    boxShadow: (!inputValue.trim() || isLoading) ? 'none' : `0 4px 16px -4px ${CYAN_GLOW}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                  }}
                  onMouseEnter={e => {
                    if (inputValue.trim() && !isLoading) {
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'
                      e.currentTarget.style.boxShadow = `0 8px 24px -4px ${CYAN_GLOW}`
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = ''
                    if (inputValue.trim() && !isLoading)
                      e.currentTarget.style.boxShadow = `0 4px 16px -4px ${CYAN_GLOW}, inset 0 1px 0 rgba(255,255,255,0.3)`
                  }}
                >
                  {isLoading
                    ? <div className="w-4 h-4 rounded-full border-2 border-slate-500 border-t-cyan-400 animate-spin" />
                    : <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  }
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}

export default ChatbotPage
