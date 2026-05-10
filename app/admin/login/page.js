'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/admin'
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold mb-2">ClassFlow</h1>
          <p className="text-slate-400 text-sm">Admin Access</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-400 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
              placeholder="admin@email.com"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-green-400 text-black font-bold py-3 rounded text-sm tracking-widest uppercase hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center mt-4">
            <a href="/" className="text-slate-500 text-xs hover:text-slate-300 transition-colors">
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}