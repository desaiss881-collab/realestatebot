'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Lead = {
  id: string
  customer_phone: string
  stage: string
  conversation_state: string
  search_preferences: Record<string, unknown>
  collected_data: Record<string, unknown>
  last_interaction: string
}

type Property = {
  id: string
  title: string
  intent: string
  area: string
  price: number
  size_sqft: number
  status: string
}

type ChatMessage = {
  id: string
  direction: 'in' | 'out'
  body: string
  created_at: string
}

const STAGE_CONFIG = {
  all:       { label: 'All',       color: 'bg-gray-100 text-gray-700',          dot: 'bg-gray-400'     },
  new:       { label: 'New',       color: 'bg-sky-100 text-sky-700',            dot: 'bg-sky-500'      },
  contacted: { label: 'Contacted', color: 'bg-amber-100 text-amber-700',        dot: 'bg-amber-500'    },
  qualified: { label: 'Qualified', color: 'bg-emerald-100 text-emerald-700',    dot: 'bg-emerald-500'  },
  closed:    { label: 'Closed',    color: 'bg-gray-100 text-gray-500',          dot: 'bg-gray-400'     },
} as const

type StageFilter = keyof typeof STAGE_CONFIG

function stagePill(stage: string) {
  const cfg = STAGE_CONFIG[stage as StageFilter] ?? STAGE_CONFIG.new
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function exportToCSV(leads: Lead[]) {
  const headers = ['Phone', 'Name', 'Intent', 'Area', 'Budget', 'Stage', 'Conversation State', 'Last Interaction', 'Notes']
  const rows = leads.map(l => {
    const d = l.collected_data || {}
    const notes = ((d._notes as { text: string }[]) || []).map(n => n.text).join(' | ')
    return [
      l.customer_phone,
      (d.customer_name as string) || '',
      (d.intent as string) || '',
      (d.area as string) || '',
      (d.budget as string) || '',
      l.stage,
      l.conversation_state,
      new Date(l.last_interaction).toLocaleString('en-IN'),
      notes,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`)
  })
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AgentLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savingNote, setSavingNote] = useState<Record<string, boolean>>({})
  const [properties, setProperties] = useState<Property[]>([])
  const [filter, setFilter] = useState<StageFilter>('all')
  const [directMsg, setDirectMsg] = useState<Record<string, string>>({})
  const [sendingMsg, setSendingMsg] = useState<Record<string, boolean>>({})
  const [sentMsg, setSentMsg] = useState<Record<string, string | null>>({})
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({})
  const [loadingChat, setLoadingChat] = useState<Record<string, boolean>>({})
  const chatEndRef = useRef<Record<string, HTMLDivElement | null>>({})
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastIntent, setBroadcastIntent] = useState<'all' | 'buy' | 'rent'>('all')
  const [broadcastStage, setBroadcastStage] = useState<string>('all')
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number } | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    supabaseRef.current = createClient()
    loadLeads()
  }, [])

  async function getToken() {
    const { data } = await supabaseRef.current!.auth.getSession()
    return data.session?.access_token ?? ''
  }

  async function loadLeads() {
    setLoading(true)
    const token = await getToken()
    if (!token) { window.location.href = '/agent'; return }
    const [leadsRes, propRes] = await Promise.all([
      fetch('/api/leads', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/properties', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    const leadsJson = await leadsRes.json()
    const propJson = await propRes.json()
    if (leadsJson.error) setError(leadsJson.error)
    else setLeads(leadsJson.leads || [])
    if (!propJson.error) setProperties(propJson.properties || [])
    setLoading(false)
  }

  async function updateStage(id: string, stage: string) {
    const token = await getToken()
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, stage })
    })
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l))
  }

  async function saveNote(lead: Lead) {
    const noteText = notes[lead.id]
    if (!noteText?.trim()) return
    setSavingNote(s => ({ ...s, [lead.id]: true }))
    const token = await getToken()
    const existingNotes = (lead.collected_data?._notes as { text: string; timestamp: string }[]) || []
    const updatedNotes = [...existingNotes, { text: noteText.trim(), timestamp: new Date().toISOString() }]
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: lead.id, collected_data: { ...lead.collected_data, _notes: updatedNotes } })
    })
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, collected_data: { ...l.collected_data, _notes: updatedNotes } } : l))
    setNotes(n => ({ ...n, [lead.id]: '' }))
    setSavingNote(s => ({ ...s, [lead.id]: false }))
  }

  function matchingProperties(lead: Lead): Property[] {
    const prefs = lead.search_preferences || {}
    const intent = prefs.intent as string | undefined
    const area = (prefs.area as string | undefined)?.toLowerCase()
    const budget = (lead.collected_data?.budget as string | undefined)
    const budgetNum = budget ? Number(budget) : null
    return properties.filter(p => {
      if (p.status !== 'active') return false
      if (intent && p.intent !== intent) return false
      if (area && !p.area.toLowerCase().includes(area)) return false
      if (budgetNum && budgetNum > 0 && p.price > budgetNum) return false
      return true
    })
  }

  async function loadChat(leadId: string) {
    if (chatMessages[leadId] !== undefined) return // already loaded
    setLoadingChat(l => ({ ...l, [leadId]: true }))
    const token = await getToken()
    const res = await fetch(`/api/leads/messages?lead_id=${leadId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const json = await res.json()
    setChatMessages(c => ({ ...c, [leadId]: json.messages ?? [] }))
    setLoadingChat(l => ({ ...l, [leadId]: false }))
  }

  async function sendDirectMessage(lead: Lead) {
    const msg = directMsg[lead.id]?.trim()
    if (!msg) return
    setSendingMsg(s => ({ ...s, [lead.id]: true }))
    setSentMsg(s => ({ ...s, [lead.id]: null }))
    const token = await getToken()
    const res = await fetch('/api/leads/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lead_id: lead.id, message: msg })
    })
    const json = await res.json()
    if (json.error) {
      setSentMsg(s => ({ ...s, [lead.id]: `Error: ${json.error}` }))
    } else {
      setSentMsg(s => ({ ...s, [lead.id]: 'sent' }))
      setDirectMsg(d => ({ ...d, [lead.id]: '' }))
      // Append to chat optimistically
      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        direction: 'out',
        body: msg,
        created_at: new Date().toISOString()
      }
      setChatMessages(c => ({ ...c, [lead.id]: [...(c[lead.id] ?? []), newMsg] }))
      setTimeout(() => {
        chatEndRef.current[lead.id]?.scrollIntoView({ behavior: 'smooth' })
        setSentMsg(s => ({ ...s, [lead.id]: null }))
      }, 300)
    }
    setSendingMsg(s => ({ ...s, [lead.id]: false }))
  }

  async function sendBroadcast() {
    if (!broadcastMessage.trim()) return
    if (!confirm(`Send this message to all matching leads?`)) return
    setBroadcasting(true)
    setBroadcastResult(null)
    const token = await getToken()
    const res = await fetch('/api/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message: broadcastMessage,
        intent_filter: broadcastIntent === 'all' ? null : broadcastIntent,
        stage_filter: broadcastStage === 'all' ? null : broadcastStage,
      })
    })
    const json = await res.json()
    if (json.error) setBroadcastResult({ sent: 0, failed: -1 })
    else setBroadcastResult({ sent: json.sent, failed: json.failed })
    setBroadcasting(false)
  }

  const broadcastCount = leads.filter(l => {
    const intentMatch = broadcastIntent === 'all' || (l.search_preferences as Record<string, unknown>)?.intent === broadcastIntent
    const stageMatch = broadcastStage === 'all' || l.stage === broadcastStage
    return intentMatch && stageMatch
  }).length

  const counts = {
    all: leads.length,
    new: leads.filter(l => l.stage === 'new').length,
    contacted: leads.filter(l => l.stage === 'contacted').length,
    qualified: leads.filter(l => l.stage === 'qualified').length,
    closed: leads.filter(l => l.stage === 'closed').length,
  }

  const filtered = filter === 'all' ? leads : leads.filter(l => l.stage === filter)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading leads...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <a href="/agent/dashboard" className="text-sky-200 text-sm hover:text-white transition flex items-center gap-1 mb-2">← Dashboard</a>
              <h1 className="text-2xl font-bold">My Leads</h1>
              <p className="text-sky-200 text-sm mt-1">{leads.length} total leads from your WhatsApp bot</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowBroadcast(!showBroadcast); setBroadcastResult(null) }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur rounded-xl text-sm font-semibold transition"
              >
                📣 Bulk Message
              </button>
              <button
                onClick={() => exportToCSV(leads)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur rounded-xl text-sm font-semibold transition"
              >
                ⬇ Export
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-6">
            {(['new', 'contacted', 'qualified', 'closed'] as const).map(s => (
              <div key={s} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{counts[s]}</p>
                <p className="text-xs text-sky-200 mt-0.5 capitalize font-medium">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-6 pb-12">

        {/* Broadcast Panel */}
        {showBroadcast && (
          <div className="bg-white rounded-2xl shadow-sm border border-orange-200 p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📣</span>
              <h2 className="text-base font-bold text-gray-900">Bulk Message</h2>
              <span className="text-xs text-gray-400 ml-1">Use <code className="bg-gray-100 px-1 rounded">{'{name}'}</code> to personalise</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Interest Filter</label>
                <select
                  value={broadcastIntent}
                  onChange={e => setBroadcastIntent(e.target.value as 'all' | 'buy' | 'rent')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-sky-400"
                >
                  <option value="all">All leads</option>
                  <option value="buy">Buying interest only</option>
                  <option value="rent">Renting interest only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Stage Filter</label>
                <select
                  value={broadcastStage}
                  onChange={e => setBroadcastStage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-sky-400"
                >
                  <option value="all">All stages</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Message</label>
              <textarea
                rows={3}
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                placeholder="Hi {name}! We have new properties available in your area. Reply to know more 🏡"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 bg-gray-50 resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Will send to <span className="font-bold text-gray-900">{broadcastCount}</span> lead{broadcastCount !== 1 ? 's' : ''}
              </p>
              <button
                onClick={sendBroadcast}
                disabled={broadcasting || !broadcastMessage.trim() || broadcastCount === 0}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition disabled:opacity-40"
              >
                {broadcasting ? 'Sending...' : `Send to ${broadcastCount} leads`}
              </button>
            </div>

            {broadcastResult && (
              <div className={`mt-3 p-3 rounded-xl text-sm font-medium ${broadcastResult.failed === -1 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {broadcastResult.failed === -1
                  ? 'Error sending messages. Make sure your WhatsApp number is linked (a customer must message you first).'
                  : `✓ Sent: ${broadcastResult.sent}  |  Failed: ${broadcastResult.failed}`
                }
              </div>
            )}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1 mb-6">
          {(Object.keys(STAGE_CONFIG) as StageFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${filter === s ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
            >
              {STAGE_CONFIG[s].label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filter === s ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-lg font-semibold text-gray-900">No leads here</p>
            <p className="text-sm text-gray-500 mt-1">{filter === 'all' ? 'Leads from your WhatsApp bot will appear here' : `No ${filter} leads yet`}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((lead) => {
              const customerName = (lead.collected_data?.customer_name as string) || null
              const area = (lead.collected_data?.area as string) || null
              const intent = (lead.collected_data?.intent as string) || null
              const budget = (lead.collected_data?.budget as string) || null
              const notesList = (lead.collected_data?._notes as { text: string; timestamp: string }[]) || []
              const isOpen = expanded === lead.id
              const matched = matchingProperties(lead)

              // Load chat when expanded
              if (isOpen && chatMessages[lead.id] === undefined && !loadingChat[lead.id]) {
                loadChat(lead.id)
              }

              return (
                <div key={lead.id} className={`bg-white rounded-2xl border shadow-sm transition-all ${isOpen ? 'border-sky-200 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : lead.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                        {customerName ? customerName[0].toUpperCase() : lead.customer_phone.slice(-2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{customerName || lead.customer_phone}</p>
                        {customerName && <p className="text-xs text-gray-400">{lead.customer_phone}</p>}
                        <div className="flex items-center flex-wrap gap-x-2 mt-0.5">
                          {area && <span className="text-xs text-gray-500">📍 {area}</span>}
                          {intent && <span className="text-xs text-gray-500">• {intent}</span>}
                          {budget && <span className="text-xs text-gray-500">• ₹{Number(budget).toLocaleString('en-IN')}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {matched.length > 0 && (
                        <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium border border-emerald-100">
                          {matched.length} match{matched.length > 1 ? 'es' : ''}
                        </span>
                      )}
                      {stagePill(lead.stage)}
                      <select
                        value={lead.stage}
                        onChange={(e) => updateStage(lead.id, e.target.value)}
                        className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:border-sky-400"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="closed">Closed</option>
                      </select>
                      <span className="text-xs text-gray-400 hidden md:block">{formatDate(lead.last_interaction)}</span>
                      <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          {Object.keys(lead.collected_data || {}).filter(k => k !== '_notes').length > 0 && (
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Collected Info</p>
                              <div className="space-y-1.5">
                                {Object.entries(lead.collected_data || {}).filter(([k]) => k !== '_notes').map(([k, v]) => (
                                  <div key={k} className="flex gap-2 text-sm">
                                    <span className="text-gray-400 capitalize min-w-[90px] shrink-0">{k.replace(/_/g, ' ')}</span>
                                    <span className="font-semibold text-gray-800">{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg">State: {lead.conversation_state}</span>
                          </div>
                          {/* WhatsApp-style Chat */}
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Chat History</p>
                            <div
                              className="bg-[#e5ddd5] rounded-xl overflow-y-auto flex flex-col gap-1.5 p-3"
                              style={{ minHeight: 120, maxHeight: 320, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3C/svg%3E")' }}
                            >
                              {loadingChat[lead.id] ? (
                                <p className="text-xs text-gray-500 text-center my-4">Loading messages...</p>
                              ) : (chatMessages[lead.id] ?? []).length === 0 ? (
                                <p className="text-xs text-gray-500 text-center my-4">No messages yet</p>
                              ) : (
                                (chatMessages[lead.id] ?? []).map(m => (
                                  <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                      className={`max-w-[75%] px-3 py-2 rounded-2xl shadow-sm text-sm ${
                                        m.direction === 'out'
                                          ? 'bg-[#dcf8c6] text-gray-900 rounded-br-sm'
                                          : 'bg-white text-gray-900 rounded-bl-sm'
                                      }`}
                                    >
                                      <p className="whitespace-pre-wrap leading-snug">{m.body}</p>
                                      <p className={`text-[10px] mt-1 text-right ${
                                        m.direction === 'out' ? 'text-green-700' : 'text-gray-400'
                                      }`}>
                                        {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        {' · '}
                                        {new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        {m.direction === 'out' && ' ✓✓'}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              )}
                              <div ref={el => { chatEndRef.current[lead.id] = el }} />
                            </div>
                            {/* Message input */}
                            <div className="mt-2 flex gap-2">
                              <textarea
                                rows={2}
                                placeholder="Type a message..."
                                value={directMsg[lead.id] || ''}
                                onChange={e => setDirectMsg(d => ({ ...d, [lead.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDirectMessage(lead) } }}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 bg-white resize-none"
                              />
                              <button
                                onClick={() => sendDirectMessage(lead)}
                                disabled={sendingMsg[lead.id] || !directMsg[lead.id]?.trim()}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition shadow-sm disabled:opacity-40 shrink-0"
                              >
                                {sendingMsg[lead.id] ? '...' : '📤'}
                              </button>
                            </div>
                            {sentMsg[lead.id]?.startsWith('Error') && (
                              <p className="text-xs text-red-500 mt-1">{sentMsg[lead.id]}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          {matched.length > 0 && (
                            <>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Matching Properties</p>
                              <div className="space-y-2">
                                {matched.map(p => (
                                  <a key={p.id} href={`/p/${p.id}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center justify-between bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-xl px-3 py-2.5 transition group"
                                  >
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900 group-hover:text-sky-700">{p.title}</p>
                                      <p className="text-xs text-gray-500">{p.area} · {p.size_sqft} sqft · ₹{Number(p.price).toLocaleString('en-IN')}</p>
                                    </div>
                                    <span className="text-sky-500 text-sm">→</span>
                                  </a>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Notes</p>
                        {notesList.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {notesList.map((note, i) => (
                              <div key={i} className="flex gap-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                                <span className="text-amber-400 mt-0.5">📝</span>
                                <div>
                                  <p className="text-sm text-gray-800">{note.text}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{new Date(note.timestamp).toLocaleString('en-IN')}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add a note and press Enter..."
                            value={notes[lead.id] || ''}
                            onChange={(e) => setNotes(n => ({ ...n, [lead.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && saveNote(lead)}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 bg-gray-50"
                          />
                          <button
                            onClick={() => saveNote(lead)}
                            disabled={savingNote[lead.id] || !notes[lead.id]?.trim()}
                            className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-700 disabled:opacity-40 transition"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
