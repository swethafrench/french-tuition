'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Student } from '@/types'

interface FeeRecord {
  id: string
  student_id: string
  month: string
  amount: number
  paid_on: string | null
  payment_mode: string | null
  status: string
  students: { name: string; reg_number: string }
}

export default function FeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const currentMonth = new Date().toISOString().slice(0, 7)

  const [form, setForm] = useState({
    student_id: '',
    month: currentMonth,
    amount: '',
    paid_on: new Date().toISOString().split('T')[0],
    payment_mode: 'cash',
    status: 'paid',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    Promise.all([
      api.get('/api/fees', { params: { month: currentMonth } }),
      api.get('/api/students'),
    ]).then(([f, s]) => {
      setFees(f.data)
      setStudents(s.data)
    }).finally(() => setLoading(false))
  }, [])

  const handleRecord = async () => {
    if (!form.student_id || !form.amount) return
    setSaving(true)
    try {
      await api.post('/api/fees', {
        ...form,
        amount: parseFloat(form.amount),
      })
      setSuccess('Fee recorded successfully.')
      setShowForm(false)
      const r = await api.get('/api/fees', { params: { month: currentMonth } })
      setFees(r.data)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const paidCount = fees.filter(f => f.status === 'paid').length
  const pendingCount = students.length - paidCount
  const totalCollected = fees.filter(f => f.status === 'paid').reduce((a, f) => a + f.amount, 0)

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-400 text-sm">Loading fees...</p>
    </div>
  )

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Fee management</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Record payment'}
        </button>
      </div>

      {success && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Record fee payment</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Student</label>
              <select className={inp} value={form.student_id} onChange={e => set('student_id', e.target.value)}>
                <option value="">Select student</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.reg_number})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Month</label>
              <input className={inp} type="month" value={form.month} onChange={e => set('month', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (Rs.)</label>
              <input className={inp} type="number" placeholder="1800" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Paid on</label>
              <input className={inp} type="date" value={form.paid_on} onChange={e => set('paid_on', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment mode</label>
              <select className={inp} value={form.payment_mode} onChange={e => set('payment_mode', e.target.value)}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank transfer</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select className={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={handleRecord} disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save payment'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <p className="text-2xl font-semibold text-green-700">Rs. {totalCollected.toLocaleString('en-IN')}</p>
          <p className="text-xs text-green-600 mt-1">Collected this month</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{paidCount}</p>
          <p className="text-xs text-gray-500 mt-1">Fees paid</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
          <p className="text-2xl font-semibold text-red-700">{pendingCount}</p>
          <p className="text-xs text-red-600 mt-1">Pending / not recorded</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Payment records this month</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Student</th>
              <th className="text-left px-5 py-3 font-medium">Month</th>
              <th className="text-left px-5 py-3 font-medium">Amount</th>
              <th className="text-left px-5 py-3 font-medium">Paid on</th>
              <th className="text-left px-5 py-3 font-medium">Mode</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  No fee records this month. Click Record payment to add one.
                </td>
              </tr>
            ) : fees.map(f => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{f.students?.name}</p>
                  <p className="text-xs text-gray-400">{f.students?.reg_number}</p>
                </td>
                <td className="px-5 py-3 text-gray-600">{f.month}</td>
                <td className="px-5 py-3 font-medium text-gray-900">Rs. {f.amount?.toLocaleString('en-IN')}</td>
                <td className="px-5 py-3 text-gray-600">{f.paid_on ?? '-'}</td>
                <td className="px-5 py-3 text-gray-600 capitalize">{f.payment_mode ?? '-'}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    f.status === 'paid' ? 'bg-green-100 text-green-700' :
                    f.status === 'overdue' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {f.status}
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

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
