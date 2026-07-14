'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Customer = {
  id: string
  phone: string
  name: string | null
  intent: 'buy' | 'rent' | null
  created_at: string
}

type IntentTab = 'all' | 'buy' | 'rent'

function intentBadge(intent: string | null) {
  if (intent === 'buy') return 'bg-violet-100 text-violet-700 border border-violet-200'
  if (intent === 'rent') return 'bg-sky-100 text-sky-700 border border-sky-100'
  return 'bg-gray-100 text-gray-500 border border-gray-200'
}

function exportToCSV(customers: Customer[], intent: IntentTab) {
  const headers = ['Name', 'Phone', 'Interest', 'Since']
  const rows = customers.map(c => [
    c.name || '',
    c.phone,
    c.intent || '',
    new Date(c.created_at).toLocaleDateString('en-IN'),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`))
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `customers-${intent}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AgentCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<IntentTab>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => { loadCustomers() }, [])

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? ''
  }

  async function loadCustomers() {
    setLoading(true)
    const token = await getToken()
    if (!token) { window.location.href = '/agent'; return }
    const res = await fetch('/api/customers', { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (json.error) setError(json.error)
    else setCustomers(json.customers || [])
    setLoading(false)
  }

  const counts = {
    all: customers.length,
    buy: customers.filter(c => c.intent === 'buy').length,
    rent: customers.filter(c => c.intent === 'rent').length,
  }

  const filtered = tab === 'all' ? customers : customers.filter(c => c.intent === tab)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(c => c.id)))
    }
  }

  async function sendBroadcast() {
    if (!message.trim() || selected.size === 0) return
    if (!confirm(`Send message to ${selected.size} customer${selected.size !== 1 ? 's' : ''}?`)) return
    setSending(true)
    setResult(null)
    const token = await getToken()
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message, customer_ids: Array.from(selected) })
    })
    const json = await res.json()
    if (json.error) setError(json.error)
    else setResult({ sent: json.sent, failed: json.failed })
    setSending(false)
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading customers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <a href="/agent/dashboard" className="text-violet-200 text-sm hover:text-white flex items-center gap-1 mb-2">← Dashboard</a>
              <h1 className="text-2xl font-bold">Customer Database</h1>
              <p className="text-violet-200 text-sm mt-1">All customers who contacted via WhatsApp</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCompose(!showCompose); setResult(null) }}
                disabled={selected.size === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 disabled:opacity-40 backdrop-blur rounded-xl text-sm font-semibold transition"
              >
                📣 Message ({selected.size})
              </button>
              <button
                onClick={() => exportToCSV(filtered, tab)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur rounded-xl text-sm font-semibold transition"
              >
                ⬇ Export
              </button>
            </div>
          </div>

          {/* Count Cards */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {(['all', 'buy', 'rent'] as IntentTab[]).map(t => (
              <div key={t} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{counts[t]}</p>
                <p className="text-xs text-violet-200 mt-0.5 font-medium capitalize">
                  {t === 'all' ? 'Total' : t === 'buy' ? 'Buyers' : 'Renters'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-6 pb-12">

        {/* Compose Panel */}
        {showCompose && selected.size > 0 && (
          <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📣</span>
              <h2 className="text-base font-bold text-gray-900">Send Message</h2>
              <span className="text-xs text-gray-400 ml-1">Use <code className="bg-gray-100 px-1 rounded">{'{name}'}</code> to personalise</span>
            </div>
            <textarea
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Hi {name}! We have exciting ${tab !== 'all' ? tab : ''} properties available. Reply to know more 🏡`}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-400 bg-gray-50 resize-none mb-4"
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Sending to <span className="font-bold text-gray-900">{selected.size}</span> customer{selected.size !== 1 ? 's' : ''}
              </p>
              <button
                onClick={sendBroadcast}
                disabled={sending || !message.trim()}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition disabled:opacity-40"
              >
                {sending ? 'Sending...' : 'Send Now'}
              </button>
            </div>
            {result && (
              <div className="mt-3 p-3 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Sent: {result.sent} &nbsp;|&nbsp; Failed: {result.failed}
              </div>
            )}
            {error && (
              <div className="mt-3 p-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1 mb-6">
          {(['all', 'buy', 'rent'] as IntentTab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelected(new Set()) }}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
            >
              {t === 'all' ? 'All Customers' : t === 'buy' ? '🏠 Buyers' : '🔑 Renters'}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                {counts[t]}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-lg font-semibold text-gray-900">No customers yet</p>
            <p className="text-sm text-gray-500 mt-1">
              {tab === 'all' ? 'Customers are added automatically when someone contacts your WhatsApp bot' : `No ${tab === 'buy' ? 'buying' : 'renting'} customers yet`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Select All Header */}
            <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded accent-violet-600 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {allSelected ? `All ${filtered.length} selected` : `${selected.size} selected`}
              </span>
              {selected.size > 0 && (
                <button
                  onClick={() => { setShowCompose(true); setResult(null) }}
                  className="ml-auto text-xs font-semibold text-violet-600 hover:underline"
                >
                  📣 Message selected ({selected.size})
                </button>
              )}
            </div>

            {/* Customer Rows */}
            <div className="divide-y divide-gray-50">
              {filtered.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => toggleSelect(customer.id)}
                  className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${selected.has(customer.id) ? 'bg-violet-50' : 'hover:bg-gray-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(customer.id)}
                    onChange={() => toggleSelect(customer.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded accent-violet-600 cursor-pointer shrink-0"
                  />
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                    {customer.name ? customer.name[0].toUpperCase() : customer.phone.slice(-2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {customer.name || <span className="text-gray-400 font-normal">Unknown</span>}
                    </p>
                    <p className="text-xs text-gray-400">{customer.phone}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {customer.intent ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${intentBadge(customer.intent)}`}>
                        {customer.intent === 'buy' ? '🏠 Buy' : '🔑 Rent'}
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${intentBadge(null)}`}>Unknown</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(customer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                    <a
                      href={`https://wa.me/${customer.phone.replace('+', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="w-8 h-8 flex items-center justify-center bg-green-50 hover:bg-green-100 text-green-600 rounded-xl transition text-sm"
                    >
                      💬
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
