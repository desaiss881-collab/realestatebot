'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function NewPropertyPage() {
  const [title, setTitle] = useState('')
  const [intent, setIntent] = useState('buy')
  const [area, setArea] = useState('')
  const [sizeSqft, setSizeSqft] = useState('')
  const [price, setPrice] = useState('')
  const [imageFiles, setImageFiles] = useState<FileList | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    supabaseRef.current = createClient()
  }, [])

  async function getToken() {
    const { data } = await supabaseRef.current!.auth.getSession()
    return data.session?.access_token ?? ''
  }

  async function uploadFile(file: File, bucket: string): Promise<string> {
    const token = await getToken()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })
    const json = await res.json()
    if (json.error) throw new Error(json.error)
    return json.url
  }

  async function uploadImages(files: FileList): Promise<string[]> {
    return Promise.all(Array.from(files).map(f => uploadFile(f, 'property-images')))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      let image_urls: string[] = []
      if (imageFiles && imageFiles.length > 0) {
        image_urls = await uploadImages(imageFiles)
      }

      let pdf_url: string | null = null
      if (pdfFile) {
        pdf_url = await uploadFile(pdfFile, 'property-pdfs')
      }

      const token = await getToken()
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          intent,
          area,
          size_sqft: Number(sizeSqft),
          price: Number(price),
          image_urls,
          pdf_url,
          status: 'active'
        })
      })

      const json = await res.json()
      if (json.error) {
        setError(json.error)
        setSaving(false)
        return
      }

      window.location.href = '/agent/properties'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <a href="/agent/properties" className="text-sm text-blue-600 hover:underline">&larr; Back to Properties</a>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">Post a Property</h1>
          <p className="text-sm text-gray-500 mt-1">Fill in the details to list a new property</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="e.g. 3BHK Apartment in Bandra West"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Listing Type</label>
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
            >
              <option value="buy">For Sale</option>
              <option value="rent">For Rent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area / Location</label>
            <input
              type="text"
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="e.g. Bandra West, Mumbai"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size (sqft)</label>
              <input
                type="number"
                required
                min="1"
                value={sizeSqft}
                onChange={(e) => setSizeSqft(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="e.g. 1200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="e.g. 5000000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImageFiles(e.target.files)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-400 mt-1">Requires a &quot;property-images&quot; public bucket in Supabase Storage</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PDF Brochure <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-400 mt-1">Requires a &quot;property-pdfs&quot; public bucket in Supabase Storage</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Posting...' : 'Post Property'}
          </button>
        </form>
      </div>
    </div>
  )
}
