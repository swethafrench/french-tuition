'use client'

import { useEffect, useState } from 'react'
import { Users, CalendarDays, TrendingUp, AlertCircle } from 'lucide-react'
import api from '@/lib/api'
import { Student, AttendanceSummary } from '@/types'

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [summary, setSummary] = useState<AttendanceSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/students'),
      api.get('/api/attendance/summary'),
    ]).then(([s, a]) => {
      setStudents(s.data)
      setSummary(a.data)
    }).finally(() => setLoading(false))
  }, [])

  const today = new Date()
  const dayOfWeek = today.getDay()
  const isClassToday = [1, 3, 5].includes(dayOfWeek)
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

  const avgAttendance = summary.length
    ? Math.round(
        summary.reduce((acc, s) => acc + (s.attendance_pct ?? 0), 0) / summary.length
      )
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400 text-sm">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {dayNames[dayOfWeek]}, {today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Users size={18} className="text-blue-600" />} label="Total students" value={students.length} sub="active" bg="bg-blue-50" />
        <StatCard icon={<CalendarDays size={18} className="text-teal-600" />} label="Classes per week" value={3} sub="Mon, Wed, Fri" bg="bg-teal-50" />
        <StatCard icon={<TrendingUp size={18} className="text-green-600" />} label="Avg. attendance" value={avgAttendance + '%'} sub="this month" bg="bg-green-50" />
        <StatCard icon={<AlertCircle size={18} className="text-amber-600" />} label="Today" value={isClassToday ? 'Class day' : 'No class'} sub="4:00 PM to 5:30 PM" bg="bg-amber-50" />
      </div>

      {isClassToday && (
        <div className="bg-blue-600 text-white rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
          <div>
            <p className="font-medium">Class today - {dayNames[dayOfWeek]}</p>
            <p className="text-blue-200 text-sm mt-0.5">4:00 PM to 5:30 PM - {students.length} students</p>
          </div>
          <a href="/teacher/attendance" className="bg-white text-blue-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
            Mark attendance
          </a>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All students - attendance this month</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Student</th>
              <th className="text-left px-5 py-3 font-medium">School</th>
              <th className="text-left px-5 py-3 font-medium">Mode</th>
              <th className="text-left px-5 py-3 font-medium">Present</th>
              <th className="text-left px-5 py-3 font-medium">Absent</th>
              <th className="text-left px-5 py-3 font-medium">Attendance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  No attendance data yet. Start marking attendance after each class.
                </td>
              </tr>
            ) : (
              summary.map((s) => (
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
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.mode === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {s.mode}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{s.present_count}</td>
                  <td className="px-5 py-3 text-gray-700">{s.absent_count}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(s.attendance_pct ?? 0) >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.attendance_pct != null ? s.attendance_pct + '%' : '-'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, bg }: { icon: React.ReactNode; label: string; value: string | number; sub: string; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}
