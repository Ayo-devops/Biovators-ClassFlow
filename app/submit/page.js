'use client'
import { useState } from 'react'

export default function SubmitAssignment() {
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [form, setForm] = useState({
    course_title: '',
    assignment_title: '',
    lecturer_name: '',
    deadline_date: '',
    submission_method: 'Email',
    priority: 'Medium',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const correctPassword = 'classflow2026'

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        setSuccess(true)
        setForm({
          course_title: '',
          assignment_title: '',
          lecturer_name: '',
          deadline_date: '',
          submission_method: 'Email',
          priority: 'Medium',
          description: ''
        })
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
  <p className="text-slate-400 text-sm mt-1">Submit a new assignment</p>
</div>

        {success && (
          <div className="bg-green-900/30 border border-green-500 text-green-400 px-4 py-3 rounded mb-6 text-sm">
            Assignment submitted successfully. Emails are being sent to all students.
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-400 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Course Title</label>
            <input
              name="course_title"
              value={form.course_title}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
              placeholder="e.g. Engineering Mathematics"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Assignment Title</label>
            <input
              name="assignment_title"
              value={form.assignment_title}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
              placeholder="e.g. Integration Problems"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Lecturer</label>
            <input
              name="lecturer_name"
              value={form.lecturer_name}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
              placeholder="e.g. Engr. Alao"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Deadline Date</label>
            <input
              type="date"
              name="deadline_date"
              value={form.deadline_date}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Submission Method</label>
            <select
              name="submission_method"
              value={form.submission_method}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
            >
              <option>Email</option>
              <option>LMS</option>
              <option>Physical</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-green-400"
              placeholder="Any additional details..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-400 text-black font-bold py-3 rounded text-sm tracking-widest uppercase hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Assignment'}
          </button>
        </div>

      </div>
    </main>
  )
}