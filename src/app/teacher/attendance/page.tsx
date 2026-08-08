'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Student } from '@/types'

type Status = 'present' | 'absent' | 'leave' | null

interface AttendanceRecord {
  student: Student
  status: Status
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const displayDate = today.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  useEffect(() => {
    api.get('/api/students').then(res => {
      setRecords(res.data.map((s: Student) => ({ student: s, status: null })))
    }).finally(() => setLoading(false))
  }, [])

  const setStatus = (id: string, status: Status) => {
    setRecords(r => r.map(rec =>
      rec.student.id === id ? { ...rec, status } : rec
    ))
    setSaved(false)
  }

  const markAll = (status: Status) => {
    setRecords(r => r.map(rec => ({ ...rec, status })))
    setSaved(false)
  }

  const handleSubmit = async () => {
    const unmarked = records.filter(r => r.status === null)
    if (unmarked.length > 0) {
      setError(unmarked.length + ' student(s) not marked yet. Please mark all students before submitting.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await api.post('/api/attendance/bulk', {
        records: records.map(r => ({
          student_id: r.student.id,
          class_date: dateStr,
          status: r.status,
        }))
      })
      setSaved(true)
    } catch {
      setError('Failed to save attendance. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const presentCount = records.filter(r => r.status === 'present').length
  const absentCount = records.filter(r => r.status === 'absent').length
  const leaveCount = records.filter(r => r.status === 'leave').length
  const unmarkedCount = records.filter(r => r.status === null).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400 text-sm">Loading students...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Mark attendance</h1>
        <p className="text-sm text-gray-500 mt-1">{displayDate}</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Attendance saved successfully for {displayDate}.
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{records.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <p className="text-2xl font-semibold text-green-700">{presentCount}</p>
          <p className="text-xs text-green-600 mt-1">Present</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
          <p className="text-2xl font-semibold text-red-700">{absentCount}</p>
          <p className="text-xs text-red-600 mt-1">Absent</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
          <p className="text-2xl font-semibold text-amber-700">{leaveCount}</p>
          <p className="text-xs text-amber-600 mt-1">On leave</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {unmarkedCount > 0 ? unmarkedCount + ' students not marked' : 'All students marked'}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => markAll('present')} className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
              Mark all present
            </button>
            <button onClick={() => markAll('absent')} className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
              Mark all absent
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {records.map(({ student, status }) => (
            <div key={student.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{student.name}</p>
                <p className="text-xs text-gray-400">{student.school_name} - {student.grade} - {student.mode}</p>
              </div>
              <div className="flex gap-2">
                <StatusBtn
                  label="Present"
                  active={status === 'present'}
                  activeClass="bg-green-600 text-white border-green-600"
                  inactiveClass="border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600"
                  onClick={() => setStatus(student.id, 'present')}
                />
                <StatusBtn
                  label="Absent"
                  active={status === 'absent'}
                  activeClass="bg-red-600 text-white border-red-600"
                  inactiveClass="border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600"
                  onClick={() => setStatus(student.id, 'absent')}
                />
                <StatusBtn
                  label="Leave"
                  active={status === 'leave'}
                  activeClass="bg-amber-500 text-white border-amber-500"
                  inactiveClass="border-gray-300 text-gray-600 hover:border-amber-400 hover:text-amber-600"
                  onClick={() => setStatus(student.id, 'leave')}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving || saved}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Submit attendance'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusBtn({ label, active, activeClass, inactiveClass, onClick }: {
  label: string
  active: boolean
  activeClass: string
  inactiveClass: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${active ? activeClass : inactiveClass}`}
    >
      {label}
    </button>
  )
}
