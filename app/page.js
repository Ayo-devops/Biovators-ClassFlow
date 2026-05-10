'use client'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/assignments')
      .then(res => res.json())
      .then(data => {
        setAssignments(data)
        setLoading(false)
      })
  }, [])

  const today = new Date()
  const in2Days = new Date(today)
  in2Days.setDate(today.getDate() + 2)
  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)

  const urgent = assignments.filter(a => new Date(a.deadline_date) <= in2Days && new Date(a.deadline_date) >= today)
  const thisWeek = assignments.filter(a => new Date(a.deadline_date) > in2Days && new Date(a.deadline_date) <= in7Days)
  const all = assignments

  const priorityColor = (p) => {
    if (p === 'High') return 'text-red-400'
    if (p === 'Medium') return 'text-orange-400'
    return 'text-green-400'
  }

  const AssignmentTable = ({ data, emptyMsg }) => (
    data.length === 0
      ? <p className="text-slate-500 text-sm py-4">{emptyMsg}</p>
      : <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-800">
              <th className="pb-2 pr-4">Course</th>
              <th className="pb-2 pr-4">Assignment</th>
              <th className="pb-2 pr-4">Deadline</th>
              <th className="pb-2 pr-4">Method</th>
              <th className="pb-2">Priority</th>
            </tr>
          </thead>
          <tbody>
            {data.map(a => (
              <tr key={a.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="py-3 pr-4 text-slate-300">{a.course_title}</td>
                <td className="py-3 pr-4 text-white font-medium">{a.assignment_title}</td>
                <td className="py-3 pr-4 text-slate-400">{a.deadline_date}</td>
                <td className="py-3 pr-4 text-slate-400">{a.submission_method}</td>
                <td className={`py-3 font-medium ${priorityColor(a.priority)}`}>{a.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
  )

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-xs text-green-400 tracking-widest uppercase">System Active</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">ClassFlow</h1>
        <p className="text-slate-400 mt-1 text-sm">Academic Deadline Tracker</p>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 flex-wrap">
          <a
            href="/submit"
            className="bg-green-400 text-black font-bold px-5 py-2 rounded text-xs tracking-widest uppercase hover:bg-white transition-colors"
          >
            Submit Assignment
          </a>
          <a
            href="/register"
            className="border border-slate-700 text-slate-300 font-bold px-5 py-2 rounded text-xs tracking-widest uppercase hover:border-green-400 hover:text-green-400 transition-colors"
          >
            Register for Emails
          </a>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading assignments...</p>
      ) : (
        <div className="space-y-10">

          {/* Urgent */}
          <div>
            <h2 className="text-xs font-bold tracking-widest uppercase text-red-400 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              Urgent — Due in 48 Hours
            </h2>
            <AssignmentTable data={urgent} emptyMsg="No urgent assignments. You're good." />
          </div>

          {/* This Week */}
          <div>
            <h2 className="text-xs font-bold tracking-widest uppercase text-yellow-400 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
              This Week
            </h2>
            <AssignmentTable data={thisWeek} emptyMsg="Nothing due this week." />
          </div>

          {/* All Assignments */}
          <div>
            <h2 className="text-xs font-bold tracking-widest uppercase text-green-400 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
              All Assignments
            </h2>
            <AssignmentTable data={all} emptyMsg="No assignments yet." />
          </div>

        </div>
      )}
    </main>
  )
}