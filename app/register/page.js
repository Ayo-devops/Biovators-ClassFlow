'use client'
import { useState } from 'react'

export default function Register() {
  const [form, setForm] = useState({
    student_name: '',
    student_email: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!form.student_name || !form.student_email) {
      setError('Please fill in both fields.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        setSuccess(true)
      } else {
        const data = await res.json()
        setError(data.error?.message || 'Something went wrong. You may already be registered.')
      }
    } catch (err) {
      setError('Network error. Try again.')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">You are registered!</h2>
          <p className="text-slate-400 text-sm">You will receive email reminders for all upcoming assignments automatically.</p>
          <a href="/" className="inline-block mt-6 text-green-400 text-sm border-b border-green-400">
            View Dashboard
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-xs text-green-400 tracking-widest uppercase">ClassFlow</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Get Reminders</h1>
          <p className="text-slate-400 text-sm">Register once. Never miss a deadline again.</p>
        </div>

        <div className="space-y-4">

          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-400 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Full Name</label>
            <input
              name="student_name"
              value={form.student_name}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
              placeholder="e.g. Akorede Ayomide"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Email Address</label>
            <input
              name="student_email"
              type="email"
              value={form.student_email}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
              placeholder="e.g. you@gmail.com"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-400 text-black font-bold py-3 rounded text-sm tracking-widest uppercase hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register for Reminders'}
          </button>

          <p className="text-center text-slate-600 text-xs mt-4">
            By registering you will receive automated email reminders for all class assignments.
          </p>

          <div className="text-center mt-2">
            <a href="/" className="text-slate-500 text-xs hover:text-slate-300 transition-colors">
              View Dashboard
            </a>
          </div>

        </div>
      </div>
    </main>
  )
}