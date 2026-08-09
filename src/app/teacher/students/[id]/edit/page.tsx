'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Info } from 'lucide-react'
import api from '@/lib/api'

interface School { id: string; name: string }
interface Batch { id: string; name: string; days: number[]; start_time: string; end_time: string }

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function sessionHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60
}

function sessionsPerMonth(days: number[]): number {
  return Math.round(days.length * 4.33 * 10) / 10
}

export default function EditStudentPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [schools, setSchools] = useState<School[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    reg_number: '',
    name: '',
    mobile: '',
    parent_name: '',
    school_name: '',
    school_id: '',
    grade: '',
    mode: 'online',
    batch_id: '',
    // fee
    fee_type: 'fixed' as 'fixed' | 'hourly',
    monthly_fee: '',
    hourly_rate: '',
    hours_per_month: '',   // manual override only
    payment_cycle: 'monthly',
    due_day: '5',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    Promise.all([
      api.get('/api/students'),
      api.get('/api/schools'),
      api.get('/api/batches'),
    ]).then(([s, sc, b]) => {
      const student = s.data.find((st: { id: string }) => st.id === id)
      if (student) {
        const feeType = student.fee_type ?? 'fixed'
        setForm({
          reg_number: student.reg_number ?? '',
          name: student.name ?? '',
          mobile: student.mobile ?? '',
          parent_name: student.parent_name ?? '',
          school_name: student.school_name ?? '',
          school_id: student.school_id ?? '',
          grade: student.grade ?? '',
          mode: student.mode ?? 'online',
          batch_id: student.batch_id ?? '',
          fee_type: feeType,
          monthly_fee: feeType === 'fixed' ? String(student.monthly_fee ?? '') : '',
          hourly_rate: student.hourly_rate != null ? String(student.hourly_rate) : '',
          // Only pre-fill override if it differs from what the batch would auto-compute
          // We'll store it blank and let auto-compute take over; user can override
          hours_per_month: student.hours_per_month != null ? String(student.hours_per_month) : '',
          payment_cycle: student.payment_cycle ?? 'monthly',
          due_day: String(student.due_day ?? '5'),
        })
      }
      setSchools(sc.data)
      setBatches(b.data)
    }).finally(() => setLoading(false))
  }, [id])

  const selectedBatch = useMemo(
    () => batches.find(b => b.id === form.batch_id) ?? null,
    [batches, form.batch_id]
  )

  const autoHoursPerMonth = useMemo(() => {
    if (!selectedBatch) return null
    const hrs = sessionHours(selectedBatch.start_time, selectedBatch.end_time)
    const sessions = sessionsPerMonth(selectedBatch.days)
    return Math.round(hrs * sessions * 10) / 10
  }, [selectedBatch])

  const effectiveHours = useMemo(() => {
    if (form.hours_per_month) return parseFloat(form.hours_per_month)
    return autoHoursPerMonth
  }, [form.hours_per_month, autoHoursPerMonth])

  const calculatedMonthlyFee = useMemo(() => {
    if (form.fee_type !== 'hourly') return null
    if (!form.hourly_rate || !effectiveHours) return null
    return Math.round(parseFloat(form.hourly_rate) * effectiveHours)
  }, [form.fee_type, form.hourly_rate, effectiveHours])

  const handleSchoolChange = (sid: string) => {
    const school = schools.find(s => s.id === sid)
    set('school_id', sid)
    set('school_name', school?.name ?? '')
  }

  const handleBatchChange = (bid: string) => {
    setForm(f => ({ ...f, batch_id: bid, hours_per_month: '' }))
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (!form.name || !form.mobile) {
      setError('Name and mobile are required.')
      return
    }
    if (form.fee_type === 'hourly' && !form.hourly_rate) {
      setError('Please enter the hourly rate.')
      return
    }
    if (form.fee_type === 'hourly' && !effectiveHours) {
      setError('Please select a batch or enter hours per month.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        reg_number: form.reg_number,
        name: form.name,
        mobile: form.mobile,
        parent_name: form.parent_name || null,
        school_name: form.school_name || null,
        school_id: form.school_id || null,
        grade: form.grade || null,
        mode: form.mode,
        batch_id: form.batch_id || null,
        fee_type: form.fee_type,
        hourly_rate: form.fee_type === 'hourly' ? parseFloat(form.hourly_rate) : null,
        hours_per_month: form.fee_type === 'hourly' ? (effectiveHours ?? null) : null,
        monthly_fee: form.fee_type === 'fixed'
          ? parseFloat(form.monthly_fee) || 0
          : (calculatedMonthlyFee ?? 0),
        payment_cycle: form.payment_cycle,
        due_day: parseInt(form.due_day),
      }
      await api.patch(`/api/students/${id}`, payload)
      setSuccess('Student updated successfully.')
      setTimeout(() => router.push('/teacher/students'), 1200)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  const batchInfo = selectedBatch ? (() => {
    const days = selectedBatch.days.map(d => DAY_NAMES[d]).join(', ')
    const start = selectedBatch.start_time.slice(0, 5)
    const end = selectedBatch.end_time.slice(0, 5)
    const hrs = sessionHours(selectedBatch.start_time, selectedBatch.end_time)
    const sessions = sessionsPerMonth(selectedBatch.days)
    return `${days} · ${start}–${end} · ${hrs}h/session · ~${sessions} sessions/month`
  })() : null

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-400 text-sm">Loading student...</p>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.push('/teacher/students')}
          className="text-sm text-gray-500 hover:text-gray-700">
          Back to students
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Edit student</h1>
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}

      {/* Personal details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Personal details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Registration number">
            <input className={inp} value={form.reg_number} onChange={e => set('reg_number', e.target.value)} />
          </Field>
          <Field label="Student name *">
            <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Mobile number *">
            <input className={inp} value={form.mobile} onChange={e => set('mobile', e.target.value)} />
          </Field>
          <Field label="Parent name">
            <input className={inp} value={form.parent_name} onChange={e => set('parent_name', e.target.value)} />
          </Field>
          <Field label="School">
            <select className={inp} value={form.school_id} onChange={e => handleSchoolChange(e.target.value)}>
              <option value="">Select school</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Grade">
            <select className={inp} value={form.grade} onChange={e => set('grade', e.target.value)}>
              <option value="">Select grade</option>
              {['Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12','Other'].map(g => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Mode of class">
            <select className={inp} value={form.mode} onChange={e => set('mode', e.target.value)}>
              <option value="online">Online</option>
              <option value="direct">Direct (in-person)</option>
            </select>
          </Field>
          <Field label="Batch">
            <select className={inp} value={form.batch_id} onChange={e => handleBatchChange(e.target.value)}>
              <option value="">No batch</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.days.map((d: number) => DAY_NAMES[d]).join(', ')} {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* Fee details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Fee details</h2>

        {/* Fee type toggle */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-600 mb-2">Fee structure</label>
          <div className="flex gap-2">
            {(['fixed', 'hourly'] as const).map(type => (
              <button
                key={type}
                onClick={() => set('fee_type', type)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  form.fee_type === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {type === 'fixed' ? '📅 Fixed monthly fee' : '⏱ Hourly rate'}
              </button>
            ))}
          </div>
        </div>

        {form.fee_type === 'fixed' ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly fee (Rs.) *">
              <input className={inp} placeholder="e.g. 1800" type="number" min="0"
                value={form.monthly_fee} onChange={e => set('monthly_fee', e.target.value)} />
            </Field>
            <Field label="Payment cycle">
              <select className={inp} value={form.payment_cycle} onChange={e => set('payment_cycle', e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="half-yearly">Half-yearly</option>
                <option value="annual">Annual</option>
              </select>
            </Field>
            <Field label="Fee due day">
              <select className={inp} value={form.due_day} onChange={e => set('due_day', e.target.value)}>
                {['1','5','10','15','20'].map(d => (
                  <option key={d} value={d}>{d}{d === '1' ? 'st' : 'th'} of month</option>
                ))}
              </select>
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Hourly rate (Rs.) *">
                <input className={inp} placeholder="e.g. 500" type="number" min="0"
                  value={form.hourly_rate} onChange={e => set('hourly_rate', e.target.value)} />
              </Field>
              <Field label={
                <span className="flex items-center gap-1">
                  Hours per month
                  <span title="Auto-calculated from batch schedule. Override if needed." className="cursor-help">
                    <Info className="w-3 h-3 text-gray-400" />
                  </span>
                </span>
              }>
                <input
                  className={inp}
                  placeholder={autoHoursPerMonth ? `Auto: ${autoHoursPerMonth}h` : 'e.g. 12'}
                  type="number" min="0" step="0.5"
                  value={form.hours_per_month}
                  onChange={e => set('hours_per_month', e.target.value)}
                />
              </Field>
            </div>

            {batchInfo && (
              <div className="px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{batchInfo}</span>
              </div>
            )}

            {/* Calculated fee card */}
            <div className={`rounded-xl border p-4 ${calculatedMonthlyFee ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Calculated monthly fee</p>
                  {calculatedMonthlyFee ? (
                    <p className="text-2xl font-bold text-green-700">
                      ₹{calculatedMonthlyFee.toLocaleString('en-IN')}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Enter rate + hours to calculate</p>
                  )}
                </div>
                {calculatedMonthlyFee && effectiveHours && form.hourly_rate && (
                  <div className="text-right text-xs text-green-600">
                    <p>₹{form.hourly_rate}/hr × {effectiveHours}h</p>
                    <p className="text-gray-400 mt-0.5">
                      {form.hours_per_month ? 'manual override' : 'auto from batch'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Payment cycle">
                <select className={inp} value={form.payment_cycle} onChange={e => set('payment_cycle', e.target.value)}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half-yearly">Half-yearly</option>
                  <option value="annual">Annual</option>
                </select>
              </Field>
              <Field label="Fee due day">
                <select className={inp} value={form.due_day} onChange={e => set('due_day', e.target.value)}>
                  {['1','5','10','15','20'].map(d => (
                    <option key={d} value={d}>{d}{d === '1' ? 'st' : 'th'} of month</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={() => router.push('/teacher/students')}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving}
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
