'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function RegisterStudentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    reg_number: 'FT-2026-00' + Math.floor(Math.random() * 900 + 100),
    name: '',
    mobile: '',
    parent_name: '',
    school_name: '',
    grade: '',
    mode: 'online',
    monthly_fee: '',
    payment_cycle: 'monthly',
    due_day: '5',
    passcode: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (!form.name || !form.mobile || !form.passcode) {
      setError('Name, mobile, and passcode are required.')
      return
    }
    if (form.passcode.length !== 4 || !/^\d+$/.test(form.passcode)) {
      setError('Passcode must be exactly 4 digits.')
      return
    }
    setLoading(true)
    try {
      await api.post('/api/students', {
        ...form,
        monthly_fee: parseFloat(form.monthly_fee) || 0,
        due_day: parseInt(form.due_day),
      })
      setSuccess('Student registered successfully!')
      setForm(f => ({ ...f, name: '', mobile: '', parent_name: '', school_name: '', grade: '', monthly_fee: '', passcode: '' }))
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Register new student</h1>
        <p className="text-sm text-gray-500 mt-1">Fill in the details to add a student to your tuition.</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Personal details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Registration number">
            <input className={input} value={form.reg_number} onChange={e => set('reg_number', e.target.value)} />
          </Field>
          <Field label="Student name *">
            <input className={input} placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Mobile number *">
            <input className={input} placeholder="+91 98765 43210" value={form.mobile} onChange={e => set('mobile', e.target.value)} />
          </Field>
          <Field label="Parent name">
            <input className={input} placeholder="Parent or guardian name" value={form.parent_name} onChange={e => set('parent_name', e.target.value)} />
          </Field>
          <Field label="School name">
            <input className={input} placeholder="School name" value={form.school_name} onChange={e => set('school_name', e.target.value)} />
          </Field>
          <Field label="Grade">
            <select className={input} value={form.grade} onChange={e => set('grade', e.target.value)}>
              <option value="">Select grade</option>
              {['Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'].map(g => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Mode of class">
            <select className={input} value={form.mode} onChange={e => set('mode', e.target.value)}>
              <option value="online">Online</option>
              <option value="direct">Direct (in-person)</option>
            </select>
          </Field>
          <Field label="Login passcode (4-digit PIN) *">
            <input className={input} placeholder="e.g. 1234" maxLength={4} value={form.passcode} onChange={e => set('passcode', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Fee details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Monthly fee (Rs.)">
            <input className={input} placeholder="e.g. 1800" type="number" value={form.monthly_fee} onChange={e => set('monthly_fee', e.target.value)} />
          </Field>
          <Field label="Payment cycle">
            <select className={input} value={form.payment_cycle} onChange={e => set('payment_cycle', e.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half-yearly">Half-yearly</option>
              <option value="annual">Annual</option>
            </select>
          </Field>
          <Field label="Fee due day">
            <select className={input} value={form.due_day} onChange={e => set('due_day', e.target.value)}>
              {['1','5','10','15','20'].map(d => (
                <option key={d} value={d}>{d + 'th of month'}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={() => router.push('/teacher/dashboard')} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register student'}
        </button>
      </div>
    </div>
  )
}

const input = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
