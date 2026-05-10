'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function InvitePage() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('rep')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/admin/login'
        return
      }
      setUser(session.user)
      setUserRole(session.user.user_metadata?.role || 'admin')
    }
    checkAuth()
  }, [])

  const handleInvite = async () => {
    if (!email) {
      setError('Please enter an email.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        setEmail('')
      } else {
        setError(data.error || 'Something went wrong.')
      }
    } catch (err) {
      setError('Network error. Try again.')
    }
    setLoading(false)
  }

  if (userRole === 'rep') {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-400 text-sm">Access denied. Admins only.</p>
          <a href="/admin" className="text-slate-500 text-xs mt-4 inline-block hover:text-slate-300">
            Back to Panel
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <a href="/admin" className="inline-block text-slate-500 text-xs hover:text-slate-300 transition-colors mb-6">
            ← Back to Panel
          </a>
          <h1 className="text-3xl font-bold tracking-tight">Invite User</h1>
          <p className="text-slate-400 text-sm mt-1">Send an invite to a rep or admin</p>
        </div>

        {success && (
          <div className="bg-green-900/30 border border-green-500 text-green-400 px-4 py-3 rounded mb-6 text-sm">
            Invite sent successfully. They'll receive an email to set their password.
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-400 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
              placeholder="rep@gmail.com"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
            >
              <option value="rep">Course Rep</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            onClick={handleInvite}
            disabled={loading}
            className="w-full bg-green-400 text-black font-bold py-3 rounded text-sm tracking-widest uppercase hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </main>
  )
}