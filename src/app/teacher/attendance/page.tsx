'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Check } from 'lucide-react'
import api from '@/lib/api'
import { Student } from '@/types'

type Status = 'present' | 'absent' | 'leave' | null

interface AttendanceRecord {
  student: Student
  status: Status
  savedStatus: Status   // what's in DB (null = not submitted yet)
}

interface Batch {
  id: string; name: string; days: number[]
  start_time: string; end_time: string
}

// Returns local YYYY-MM-DD for a Date object
function toLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay())
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)   // true when editing already-submitted day
  const [isSubmitted, setIsSubmitted] = useState(false) // true when this date's attendance is in DB
  const [batches, setBatches] = useState<Batch[]>([])
  const [scheduledBatchNames, setScheduledBatchNames] = useState<string[]>([])
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const dateStr = toLocal(selectedDate)
  const dayOfWeek = selectedDate.getDay() // 0=Sun,1=Mon...
  const today = startOfDay()
  const isToday = toLocal(selectedDate) === toLocal(today)
  const isFuture = selectedDate > today

  const displayDate = selectedDate.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  // Fetch batches once
  useEffect(() => {
    api.get('/api/batches').then(res => setBatches(res.data))
  }, [])

  const loadDay = useCallback(async (date: Date) => {
    setLoading(true)
    setError('')
    setSuccessMsg('')
    setEditMode(false)

    const ds = toLocal(date)
    const dow = date.getDay()

    try {
      const [studRes, attRes] = await Promise.all([
        api.get('/api/students'),
        api.get(`/api/attendance?date=${ds}`)
      ])

      const allStudents: Student[] = studRes.data
      const attMap: Record<string, Status> = {}
      for (const a of attRes.data) {
        attMap[a.student_id] = a.status
      }

      // Find batches scheduled on this day
      const todayBatches = batches.filter(b => b.days.includes(dow))
      setScheduledBatchNames(todayBatches.map(b => b.name))

      // If batches exist for today, filter students to those batches;
      // otherwise show all students
      let filtered = allStudents
      if (todayBatches.length > 0) {
        const batchIds = new Set(todayBatches.map(b => b.id))
        filtered = allStudents.filter(s => (s as Student & { batch_id?: string }).batch_id && batchIds.has((s as Student & { batch_id?: string }).batch_id!))
        // If no students match (e.g. batch not assigned), fall back to all
        if (filtered.length === 0) filtered = allStudents
      }

      const hasSubmitted = attRes.data.length > 0
      setIsSubmitted(hasSubmitted)

      setRecords(filtered.map(s => ({
        student: s,
        status: attMap[s.id] ?? null,
        savedStatus: attMap[s.id] ?? null,
      })))
    } catch {
      setError('Failed to load attendance data.')
    } finally {
      setLoading(false)
    }
  }, [batches])

  // Reload when date or batches change
  useEffect(() => {
    if (batches.length >= 0) loadDay(selectedDate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, batches])

  const navigate = (dir: -1 | 1) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + dir)
    // Skip Sundays
    if (d.getDay() === 0) d.setDate(d.getDate() + dir)
    setSelectedDate(d)
  }

  const setStatus = (id: string, status: Status) => {
    setRecords(r => r.map(rec =>
      rec.student.id === id ? { ...rec, status } : rec
    ))
    setSuccessMsg('')
  }

  const markAll = (status: Status) => {
    setRecords(r => r.map(rec => ({ ...rec, status })))
    setSuccessMsg('')
  }

  const handleSubmit = async () => {
    const unmarked = records.filter(r => r.status === null)
    if (unmarked.length > 0) {
      setError(`${unmarked.length} student(s) not marked. Please mark all before submitting.`)
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
      setIsSubmitted(true)
      setEditMode(false)
      setRecords(r => r.map(rec => ({ ...rec, savedStatus: rec.status })))
      setSuccessMsg(editMode ? 'Attendance updated successfully.' : 'Attendance saved successfully.')
    } catch {
      setError('Failed to save attendance. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = () => {
    setEditMode(true)
    setSuccessMsg('')
    setError('')
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    setRecords(r => r.map(rec => ({ ...rec, status: rec.savedStatus })))
    setError('')
  }

  const presentCount = records.filter(r => (isSubmitted && !editMode ? r.savedStatus : r.status) === 'present').length
  const absentCount  = records.filter(r => (isSubmitted && !editMode ? r.savedStatus : r.status) === 'absent').length
  const leaveCount   = records.filter(r => (isSubmitted && !editMode ? r.savedStatus : r.status) === 'leave').length
  const unmarkedCount = records.filter(r => r.status === null).length

  const canEdit = isSubmitted && !editMode && !isFuture
  const showMarkingUI = !isSubmitted || editMode

  return (
    <div className="p-6 max-w-3xl">
      {/* Header + Date Navigator */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mark attendance</h1>
          <p className="text-sm text-gray-500 mt-1">{displayDate}</p>
          {scheduledBatchNames.length > 0 && (
            <p className="text-xs text-blue-600 mt-0.5">
              Scheduled: {scheduledBatchNames.join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1.5">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            title="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-gray-700 px-2 min-w-[80px] text-center">
            {isToday ? 'Today' : selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
          <button
            onClick={() => navigate(1)}
            disabled={isToday}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(startOfDay())}
              className="ml-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      {successMsg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Future date notice */}
      {isFuture && !loading && (
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          You can only mark attendance for today or past dates.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      ) : (
        <>
          {/* Stats */}
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

          {/* Student list */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  {isSubmitted && !editMode
                    ? 'Attendance submitted'
                    : unmarkedCount > 0
                    ? `${unmarkedCount} student${unmarkedCount > 1 ? 's' : ''} not marked`
                    : 'All students marked'}
                </h2>
                {isSubmitted && !editMode && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <Check className="w-3 h-3" /> Done
                  </span>
                )}
                {editMode && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Editing
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {showMarkingUI && !isFuture && (
                  <>
                    <button onClick={() => markAll('present')} className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                      Mark all present
                    </button>
                    <button onClick={() => markAll('absent')} className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                      Mark all absent
                    </button>
                  </>
                )}
                {canEdit && (
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Pencil className="w-3 h-3" /> Edit attendance
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {records.map(({ student, status, savedStatus }) => {
                const displayStatus = isSubmitted && !editMode ? savedStatus : status
                return (
                  <div key={student.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.school_name} · {student.grade} · {student.mode}</p>
                    </div>

                    {/* View-only pill when submitted and not editing */}
                    {isSubmitted && !editMode ? (
                      <StatusPill status={displayStatus} />
                    ) : isFuture ? (
                      <span className="text-xs text-gray-400 italic">Future date</span>
                    ) : (
                      <div className="flex gap-2">
                        <StatusBtn label="Present" active={status === 'present'}
                          activeClass="bg-green-600 text-white border-green-600"
                          inactiveClass="border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600"
                          onClick={() => setStatus(student.id, 'present')} />
                        <StatusBtn label="Absent" active={status === 'absent'}
                          activeClass="bg-red-600 text-white border-red-600"
                          inactiveClass="border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600"
                          onClick={() => setStatus(student.id, 'absent')} />
                        <StatusBtn label="Leave" active={status === 'leave'}
                          activeClass="bg-amber-500 text-white border-amber-500"
                          inactiveClass="border-gray-300 text-gray-600 hover:border-amber-400 hover:text-amber-600"
                          onClick={() => setStatus(student.id, 'leave')} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer actions */}
            {!isFuture && (
              <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
                {editMode && (
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                )}
                {showMarkingUI && (
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editMode ? 'Update attendance' : 'Submit attendance'}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: Status }) {
  if (!status) return <span className="text-xs text-gray-400 italic">—</span>
  const map = {
    present: 'bg-green-100 text-green-700',
    absent:  'bg-red-100 text-red-700',
    leave:   'bg-amber-100 text-amber-700',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${map[status]}`}>
      {status}
    </span>
  )
}

function StatusBtn({ label, active, activeClass, inactiveClass, onClick }: {
  label: string; active: boolean
  activeClass: string; inactiveClass: string; onClick: () => void
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
