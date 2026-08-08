'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface FeeRecord {
  id: string
  month: string
  amount: number
  paid_on: string | null
  payment_mode: string | null
  status: string
}

export default function StudentFeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const s = localStorage.getItem('student')
    if (!s) return
    const student = JSON.parse(s)
    api.get('/api/fees', { params: { student_id: student.id } })
      .then(r => setFees(r.data))
      .finally(() => setLoading(false))
  }, [])

  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentFee = fees.find(f => f.month === currentMonth)
  const totalPaid = fees.filter(f => f.status === 'paid').reduce((a, f) => a + f.amount, 0)

  if (loading) return (
    <div className="flex items-center justify-center h-full pt-20">
      <p className="text-gray-400 text-sm">Loading fees...</p>
    </div>
  )

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Fees</h1>
        <p className="text-sm text-gray-500">Payment history and dues</p>
      </div>

      <div className={`rounded-xl border p-4 mb-4 ${
        currentFee?.status === 'paid'
          ? 'bg-green-50 border-green-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <p className={`text-xs font-medium mb-1 ${currentFee?.status === 'paid' ? 'text-green-700' : 'text-amber-700'}`}>
          This month
        </p>
        <p className={`text-2xl font-semibold ${currentFee?.status === 'paid' ? 'text-green-800' : 'text-amber-800'}`}>
          {currentFee?.status === 'paid' ? 'Paid' : 'Not recorded yet'}
        </p>
        <p className={`text-xs mt-1 ${currentFee?.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
          {currentFee?.status === 'paid'
            ? 'Paid on ' + currentFee.paid_on + ' via ' + currentFee.payment_mode
            : 'Contact your teacher if you have paid already'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
          <span className="text-gray-500">Total paid</span>
          <span className="font-semibold text-gray-900">Rs. {totalPaid.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between items-center py-2 text-sm">
          <span className="text-gray-500">Payments recorded</span>
          <span className="font-semibold text-gray-900">{fees.filter(f => f.status === 'paid').length}</span>
        </div>
      </div>

      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment history</h2>
      <div className="flex flex-col gap-3">
        {fees.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
            No fee records yet.
          </div>
        ) : fees.map(f => (
          <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{f.month}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {f.paid_on ? 'Paid on ' + f.paid_on : 'Not paid'}
                {f.payment_mode ? ' via ' + f.payment_mode : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">Rs. {f.amount?.toLocaleString('en-IN')}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${
                f.status === 'paid' ? 'bg-green-100 text-green-700' :
                f.status === 'overdue' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {f.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
