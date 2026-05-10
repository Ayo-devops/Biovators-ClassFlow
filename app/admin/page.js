'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminPanel() {
  const [user, setUser] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [students, setStudents] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/admin/login'
        return
      }
      setUser(session.user)
      setUserRole(session.user.user_metadata?.role || 'admin')

      const [a, s, an] = await Promise.all([
        fetch('/api/assignments').then(r => r.json()),
        fetch('/api/students').then(r => r.json()),
        fetch('/api/announcements').then(r => r.json())
      ])
      setAssignments(a)
      setStudents(s)
      setAnnouncements(an)
      setLoading(false)
    }
    checkAuth()
  }, [])

  const deleteAssignment = async (id) => {
    if (!confirm('Delete this assignment?')) return
    await fetch(`/api/assignments/${id}`, { method: 'DELETE' })
    setAssignments(assignments.filter(a => a.id !== id))
  }

  const deleteStudent = async (id) => {
    if (!confirm('Remove this student?')) return
    await fetch(`/api/students/${id}`, { method: 'DELETE' })
    setStudents(students.filter(s => s.id !== id))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-500">Loading admin panel...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
            <p className="text-xs mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${userRole === 'admin' ? 'bg-green-900/40 text-green-400' : 'bg-blue-900/40 text-blue-400'}`}>
                {userRole === 'admin' ? 'Admin' : 'Course Rep'}
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            {userRole === 'admin' && (
              <a href="/admin/invite" className="border border-green-800 text-green-400 px-4 py-2 rounded text-xs tracking-widest uppercase hover:bg-green-900/30 transition-colors">
                Invite User
              </a>
            )}
            <a href="/" className="border border-slate-700 text-slate-300 px-4 py-2 rounded text-xs tracking-widest uppercase hover:border-green-400 hover:text-green-400 transition-colors">
              Dashboard
            </a>
            <button
              onClick={handleSignOut}
              className="border border-red-800 text-red-400 px-4 py-2 rounded text-xs tracking-widest uppercase hover:bg-red-900/30 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-slate-900 border border-slate-800 rounded p-5">
            <p className="text-3xl font-bold text-green-400">{students.length}</p>
            <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">Students</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded p-5">
            <p className="text-3xl font-bold text-blue-400">{assignments.length}</p>
            <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">Assignments</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded p-5">
            <p className="text-3xl font-bold text-yellow-400">{announcements.length}</p>
            <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">Announcements</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-800">
          {['overview', 'students', 'assignments', 'announcements'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-xs uppercase tracking-widest font-bold transition-colors ${activeTab === tab ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Students Tab */}
        {activeTab === 'students' && (
          userRole !== 'admin' ? (
            <p className="text-red-400 text-sm">Access denied. Admins only.</p>
          ) : (
            <div className="space-y-2">
              {students.map(s => (
                <div key={s.id} className="flex items-center justify-between border border-slate-800 rounded px-4 py-3 hover:bg-slate-800/50">
                  <div>
                    <p className="text-white text-sm font-medium">{s.student_name}</p>
                    <p className="text-slate-400 text-xs">{s.student_email}</p>
                  </div>
                  <button
                    onClick={() => deleteStudent(s.id)}
                    className="text-red-400 text-xs hover:text-red-300 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="space-y-2">
            {assignments.map(a => (
              <div key={a.id} className="flex items-center justify-between border border-slate-800 rounded px-4 py-3 hover:bg-slate-800/50">
                <div>
                  <p className="text-white text-sm font-medium">{a.assignment_title}</p>
                  <p className="text-slate-400 text-xs">{a.course_title} · Due {a.deadline_date}</p>
                </div>
                <button
                  onClick={() => deleteAssignment(a.id)}
                  className="text-red-400 text-xs hover:text-red-300 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-2">
            {announcements.map(a => (
              <div key={a.id} className="border border-slate-800 rounded px-4 py-3 hover:bg-slate-800/50">
                <p className="text-white text-sm font-medium">{a.title}</p>
                <p className="text-slate-400 text-xs mt-1">{a.body}</p>
                <p className="text-slate-600 text-xs mt-2">Posted by {a.posted_by}</p>
              </div>
            ))}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="text-slate-400 text-sm space-y-2">
            <p>Welcome to the ClassFlow admin panel.</p>
            <p>Use the tabs above to manage students, assignments, and announcements.</p>
            <p>Navigate to the Students tab to remove a student from the email list.</p>
            <p>Navigate to the Assignments tab to delete an assignment from the dashboard.</p>
          </div>
        )}

      </div>
    </main>
  )
}