'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, ChevronDown, ChevronUp, Clock, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

interface Invoice {
  id: string
  month: string
  hours_attended: number
  hours_billed: number
  hourly_rate: number
  amount: number
  fee_type: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  sent_at: string | null
  paid_at: string | null
  payment_mode: string | null
  upi_txn_id: string | null
}

function fmtMonth(m: string) {
  const [y, mo] = m.split('-')
  return new Date(+y, +mo - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export default function StudentInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    const s = localStorage.getItem('student')
    if (!s) return
    const student = JSON.parse(s)
    api.get('/api/invoices', { params: { student_id: student.id } })
      .then(r => {
        setInvoices(r.data)
        // Auto-open latest unpaid
        const unpaid = r.data.find((i: Invoice) => i.status === 'sent' || i.status === 'overdue')
        if (unpaid) setOpenId(unpaid.id)
      })
      .finally(() => setLoading(false))
  }, [])

  const upiId = process.env.NEXT_PUBLIC_UPI_ID ?? 'teacher@upi'
  const upiName = encodeURIComponent('Apprenons French Tuition')

  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentInvoice = invoices.find(i => i.month === currentMonth)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.amount, 0)

  if (loading) return (
    <div className="flex items-center justify-center pt-20">
      <p className="text-gray-400 text-sm">Loading invoices...</p>
    </div>
  )

  if (invoices.length === 0) return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Invoices</h1>
      <p className="text-sm text-gray-500 mb-6">Your monthly fee invoices</p>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No invoices yet.</p>
        <p className="text-xs text-gray-400 mt-1">Your teacher will send your invoice at the end of the month.</p>
      </div>
    </div>
  )

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Invoices</h1>
      <p className="text-sm text-gray-500 mb-4">Your monthly fee invoices</p>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-green-700">₹{totalPaid.toLocaleString('en-IN')}</p>
          <p className="text-xs text-green-600">Total paid</p>
        </div>
        <div className={`rounded-xl border p-3 text-center ${
          currentInvoice?.status === 'paid' ? 'bg-green-50 border-green-200' :
          currentInvoice?.status === 'overdue' ? 'bg-red-50 border-red-200' :
          currentInvoice ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
        }`}>
          <p className={`text-lg font-bold ${
            currentInvoice?.status === 'paid' ? 'text-green-700' :
            currentInvoice?.status === 'overdue' ? 'text-red-700' :
            currentInvoice ? 'text-amber-700' : 'text-gray-400'
          }`}>
            {currentInvoice ? (currentInvoice.status === 'paid' ? 'Paid ✓' : `₹${currentInvoice.amount.toLocaleString('en-IN')}`) : '—'}
          </p>
          <p className={`text-xs ${currentInvoice?.status === 'overdue' ? 'text-red-600' : 'text-gray-500'}`}>
            This month {currentInvoice?.status === 'overdue' ? '· Overdue' : ''}
          </p>
        </div>
      </div>

      {/* Invoice cards */}
      <div className="space-y-3">
        {invoices.map(inv => {
          const isOpen = openId === inv.id
          const upiNote = encodeURIComponent(`Invoice ${inv.month}`)
          const upiParams = `pa=${upiId}&pn=${upiName}&am=${inv.amount}&cu=INR&tn=${upiNote}`
          const gPayLink    = `tez://upi/pay?${upiParams}`
          const phonePeLink = `phonepe://pay?${upiParams}`
          const anyUpiLink  = `upi://pay?${upiParams}`

          return (
            <div key={inv.id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${
              inv.status === 'overdue' ? 'border-red-200' :
              inv.status === 'sent' ? 'border-blue-200' :
              inv.status === 'paid' ? 'border-green-200' : 'border-gray-200'
            }`}>
              {/* Card header — always visible */}
              <button
                onClick={() => setOpenId(isOpen ? null : inv.id)}
                className="w-full flex items-center justify-between px-4 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    inv.status === 'paid' ? 'bg-green-100' :
                    inv.status === 'overdue' ? 'bg-red-100' :
                    inv.status === 'sent' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {inv.status === 'paid' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                     inv.status === 'overdue' ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                     <Clock className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{fmtMonth(inv.month)}</p>
                    <p className={`text-xs mt-0.5 capitalize ${
                      inv.status === 'paid' ? 'text-green-600' :
                      inv.status === 'overdue' ? 'text-red-500' :
                      'text-blue-600'
                    }`}>
                      {inv.status === 'paid' && inv.paid_at
                        ? `Paid on ${new Date(inv.paid_at).toLocaleDateString('en-IN')}`
                        : inv.status === 'overdue' ? 'Payment overdue'
                        : 'Payment pending'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-base font-bold text-gray-900">₹{inv.amount.toLocaleString('en-IN')}</p>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                  {/* Line items */}
                  <div className="space-y-2 mb-4">
                    {inv.fee_type === 'hourly' ? (
                      <>
                        <InvLine label="Hours attended" value={`${inv.hours_attended}h`} />
                        <InvLine label="Billable hours" value={`${inv.hours_billed}h`} />
                        <InvLine label="Rate per hour" value={`₹${inv.hourly_rate}`} />
                        <div className="border-t border-gray-200 pt-2 flex justify-between">
                          <span className="text-sm font-semibold text-gray-900">Total</span>
                          <span className="text-sm font-bold text-gray-900">₹{inv.amount.toLocaleString('en-IN')}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <InvLine label="Monthly tuition fee" value={`₹${inv.amount.toLocaleString('en-IN')}`} />
                        <div className="border-t border-gray-200 pt-2 flex justify-between">
                          <span className="text-sm font-semibold text-gray-900">Total</span>
                          <span className="text-sm font-bold text-gray-900">₹{inv.amount.toLocaleString('en-IN')}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {inv.status === 'paid' && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 rounded-xl text-xs text-green-700 mb-3">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        Paid via <span className="font-medium uppercase">{inv.payment_mode}</span>
                        {inv.upi_txn_id && ` · Txn: ${inv.upi_txn_id}`}
                      </span>
                    </div>
                  )}

                  {/* Pay buttons */}
                  {(inv.status === 'sent' || inv.status === 'overdue') && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pay now</p>
                      <a href={gPayLink}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-[#1a73e8] text-white text-sm font-medium rounded-xl hover:bg-[#1557b0] transition-colors">
                        <span className="font-bold">G</span> Pay with Google Pay
                      </a>
                      <a href={phonePeLink}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-[#5f259f] text-white text-sm font-medium rounded-xl hover:bg-[#4a1a7c] transition-colors">
                        📱 Pay with PhonePe
                      </a>
                      <a href={anyUpiLink}
                        className="flex items-center justify-center gap-2 w-full py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                        ↗ Any UPI app
                      </a>
                      <p className="text-xs text-gray-400 text-center mt-2">
                        After payment, your teacher will confirm and mark it as paid.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InvLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
