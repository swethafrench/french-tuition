'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { FileText, Send, CheckCircle, ChevronDown, ChevronUp, Eye, X, RotateCcw } from 'lucide-react'
import api from '@/lib/api'
import { Student } from '@/types'

interface Invoice {
  id: string
  student_id: string
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
  notes: string | null
  students: { name: string; reg_number: string; mobile: string }
}

interface AttendanceRecord {
  student_id: string
  class_date: string
  status: string
}

interface Batch {
  id: string; name: string; days: number[]; start_time: string; end_time: string
}

function sessionHours(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60
}

function fmtMonth(m: string) {
  const [y, mo] = m.split('-')
  return new Date(+y, +mo - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function statusBadge(status: Invoice['status']) {
  const map = {
    draft:   'bg-gray-100 text-gray-600',
    sent:    'bg-blue-100 text-blue-700',
    paid:    'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
  }
  return `px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status]}`
}

// Preview row for generate flow
interface PreviewRow {
  student: Student & { batch_id?: string }
  hoursAttended: number
  hourlyRate: number
  monthlyFee: number
  feeType: string
  billableHours: number    // editable override
  finalAmount: number
}

export default function InvoicesPage() {
  const today = new Date()
  const defaultMonth = today.toISOString().slice(0, 7)

  const [month, setMonth] = useState(defaultMonth)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [students, setStudents] = useState<(Student & { batch_id?: string })[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'list' | 'generate'>('list')

  // Generate flow state
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  // Mark paid modal
  const [payModal, setPayModal] = useState<Invoice | null>(null)
  const [payForm, setPayForm] = useState({ payment_mode: 'upi', upi_txn_id: '', paid_at: new Date().toISOString().split('T')[0] })
  const [paying, setPaying] = useState(false)

  // Invoice detail modal
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, stuRes, batRes] = await Promise.all([
        api.get('/api/invoices', { params: { month } }),
        api.get('/api/students'),
        api.get('/api/batches'),
      ])
      setInvoices(invRes.data)
      setStudents(stuRes.data)
      setBatches(batRes.data)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  // ── Generate flow ──────────────────────────────────────────
  const startGenerate = async () => {
    setTab('generate')
    setGenerated(false)
    // Fetch attendance for selected month
    const attRes = await api.get('/api/attendance', { params: { month } })
    const att: AttendanceRecord[] = attRes.data
    setAttendance(att)

    // Build preview rows
    const rows: PreviewRow[] = students.map(s => {
      const studentAtt = att.filter(a => a.student_id === s.id && a.status === 'present')
      // Find student's batch to get session duration
      const batch = batches.find(b => b.id === s.batch_id)
      const sesHrs = batch ? sessionHours(batch.start_time, batch.end_time) : 1
      const hoursAttended = Math.round(studentAtt.length * sesHrs * 10) / 10

      const feeType = (s as Student & { fee_type?: string }).fee_type ?? 'fixed'
      const hourlyRate = (s as Student & { hourly_rate?: number }).hourly_rate ?? 0
      const monthlyFee = s.monthly_fee ?? 0

      const billableHours = feeType === 'hourly' ? hoursAttended : 0
      const finalAmount = feeType === 'hourly'
        ? Math.round(hoursAttended * hourlyRate)
        : monthlyFee

      return { student: s, hoursAttended, hourlyRate, monthlyFee, feeType, billableHours, finalAmount }
    })
    setPreviewRows(rows)
  }

  const updateBillableHours = (studentId: string, val: string) => {
    setPreviewRows(rows => rows.map(r => {
      if (r.student.id !== studentId) return r
      const h = parseFloat(val) || 0
      return {
        ...r,
        billableHours: h,
        finalAmount: r.feeType === 'hourly' ? Math.round(h * r.hourlyRate) : r.finalAmount,
      }
    }))
  }

  const updateFinalAmount = (studentId: string, val: string) => {
    setPreviewRows(rows => rows.map(r => {
      if (r.student.id !== studentId) return r
      return { ...r, finalAmount: parseFloat(val) || 0 }
    }))
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const payload = previewRows.map(r => ({
        student_id: r.student.id,
        month,
        hours_attended: r.hoursAttended,
        hours_billed: r.feeType === 'hourly' ? r.billableHours : r.hoursAttended,
        hourly_rate: r.hourlyRate,
        amount: r.finalAmount,
        fee_type: r.feeType,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }))
      await api.post('/api/invoices', payload)
      setGenerated(true)
      await load()
      setTab('list')
    } finally {
      setGenerating(false)
    }
  }

  // ── Mark paid ─────────────────────────────────────────────
  const handleMarkPaid = async () => {
    if (!payModal) return
    setPaying(true)
    try {
      await api.patch(`/api/invoices/${payModal.id}`, {
        status: 'paid',
        payment_mode: payForm.payment_mode,
        upi_txn_id: payForm.upi_txn_id || null,
        paid_at: payForm.paid_at,
      })
      setPayModal(null)
      await load()
    } finally {
      setPaying(false)
    }
  }

  const handleMarkOverdue = async (inv: Invoice) => {
    await api.patch(`/api/invoices/${inv.id}`, { status: 'overdue' })
    await load()
  }

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     invoices.length,
    sent:      invoices.filter(i => i.status === 'sent').length,
    paid:      invoices.filter(i => i.status === 'paid').length,
    overdue:   invoices.filter(i => i.status === 'overdue').length,
    collected: invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.amount, 0),
    pending:   invoices.filter(i => i.status !== 'paid').reduce((a, i) => a + i.amount, 0),
  }), [invoices])

  const noInvoicesYet = !loading && invoices.length === 0

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">Monthly billing based on attendance</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            max={defaultMonth}
            onChange={e => { setMonth(e.target.value); setTab('list') }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          {tab === 'list' && (
            <button
              onClick={startGenerate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <FileText className="w-4 h-4" />
              Generate invoices
            </button>
          )}
          {tab === 'generate' && (
            <button
              onClick={() => setTab('list')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── GENERATE TAB ─────────────────────────────────── */}
      {tab === 'generate' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-5 flex items-start gap-3">
            <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-0.5">Generating invoices for {fmtMonth(month)}</p>
              <p className="text-blue-600 text-xs">
                Hours attended are calculated from marked attendance × session duration.
                You can override billable hours or final amount before sending.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-medium">Student</th>
                  <th className="text-left px-5 py-3 font-medium">Fee type</th>
                  <th className="text-center px-4 py-3 font-medium">Hrs attended</th>
                  <th className="text-center px-4 py-3 font-medium">Rate / Base fee</th>
                  <th className="text-center px-4 py-3 font-medium">Billable hrs</th>
                  <th className="text-right px-5 py-3 font-medium">Invoice amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewRows.map(row => (
                  <tr key={row.student.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{row.student.name}</p>
                      <p className="text-xs text-gray-400">{row.student.reg_number}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.feeType === 'hourly' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {row.feeType === 'hourly' ? '⏱ Hourly' : '📅 Fixed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${row.hoursAttended === 0 ? 'text-red-500' : 'text-gray-900'}`}>
                        {row.hoursAttended}h
                      </span>
                      {row.hoursAttended === 0 && (
                        <p className="text-xs text-gray-400">no attendance</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 text-xs">
                      {row.feeType === 'hourly'
                        ? `₹${row.hourlyRate}/hr`
                        : `₹${row.monthlyFee.toLocaleString('en-IN')}`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.feeType === 'hourly' ? (
                        <input
                          type="number" min="0" step="0.5"
                          value={row.billableHours}
                          onChange={e => updateBillableHours(row.student.id, e.target.value)}
                          className="w-20 px-2 py-1 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-gray-400">₹</span>
                        <input
                          type="number" min="0"
                          value={row.finalAmount}
                          onChange={e => updateFinalAmount(row.student.id, e.target.value)}
                          className="w-24 px-2 py-1 text-sm text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={5} className="px-5 py-3 text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-gray-900">
                    ₹{previewRows.reduce((a, r) => a + r.finalAmount, 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setTab('list')}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleGenerate} disabled={generating || previewRows.length === 0}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Send className="w-4 h-4" />
              {generating ? 'Generating...' : `Generate & send ${previewRows.length} invoice${previewRows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* ── LIST TAB ─────────────────────────────────────── */}
      {tab === 'list' && (
        <>
          {generated && (
            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Invoices generated and sent for {fmtMonth(month)}.
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-0.5">Invoices</p>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
              <p className="text-xl font-bold text-blue-700">{stats.sent}</p>
              <p className="text-xs text-blue-600 mt-0.5">Sent</p>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
              <p className="text-xl font-bold text-green-700">{stats.paid}</p>
              <p className="text-xs text-green-600 mt-0.5">Paid</p>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center col-span-1">
              <p className="text-xl font-bold text-green-700">₹{stats.collected.toLocaleString('en-IN')}</p>
              <p className="text-xs text-green-600 mt-0.5">Collected</p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
              <p className="text-xl font-bold text-amber-700">₹{stats.pending.toLocaleString('en-IN')}</p>
              <p className="text-xs text-amber-600 mt-0.5">Pending</p>
            </div>
          </div>

          {/* Invoice table */}
          {loading ? (
            <div className="flex justify-center py-20"><p className="text-gray-400 text-sm">Loading...</p></div>
          ) : noInvoicesYet ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No invoices for {fmtMonth(month)}</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Generate invoices from attendance data for this month.</p>
              <button onClick={startGenerate}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Generate invoices
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                    <th className="text-left px-5 py-3 font-medium">Student</th>
                    <th className="text-center px-4 py-3 font-medium">Hours</th>
                    <th className="text-center px-4 py-3 font-medium">Fee type</th>
                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                    <th className="text-center px-4 py-3 font-medium">Paid on</th>
                    <th className="text-right px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{inv.students?.name}</p>
                        <p className="text-xs text-gray-400">{inv.students?.reg_number}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">
                        {inv.fee_type === 'hourly' ? `${inv.hours_billed}h` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          inv.fee_type === 'hourly' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {inv.fee_type === 'hourly' ? '⏱ Hourly' : '📅 Fixed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        ₹{inv.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={statusBadge(inv.status)}>{inv.status}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">
                        {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setDetailInvoice(inv)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="View invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => { setPayModal(inv); setPayForm({ payment_mode: 'upi', upi_txn_id: '', paid_at: new Date().toISOString().split('T')[0] }) }}
                              className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                            >
                              Mark paid
                            </button>
                          )}
                          {inv.status === 'sent' && (
                            <button
                              onClick={() => handleMarkOverdue(inv)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                              title="Mark overdue"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Mark Paid Modal ───────────────────────────────── */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Mark as paid</h2>
              <button onClick={() => setPayModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <p className="text-sm font-medium text-gray-900">{payModal.students?.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{fmtMonth(payModal.month)}</p>
              <p className="text-xl font-bold text-gray-900 mt-2">₹{payModal.amount.toLocaleString('en-IN')}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment mode</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={payForm.payment_mode}
                  onChange={e => setPayForm(f => ({ ...f, payment_mode: e.target.value }))}
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank transfer</option>
                  <option value="online">Other online</option>
                </select>
              </div>
              {(payForm.payment_mode === 'upi' || payForm.payment_mode === 'online') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">UPI Transaction ID (optional)</label>
                  <input
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 324569871234"
                    value={payForm.upi_txn_id}
                    onChange={e => setPayForm(f => ({ ...f, upi_txn_id: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Paid on</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={payForm.paid_at}
                  onChange={e => setPayForm(f => ({ ...f, paid_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setPayModal(null)}
                className="flex-1 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleMarkPaid} disabled={paying}
                className="flex-1 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                {paying ? 'Saving...' : 'Confirm payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Detail Modal ──────────────────────────── */}
      {detailInvoice && (
        <InvoiceDetailModal
          invoice={detailInvoice}
          month={month}
          onClose={() => setDetailInvoice(null)}
        />
      )}
    </div>
  )
}

// ── Invoice detail / printable view ──────────────────────────
function InvoiceDetailModal({ invoice, month, onClose }: { invoice: Invoice; month: string; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false)

  // UPI deep link for GPay / PhonePe / Paytm
  // Teacher should configure their UPI ID in env or settings; using placeholder for now
  const upiId = process.env.NEXT_PUBLIC_UPI_ID ?? 'teacher@upi'
  const upiName = encodeURIComponent('Apprenons French Tuition')
  const upiNote = encodeURIComponent(`Invoice ${month} - ${invoice.students?.name}`)
  const upiLink = `upi://pay?pa=${upiId}&pn=${upiName}&am=${invoice.amount}&cu=INR&tn=${upiNote}`
  const gPayLink = `intent://pay?pa=${upiId}&pn=${upiName}&am=${invoice.amount}&cu=INR&tn=${upiNote}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Invoice header */}
        <div className="bg-[#0d1b2a] text-white px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/60 uppercase tracking-widest mb-1">Invoice</p>
              <p className="text-lg font-bold">Apprenons</p>
              <p className="text-xs text-white/60 mt-0.5">French Tuition</p>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-white/60">Bill to</p>
              <p className="text-base font-semibold mt-0.5">{invoice.students?.name}</p>
              <p className="text-xs text-white/60 mt-0.5">{invoice.students?.reg_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/60">Period</p>
              <p className="text-sm font-medium mt-0.5">{fmtMonth(invoice.month)}</p>
              <span className={`mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                invoice.status === 'paid' ? 'bg-green-400/20 text-green-300' :
                invoice.status === 'overdue' ? 'bg-red-400/20 text-red-300' :
                'bg-blue-400/20 text-blue-300'
              }`}>{invoice.status}</span>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="px-6 py-5">
          <div className="space-y-3">
            {invoice.fee_type === 'hourly' ? (
              <>
                <LineItem label="Hours attended" value={`${invoice.hours_attended}h`} />
                <LineItem label="Billable hours" value={`${invoice.hours_billed}h`} />
                <LineItem label={`Rate`} value={`₹${invoice.hourly_rate}/hr`} />
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-900">Total due</span>
                    <span className="text-xl font-bold text-gray-900">₹{invoice.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 text-right">{invoice.hours_billed}h × ₹{invoice.hourly_rate}</p>
                </div>
              </>
            ) : (
              <>
                <LineItem label="Monthly tuition fee" value={`₹${invoice.amount.toLocaleString('en-IN')}`} />
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-900">Total due</span>
                    <span className="text-xl font-bold text-gray-900">₹{invoice.amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </>
            )}

            {invoice.status === 'paid' && invoice.paid_at && (
              <div className="mt-3 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="text-xs text-green-700">
                  <span className="font-medium">Paid</span>
                  {' · '}{new Date(invoice.paid_at).toLocaleDateString('en-IN')}
                  {invoice.payment_mode && ` · ${invoice.payment_mode.toUpperCase()}`}
                  {invoice.upi_txn_id && ` · Txn: ${invoice.upi_txn_id}`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pay now section */}
        {invoice.status !== 'paid' && (
          <div className="px-6 pb-5">
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pay online</p>
              <div className="grid grid-cols-3 gap-2">
                <a href={gPayLink}
                  className="flex flex-col items-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <span className="text-lg">G</span>
                  <span className="text-xs text-gray-600 font-medium">GPay</span>
                </a>
                <a href={`phonepe://pay?pa=${upiId}&pn=${upiName}&am=${invoice.amount}&cu=INR`}
                  className="flex flex-col items-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-colors">
                  <span className="text-lg">📱</span>
                  <span className="text-xs text-gray-600 font-medium">PhonePe</span>
                </a>
                <a href={upiLink}
                  className="flex flex-col items-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-colors">
                  <span className="text-lg">↗</span>
                  <span className="text-xs text-gray-600 font-medium">Any UPI</span>
                </a>
              </div>
              <button
                onClick={() => setExpanded(v => !v)}
                className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              >
                UPI ID for manual payment
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {expanded && (
                <div className="mt-2 px-3 py-2 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm font-mono font-medium text-gray-800">{upiId}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Copy and pay via any UPI app</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-6 pb-5">
          <button onClick={onClose}
            className="w-full py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function LineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
