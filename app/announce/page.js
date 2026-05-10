'use client'
import { useState } from 'react'

export default function Announce() {
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [form, setForm] = useState({
    title: '',
    body: '',
    posted_by: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const correctPassword = 'classflow2026'

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!form.title || !form.body || !form.posted_by) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        setSuccess(true)
        setForm({ title: '', body: '', posted_by: '' })
      } else {
        setError('Something went wrong. Try again.')
      }
    } catch (err) {
      setError('Network error. Try again.')
    }
    setLoading(false)
  }

  if (!unlocked) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold mb-2">ClassFlow</h1>
          <p className="text-slate-400 text-sm mb-8">Rep access only</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400 mb-4"
            placeholder="Enter password"
          />
          <button
            onClick={() => {
              if (password === correctPassword) {
                setUnlocked(true)
              } else {
                alert('Wrong password')
              }
            }}
            className="w-full bg-green-400 text-black font-bold py-3 rounded text-sm tracking-widest uppercase hover:bg-white transition-colors"
          >
            Enter
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <a href="/" className="inline-block text-slate-500 text-xs hover:text-slate-300 transition-colors mb-6">
            ← Back to Dashboard
          </a>
          <h1 className="text-3xl font-bold tracking-tight">ClassFlow</h1>
          <p className="text-slate-400 text-sm mt-1">Post an announcement</p>
        </div>

        {success && (
          <div className="bg-green-900/30 border border-green-500 text-green-400 px-4 py-3 rounded mb-6 text-sm">
            Announcement posted. Emails sent to all students.
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-400 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
              placeholder="e.g. Class cancelled tomorrow"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Message</label>
            <textarea
              name="body"
              value={form.body}
              onChange={handleChange}
              rows={5}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
              placeholder="Write your announcement here..."
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Posted By</label>
            <input
              name="posted_by"
              value={form.posted_by}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
              placeholder="e.g. Course Rep — MEE"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-400 text-black font-bold py-3 rounded text-sm tracking-widest uppercase hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post Announcement'}
          </button>
        </div>
      </div>
    </main>
  )
}