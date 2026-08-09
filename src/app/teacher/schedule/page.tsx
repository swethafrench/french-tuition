'use client'

import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, Plus, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'

interface Batch {
  id: string
  name: string
  days: number[]
  start_time: string
  end_time: string
  student_count?: number
}

interface Student {
  id: string
  name: string
  reg_number: string
  batch_id: string | null
  mode: string
}

interface BatchOverride {
  id: string
  student_id: string
  batch_id: string
  override_date: string
  note: string
  students: { name: string; reg_number: string }
  batches: { name: string; start_time: string; end_time: string }
}

interface BatchStudentDetail {
  id: string
  name: string
  reg_number: string
  mode: string
  is_override?: boolean
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const BATCH_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', dot: 'bg-purple-500' },
  { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300', dot: 'bg-rose-500' },
]

export default function SchedulePage() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  // Use refs to always have latest data in event handlers
  const studentsRef = useRef<Student[]>([])
  const overridesRef = useRef<BatchOverride[]>([])
  const monthStrRef = useRef('')

  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [batchStudents, setBatchStudents] = useState<BatchStudentDetail[]>([])
  const [showAddOverride, setShowAddOverride] = useState(false)
  const [overrideStudentId, setOverrideStudentId] = useState('')
  const [overrideNote, setOverrideNote] = useState('')
  const [overrideDate, setOverrideDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [availableForOverride, setAvailableForOverride] = useState<Student[]>([])

  const month = currentDate.getMonth()
  const year = currentDate.getFullYear()
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  useEffect(() => {
    monthStrRef.current = monthStr
    loadData()
  }, [monthStr])

  const loadData = async () => {
    const ms = monthStrRef.current
    const [{ data: b }, studentsRes, overrideRes] = await Promise.all([
      supabase.from('batch_student_counts').select('*'),
      api.get('/api/students-with-batch'),
      api.get('/api/batch-overrides', { params: { month: ms } }),
    ])
    setBatches(b ?? [])
    studentsRef.current = studentsRes.data ?? []
    overridesRef.current = overrideRes.data ?? []
    setLoading(false)
  }

  const getBatchColor = (batchId: string, batchList: Batch[]) => {
    const idx = batchList.findIndex(b => b.id === batchId) % BATCH_COLORS.length
    return BATCH_COLORS[idx >= 0 ? idx : 0]
  }

  const getBatchesForDay = (date: Date, batchList: Batch[]) => {
    const dow = date.getDay() === 0 ? 6 : date.getDay() - 1
    const dateStr = date.toISOString().split('T')[0]
    const regularBatches = batchList.filter(b => b.days.includes(dow))
    const overrideBatchIds = overridesRef.current
      .filter(o => o.override_date === dateStr)
      .map(o => o.batch_id)
    const overrideBatches = batchList.filter(b =>
      overrideBatchIds.includes(b.id) && !regularBatches.find(rb => rb.id === b.id)
    )
    return [...regularBatches, ...overrideBatches]
  }

  const openBatchPopup = (date: Date, batch: Batch) => {
    const s = studentsRef.current
    const o = overridesRef.current
    const dateStr = date.toISOString().split('T')[0]
    const dow = date.getDay() === 0 ? 6 : date.getDay() - 1
    const isRegularDay = batch.days.includes(dow)

    const regularStudents: BatchStudentDetail[] = isRegularDay
      ? s.filter(st => st.batch_id === batch.id).map(st => ({ ...st, is_override: false }))
      : []

    const overrideStudents: BatchStudentDetail[] = o
      .filter(ov => ov.override_date === dateStr && ov.batch_id === batch.id)
      .map(ov => ({
        id: ov.student_id,
        name: ov.students.name,
        reg_number: ov.students.reg_number,
        mode: '',
        is_override: true,
      }))

    const allIds = new Set(regularStudents.map(st => st.id))
    const uniqueOverrides = overrideStudents.filter(st => !allIds.has(st.id))
    const combined = [...regularStudents, ...uniqueOverrides]

    setSelectedDay(date)
    setSelectedBatch(batch)
    setBatchStudents(combined)
    setAvailableForOverride(s.filter(st => !combined.find(bs => bs.id === st.id)))
    setOverrideDate(dateStr)
    setShowAddOverride(false)
    setOverrideStudentId('')
    setOverrideNote('')
  }

  const handleAddOverride = async () => {
    if (!overrideStudentId || !selectedBatch) return
    setSaving(true)
    try {
      await api.post('/api/batch-overrides', {
        student_id: overrideStudentId,
        batch_id: selectedBatch.id,
        override_date: overrideDate,
        note: overrideNote,
      })
      await loadData()
      openBatchPopup(selectedDay!, selectedBatch)
      setShowAddOverride(false)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveOverride = async (studentId: string) => {
    const override = overridesRef.current.find(o => o.student_id === studentId && o.override_date === overrideDate)
    if (!override) return
    await api.delete('/api/batch-overrides', { data: { id: override.id } })
    await loadData()
    openBatchPopup(selectedDay!, selectedBatch!)
  }

  const navigate = (dir: number) => {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    setCurrentDate(d)
    setSelectedBatch(null)
  }

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const cells: (number | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const getWeekDates = () => {
    const d = new Date(currentDate)
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
    d.setDate(d.getDate() - dow)
    return Array(7).fill(0).map((_, i) => { const dd = new Date(d); dd.setDate(d.getDate() + i); return dd })
  }

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const getNavLabel = () => {
    if (view === 'month') return `${MONTH_NAMES[month]} ${year}`
    if (view === 'week') {
      const wk = getWeekDates()
      return `${wk[0].getDate()} ${MONTH_NAMES[wk[0].getMonth()]} - ${wk[6].getDate()} ${MONTH_NAMES[wk[6].getMonth()]} ${year}`
    }
    return `${currentDate.getDate()} ${MONTH_NAMES[month]} ${year}`
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-400 text-sm">Loading schedule...</p>
    </div>
  )

  return (
    <div className="p-6 relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Class schedule</h1>
          <p className="text-sm text-gray-500 mt-1">Manage batches and class allocations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {batches.map((b, i) => {
              const c = BATCH_COLORS[i % BATCH_COLORS.length]
              return (
                <span key={b.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
                  <span className={`w-2 h-2 rounded-full ${c.dot}`}></span>
                  {b.name} ({b.student_count ?? 0})
                </span>
              )
            })}
          </div>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {(['month','week','day'] as const).map(v => (
              <button key={v} onClick={() => { setView(v); setSelectedBatch(null) }}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${view === v ? 'bg-[#0f2044] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-base font-semibold text-gray-900 min-w-48 text-center">{getNavLabel()}</h2>
        <button onClick={() => navigate(1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
          <ChevronRight size={16} />
        </button>
        <button onClick={() => { setCurrentDate(new Date()); setSelectedBatch(null) }}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Today
        </button>
      </div>

      {/* MONTH VIEW */}
      {view === 'month' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
              {week.map((day, di) => {
                if (!day) return <div key={di} className="min-h-24 border-r border-gray-100 last:border-0 bg-gray-50/50" />
                const date = new Date(year, month, day)
                const dateStr = date.toISOString().split('T')[0]
                const isToday = dateStr === todayStr
                const dayBatches = getBatchesForDay(date, batches)
                return (
                  <div key={di} className={`min-h-24 border-r border-gray-100 last:border-0 p-1.5 ${isToday ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#0f2044] text-white' : 'text-gray-700'}`}>
                      {day}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {dayBatches.map(b => {
                        const c = getBatchColor(b.id, batches)
                        return (
                          <button key={b.id} onClick={() => openBatchPopup(date, b)}
                            className={`w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate ${c.bg} ${c.text} hover:opacity-80`}>
                            {b.name} · {b.student_count ?? 0}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {getWeekDates().map((date, i) => {
              const isToday = date.toISOString().split('T')[0] === todayStr
              return (
                <div key={i} className={`py-3 text-center border-r border-gray-100 last:border-0 ${isToday ? 'bg-blue-50' : ''}`}>
                  <p className="text-xs text-gray-500">{DAY_NAMES[i]}</p>
                  <p className={`text-lg font-semibold mt-0.5 ${isToday ? 'text-[#0f2044]' : 'text-gray-800'}`}>{date.getDate()}</p>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-7 min-h-48">
            {getWeekDates().map((date, i) => {
              const isToday = date.toISOString().split('T')[0] === todayStr
              const dayBatches = getBatchesForDay(date, batches)
              return (
                <div key={i} className={`border-r border-gray-100 last:border-0 p-2 ${isToday ? 'bg-blue-50/30' : ''}`}>
                  {dayBatches.map(b => {
                    const c = getBatchColor(b.id, batches)
                    return (
                      <button key={b.id} onClick={() => openBatchPopup(date, b)}
                        className={`w-full text-left p-2 rounded-lg mb-1.5 ${c.bg} ${c.text} hover:opacity-80`}>
                        <p className="text-xs font-semibold">{b.name}</p>
                        <p className="text-xs opacity-75">{b.start_time.slice(0,5)} - {b.end_time.slice(0,5)}</p>
                        <p className="text-xs opacity-75 flex items-center gap-1"><Users size={10} />{b.student_count ?? 0}</p>
                      </button>
                    )
                  })}
                  {dayBatches.length === 0 && <p className="text-xs text-gray-300 text-center mt-4">No class</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {view === 'day' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className={`px-5 py-4 border-b border-gray-100 ${currentDate.toISOString().split('T')[0] === todayStr ? 'bg-blue-50' : ''}`}>
            <h3 className="font-semibold text-gray-900">
              {FULL_DAY_NAMES[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]}, {currentDate.getDate()} {MONTH_NAMES[month]} {year}
            </h3>
          </div>
          <div className="p-4">
            {getBatchesForDay(currentDate, batches).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No classes scheduled for this day.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {getBatchesForDay(currentDate, batches).map(b => {
                  const c = getBatchColor(b.id, batches)
                  return (
                    <button key={b.id} onClick={() => openBatchPopup(currentDate, b)}
                      className={`w-full text-left p-4 rounded-xl border ${c.bg} ${c.text} ${c.border} hover:opacity-90`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-base">{b.name}</p>
                          <p className="text-sm opacity-80 mt-0.5">{b.start_time.slice(0,5)} - {b.end_time.slice(0,5)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <Users size={16} />{b.student_count ?? 0} students
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BATCH DETAIL SIDE PANEL */}
      {selectedBatch && selectedDay && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setSelectedBatch(null)}>
          <div className="bg-white h-full w-96 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className={`px-5 py-4 border-b border-gray-100 ${getBatchColor(selectedBatch.id, batches).bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-semibold text-lg ${getBatchColor(selectedBatch.id, batches).text}`}>{selectedBatch.name}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {selectedDay.getDate()} {MONTH_NAMES[selectedDay.getMonth()]} {selectedDay.getFullYear()}
                  </p>
                </div>
                <button onClick={() => setSelectedBatch(null)} className="p-1.5 rounded-lg hover:bg-white/50">
                  <X size={18} />
                </button>
              </div>
              <div className="flex gap-4 mt-3 text-sm text-gray-700">
                <span>🕓 {selectedBatch.start_time.slice(0,5)} - {selectedBatch.end_time.slice(0,5)}</span>
                <span>👥 {batchStudents.length} students</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Students</p>
                <button onClick={() => setShowAddOverride(v => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#0f2044] text-white rounded-lg hover:bg-blue-900">
                  <Plus size={12} /> Add for today
                </button>
              </div>

              {batchStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No students in this batch yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {batchStudents.map(s => (
                    <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border ${s.is_override ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {s.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.reg_number}</p>
                      </div>
                      {s.is_override ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">One-time</span>
                          <button onClick={() => handleRemoveOverride(s.id)} className="text-red-400 hover:text-red-600">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Regular</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {showAddOverride && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Add student for this day only</p>
                  <p className="text-xs text-gray-400 mb-3">{selectedBatch.name} · {overrideDate}</p>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Select student</label>
                      <select
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={overrideStudentId}
                        onChange={e => setOverrideStudentId(e.target.value)}
                      >
                        <option value="">Choose a student</option>
                        {availableForOverride.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.reg_number})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
                      <input
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Make-up class, rescheduled"
                        value={overrideNote}
                        onChange={e => setOverrideNote(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddOverride(false)}
                        className="flex-1 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">
                        Cancel
                      </button>
                      <button onClick={handleAddOverride} disabled={saving || !overrideStudentId}
                        className="flex-1 py-2 text-sm font-medium text-white bg-[#0f2044] rounded-lg hover:bg-blue-900 disabled:opacity-50">
                        {saving ? 'Adding...' : 'Add student'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
