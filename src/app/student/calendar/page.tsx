'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface AttendanceRecord {
  class_date: string
  status: 'present' | 'absent' | 'leave'
}

export default function StudentCalendarPage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [student, setStudent] = useState<{ name: string; reg_number: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const month = today.toISOString().slice(0, 7)

  useEffect(() => {
    const s = localStorage.getItem('student')
    if (s) setStudent(JSON.parse(s))
    const token = localStorage.getItem('student_token')
    if (!token) return
    const studentData = s ? JSON.parse(s) : null
    if (!studentData) return
    api.get('/api/attendance', {
      params: { student_id: studentData.id, month }
    }).then(r => setAttendance(r.data))
      .finally(() => setLoading(false))
  }, [])

  const attendanceMap: Record<string, string> = {}
  attendance.forEach(a => { attendanceMap[a.class_date] = a.status })

  const classDays = [1, 3, 5]
  const year = today.getFullYear()
  const mon = today.getMonth()
  const daysInMonth = new Date(year, mon + 1, 0).getDate()
  const firstDay = new Date(year, mon, 1).getDay()
  const offset = firstDay === 0 ? 6 : firstDay - 1

  const cells: (number | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const getStatus = (day: number) => {
    const date = `${year}-${String(mon + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    const dow = new Date(date).getDay()
    const isClassDay = classDays.includes(dow === 0 ? 6 : dow - 1 < 0 ? 6 : new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1)
    if (!isClassDay) return 'noclass'
    if (attendanceMap[date]) return attendanceMap[date]
    if (new Date(date) > today) return 'upcoming'
    return 'noclass'
  }

  const presentCount = attendance.filter(a => a.status === 'present').length
  const absentCount = attendance.filter(a => a.status === 'absent').length

  const monthName = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900">My classes</h1>
        <p className="text-sm text-gray-500">{student?.name} - {student?.reg_number}</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <p className="text-sm font-medium text-blue-800">Next class</p>
        <p className="text-xs text-blue-600 mt-1">Mon, Wed, Fri - 4:00 PM to 5:30 PM</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">{monthName}</h2>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>Present</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>Absent</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-300 inline-block"></span>Upcoming</span>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {['M','T','W','T','F','S','S'].map((d,i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-0.5 mb-0.5">
            {week.map((day, di) => {
              if (!day) return <div key={di} />
              const status = getStatus(day)
              const isToday = day === today.getDate()
              const baseClass = 'aspect-square flex flex-col items-center justify-center rounded-lg text-xs relative'
              const statusClass =
                status === 'present' ? 'bg-green-100' :
                status === 'absent' ? 'bg-red-100' :
                status === 'leave' ? 'bg-amber-100' :
                status === 'upcoming' ? 'bg-blue-50' :
                'bg-transparent'
              const dotColor =
                status === 'present' ? 'bg-green-500' :
                status === 'absent' ? 'bg-red-400' :
                status === 'leave' ? 'bg-amber-400' :
                status === 'upcoming' ? 'bg-blue-300' : ''
              return (
                <div key={di} className={`${baseClass} ${statusClass} ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
                  <span className={`font-medium ${status === 'present' ? 'text-green-700' : status === 'absent' ? 'text-red-700' : status === 'leave' ? 'text-amber-700' : 'text-gray-600'}`}>
                    {day}
                  </span>
                  {dotColor && <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-0.5`}></span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-xl font-semibold text-green-700">{presentCount}</p>
          <p className="text-xs text-green-600 mt-0.5">Present</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-xl font-semibold text-red-700">{absentCount}</p>
          <p className="text-xs text-red-600 mt-0.5">Absent</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-xl font-semibold text-blue-700">
            {attendance.length > 0 ? Math.round(presentCount / attendance.length * 100) : 0}%
          </p>
          <p className="text-xs text-blue-600 mt-0.5">Attendance</p>
        </div>
      </div>
    </div>
  )
}
