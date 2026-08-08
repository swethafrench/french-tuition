'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { AttendanceSummary } from '@/types'

export default function ReportsPage() {
  const [summary, setSummary] = useState<AttendanceSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/attendance/summary')
      .then(r => setSummary(r.data))
      .finally(() => setLoading(false))
  }, [])

  const totalPresent = summary.reduce((a, s) => a + s.present_count, 0)
  const totalAbsent = summary.reduce((a, s) => a + s.absent_count, 0)
  const totalLeave = summary.reduce((a, s) => a + s.leave_count, 0)
  const avgPct = summary.length
    ? Math.round(summary.reduce((a, s) => a + (s.attendance_pct ?? 0), 0) / summary.length)
    : 0

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-400 text-sm">Loading reports...</p>
    </div>
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Attendance summary for the current month.</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{summary.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total students</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <p className="text-2xl font-semibold text-green-700">{totalPresent}</p>
          <p className="text-xs text-green-600 mt-1">Total present</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
          <p className="text-2xl font-semibold text-red-700">{totalAbsent}</p>
          <p className="text-xs text-red-600 mt-1">Total absent</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
          <p className="text-2xl font-semibold text-blue-700">{avgPct}%</p>
          <p className="text-xs text-blue-600 mt-1">Avg. attendance</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Student-wise breakdown</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Student</th>
              <th className="text-left px-5 py-3 font-medium">School</th>
              <th className="text-left px-5 py-3 font-medium">Grade</th>
              <th className="text-left px-5 py-3 font-medium">Mode</th>
              <th className="text-center px-5 py-3 font-medium">Present</th>
              <th className="text-center px-5 py-3 font-medium">Absent</th>
              <th className="text-center px-5 py-3 font-medium">Leave</th>
              <th className="text-center px-5 py-3 font-medium">Attendance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                  No data yet. Mark attendance after each class to see reports here.
                </td>
              </tr>
            ) : summary.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                      {s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.reg_number}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-600">{s.school_name}</td>
                <td className="px-5 py-3 text-gray-600">{s.grade}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.mode === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {s.mode}
                  </span>
                </td>
                <td className="px-5 py-3 text-center font-medium text-green-700">{s.present_count}</td>
                <td className="px-5 py-3 text-center font-medium text-red-700">{s.absent_count}</td>
                <td className="px-5 py-3 text-center font-medium text-amber-700">{s.leave_count}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${(s.attendance_pct ?? 0) >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {s.attendance_pct != null ? s.attendance_pct + '%' : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
