'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'

interface School { id: string; name: string }
interface Batch { id: string; name: string; days: number[]; start_time: string; end_time: string }

const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

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
    monthly_fee: '',
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
          monthly_fee: String(student.monthly_fee ?? ''),
          payment_cycle: student.payment_cycle ?? 'monthly',
          due_day: String(student.due_day ?? '5'),
        })
      }
      setSchools(sc.data)
      setBatches(b.data)
    }).finally(() => setLoading(false))
  }, [id])

  const handleSchoolChange = (sid: string) => {
    const school = schools.find(s => s.id === sid)
    set('school_id', sid)
    set('school_name', school?.name ?? '')
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (!form.name || !form.mobile) {
      setError('Name and mobile are required.')
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
        monthly_fee: parseFloat(form.monthly_fee) || 0,
        payment_cycle: form.payment_cycle,
        due_day: parseInt(form.due_day),
      }
      await api.patch(`/api/students/${id}`, payload)
      setSuccess('Student updated successfully.')
      setTimeout(() => router.push('/teacher/students'), 1000)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-400 text-sm">Loading student...</p>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.push('/teacher/students')} className="text-sm text-gray-500 hover:text-gray-700">
          Back to students
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Edit student</h1>
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}

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
              {['Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'].map(g => (
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
            <select className={inp} value={form.batch_id} onChange={e => set('batch_id', e.target.value)}>
              <option value="">No batch</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} - {b.days.map((d: number) => DAY_NAMES[d]).join(',')} {b.start_time.slice(0,5)} to {b.end_time.slice(0,5)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Fee details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Monthly fee (Rs.)">
            <input className={inp} type="number" value={form.monthly_fee} onChange={e => set('monthly_fee', e.target.value)} />
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
                <option key={d} value={d}>{d}th of month</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={() => router.push('/teacher/students')} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
