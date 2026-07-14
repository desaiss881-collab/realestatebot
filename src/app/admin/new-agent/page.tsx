'use client'

import { useState } from 'react'

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function randomToken() {
  return Math.random().toString(36).substring(2, 12)
}

export default function NewAgentPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [areasInput, setAreasInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    const slug = slugify(name) + '-' + Math.floor(Math.random() * 1000)
    const verifyToken = randomToken()
    const areas = areasInput
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0)

    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email: email || null,
        password: password || null,
        phone: phone || null,
        agent_slug: slug,
        webhook_verify_token: verifyToken,
        service_areas: areas,
        status: 'pending'
      })
    })

    const json = await res.json()

    if (json.error) {
      setError(json.error)
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)
    setName('')
    setPassword('')
    setEmail('')
    setPhone('')
    setAreasInput('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <a href="/admin" className="text-sm text-blue-600 hover:underline">&larr; Back to Agent Management</a>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">Add New Agent</h1>
          <p className="text-sm text-gray-500 mt-1">
            This creates the agent record. You'll set up their Meta WhatsApp App separately and add those credentials after.
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
            <p className="font-medium mb-2">✅ Agent created successfully.</p>
            <p>Next step: go to the agent&apos;s <strong>WhatsApp Setup</strong> tab, add their WhatsApp Phone Number in Meta, then paste the <strong>Phone Number ID</strong> there. Messages will automatically route to this agent.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="e.g. Rohan Patel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="agent@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Set initial password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="+91..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Areas</label>
            <input
              type="text"
              value={areasInput}
              onChange={(e) => setAreasInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Bandra, Andheri, Juhu (comma separated)"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Agent'}
          </button>
        </form>
      </div>
    </div>
  )
}
