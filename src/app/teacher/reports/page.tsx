'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, ClipboardCheck, CreditCard, FileText, TrendingUp, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'
import { Student } from '@/types'

// ── Types ─────────────────────────────────────────────────────
interface AttendanceSummary {
  id: string; name: string; reg_number: string
  school_name: string; grade: string; mode: string
  present_count: number; absent_count: number
  leave_count: number; total_classes: number
  attendance_pct: number | null
}

interface AttendanceRecord {
  student_id: string; class_date: string; status: string
}

interface Invoice {
  id: string; student_id: string; month: string
  amount: number; status: string; fee_type: string
  hours_billed: number; paid_at: string | null
  students: { name: string; reg_number: string }
}

type Tab = 'attendance' | 'fees' | 'invoices' | 'students'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'attendance', label: 'Attendance',  icon: ClipboardCheck },
  { id: 'fees',       label: 'Fee Revenue', icon: CreditCard },
  { id: 'invoices',   label: 'Invoices',    icon: FileText },
  { id: 'students',   label: 'Students',    icon: Users },
]

function fmtMonth(m: string) {
  const [y, mo] = m.split('-')
  return new Date(+y, +mo - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function AttBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium w-8 text-right ${pct >= 75 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
        {pct}%
      </span>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────
export default function ReportsPage() {
  const today = new Date()
  const defaultMonth = today.toISOString().slice(0, 7)

  const [tab, setTab] = useState<Tab>('attendance')
  const [month, setMonth] = useState(defaultMonth)

  // Data
  const [attSummary, setAttSummary] = useState<AttendanceSummary[]>([])
  const [attRecords, setAttRecords] = useState<AttendanceRecord[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [attRes, attMonthRes, invRes, stuRes] = await Promise.all([
        api.get('/api/attendance/summary'),
        api.get('/api/attendance', { params: { month } }),
        api.get('/api/invoices', { params: { month } }),
        api.get('/api/students'),
      ])
      setAttSummary(attRes.data)
      setAttRecords(attMonthRes.data)
      setInvoices(invRes.data)
      setStudents(stuRes.data)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Attendance, fees, invoices and student overview</p>
        </div>
        <input type="month" value={month} max={defaultMonth}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><p className="text-gray-400 text-sm">Loading...</p></div>
      ) : (
        <>
          {tab === 'attendance' && <AttendanceTab summary={attSummary} records={attRecords} month={month} />}
          {tab === 'fees'       && <FeesTab invoices={invoices} students={students} month={month} />}
          {tab === 'invoices'   && <InvoicesTab invoices={invoices} month={month} />}
          {tab === 'students'   && <StudentsTab students={students} summary={attSummary} invoices={invoices} />}
        </>
      )}
    </div>
  )
}

// ── Tab 1: Attendance ────────────────────────────────────────
function AttendanceTab({ summary, records, month }: {
  summary: AttendanceSummary[]; records: AttendanceRecord[]; month: string
}) {
  // Build per-student month attendance from records
  const monthMap: Record<string, { present: number; absent: number; leave: number }> = {}
  for (const r of records) {
    if (!monthMap[r.student_id]) monthMap[r.student_id] = { present: 0, absent: 0, leave: 0 }
    if (r.status === 'present') monthMap[r.student_id].present++
    else if (r.status === 'absent') monthMap[r.student_id].absent++
    else if (r.status === 'leave') monthMap[r.student_id].leave++
  }

  const totalPresent = summary.reduce((a, s) => a + s.present_count, 0)
  const totalAbsent  = summary.reduce((a, s) => a + s.absent_count, 0)
  const totalLeave   = summary.reduce((a, s) => a + s.leave_count, 0)
  const avgPct = summary.length
    ? Math.round(summary.reduce((a, s) => a + (s.attendance_pct ?? 0), 0) / summary.length) : 0
  const lowAtt = summary.filter(s => (s.attendance_pct ?? 100) < 75)

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total students" value={summary.length} />
        <StatCard label="Total present (all time)" value={totalPresent} color="green" />
        <StatCard label="Total absent (all time)" value={totalAbsent} color="red" />
        <StatCard label="Avg. attendance" value={avgPct + '%'} color="blue" />
      </div>

      {/* Low attendance alert */}
      {lowAtt.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Low attendance alert</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {lowAtt.map(s => s.name).join(', ')} {lowAtt.length === 1 ? 'has' : 'have'} attendance below 75%
            </p>
          </div>
        </div>
      )}

      {/* This month breakdown */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{fmtMonth(month)} — day-by-day</h2>
          <span className="text-xs text-gray-400">{records.length} records</span>
        </div>
        {records.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No attendance marked for {fmtMonth(month)}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="text-left px-5 py-3 font-medium">Student</th>
                <th className="text-center px-4 py-3 font-medium">Present</th>
                <th className="text-center px-4 py-3 font-medium">Absent</th>
                <th className="text-center px-4 py-3 font-medium">Leave</th>
                <th className="text-left px-5 py-3 font-medium w-40">This month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.map(s => {
                const m = monthMap[s.id] ?? { present: 0, absent: 0, leave: 0 }
                const total = m.present + m.absent + m.leave
                const pct = total ? Math.round((m.present / total) * 100) : 0
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.reg_number}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-green-700">{m.present}</td>
                    <td className="px-4 py-3 text-center font-medium text-red-700">{m.absent}</td>
                    <td className="px-4 py-3 text-center font-medium text-amber-700">{m.leave}</td>
                    <td className="px-5 py-3 w-40">
                      {total > 0 ? <AttBar pct={pct} /> : <span className="text-xs text-gray-400">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* All-time student breakdown */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All-time attendance</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <th className="text-left px-5 py-3 font-medium">Student</th>
              <th className="text-left px-5 py-3 font-medium">School · Grade</th>
              <th className="text-center px-4 py-3 font-medium">Present</th>
              <th className="text-center px-4 py-3 font-medium">Absent</th>
              <th className="text-center px-4 py-3 font-medium">Leave</th>
              <th className="text-left px-5 py-3 font-medium w-40">Overall</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.reg_number}</p>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{s.school_name} · {s.grade}</td>
                <td className="px-4 py-3 text-center font-medium text-green-700">{s.present_count}</td>
                <td className="px-4 py-3 text-center font-medium text-red-700">{s.absent_count}</td>
                <td className="px-4 py-3 text-center font-medium text-amber-700">{s.leave_count}</td>
                <td className="px-5 py-3 w-40">
                  {s.attendance_pct != null
                    ? <AttBar pct={s.attendance_pct} />
                    : <span className="text-xs text-gray-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab 2: Fee Revenue ───────────────────────────────────────
function FeesTab({ invoices, students, month }: { invoices: Invoice[]; students: Student[]; month: string }) {
  const paid    = invoices.filter(i => i.status === 'paid')
  const pending = invoices.filter(i => i.status !== 'paid')
  const collected = paid.reduce((a, i) => a + i.amount, 0)
  const outstanding = pending.reduce((a, i) => a + i.amount, 0)
  const total = invoices.reduce((a, i) => a + i.amount, 0)
  const collectionRate = total ? Math.round((collected / total) * 100) : 0

  // Per-student fee breakdown
  const studentFeeMap: Record<string, Invoice[]> = {}
  for (const inv of invoices) {
    if (!studentFeeMap[inv.student_id]) studentFeeMap[inv.student_id] = []
    studentFeeMap[inv.student_id].push(inv)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total billed" value={'Rs.' + total.toLocaleString('en-IN')} />
        <StatCard label="Collected" value={'Rs.' + collected.toLocaleString('en-IN')} color="green" />
        <StatCard label="Outstanding" value={'Rs.' + outstanding.toLocaleString('en-IN')} color="red" />
        <StatCard label="Collection rate" value={collectionRate + '%'} color="blue" />
      </div>

      {/* Collection bar */}
      {total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">Collection progress — {fmtMonth(month)}</p>
            <p className="text-sm font-bold text-gray-900">
              Rs.{collected.toLocaleString('en-IN')} / Rs.{total.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: collectionRate + '%' }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{paid.length} paid</span>
            <span>{pending.length} pending</span>
          </div>
        </div>
      )}

      {/* Per student */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Per student — {fmtMonth(month)}</h2>
        </div>
        {invoices.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No invoices generated for {fmtMonth(month)}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="text-left px-5 py-3 font-medium">Student</th>
                <th className="text-center px-4 py-3 font-medium">Fee type</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Paid on</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{inv.students?.name}</p>
                    <p className="text-xs text-gray-400">{inv.students?.reg_number}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.fee_type === 'hourly' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {inv.fee_type === 'hourly' ? 'Hourly' : 'Fixed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    Rs.{inv.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                      inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-5 py-3 text-sm font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                  Rs.{total.toLocaleString('en-IN')}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Tab 3: Invoices ──────────────────────────────────────────
function InvoicesTab({ invoices, month }: { invoices: Invoice[]; month: string }) {
  const byStatus = {
    sent:    invoices.filter(i => i.status === 'sent'),
    paid:    invoices.filter(i => i.status === 'paid'),
    overdue: invoices.filter(i => i.status === 'overdue'),
    draft:   invoices.filter(i => i.status === 'draft'),
  }

  const totalAmount   = invoices.reduce((a, i) => a + i.amount, 0)
  const paidAmount    = byStatus.paid.reduce((a, i) => a + i.amount, 0)
  const overdueAmount = byStatus.overdue.reduce((a, i) => a + i.amount, 0)
  const pendingAmount = byStatus.sent.reduce((a, i) => a + i.amount, 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total invoiced" value={'Rs.' + totalAmount.toLocaleString('en-IN')} />
        <StatCard label="Paid" value={'Rs.' + paidAmount.toLocaleString('en-IN')} color="green" />
        <StatCard label="Pending" value={'Rs.' + pendingAmount.toLocaleString('en-IN')} color="blue" />
        <StatCard label="Overdue" value={'Rs.' + overdueAmount.toLocaleString('en-IN')} color="red" />
      </div>

      {/* Status breakdown cards */}
      <div className="grid grid-cols-3 gap-4">
        {(['paid','sent','overdue'] as const).map(status => {
          const list = byStatus[status]
          const colors = {
            paid:    { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
            sent:    { bg: 'bg-blue-50',  border: 'border-blue-200',  text: 'text-blue-700',  dot: 'bg-blue-500' },
            overdue: { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-700',   dot: 'bg-red-500'  },
          }[status]
          return (
            <div key={status} className={`${colors.bg} ${colors.border} border rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <p className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>{status}</p>
              </div>
              <p className={`text-2xl font-bold ${colors.text}`}>{list.length}</p>
              <p className={`text-xs ${colors.text} mt-0.5`}>
                Rs.{list.reduce((a, i) => a + i.amount, 0).toLocaleString('en-IN')}
              </p>
              {list.length > 0 && (
                <div className={`mt-3 pt-3 border-t ${colors.border} space-y-1`}>
                  {list.map(inv => (
                    <div key={inv.id} className="flex justify-between text-xs">
                      <span className={colors.text}>{inv.students?.name}</span>
                      <span className={`font-medium ${colors.text}`}>Rs.{inv.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Full invoice table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All invoices — {fmtMonth(month)}</h2>
        </div>
        {invoices.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No invoices for {fmtMonth(month)}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="text-left px-5 py-3 font-medium">Student</th>
                <th className="text-center px-4 py-3 font-medium">Hours billed</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Paid on</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{inv.students?.name}</p>
                    <p className="text-xs text-gray-400">{inv.students?.reg_number}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {inv.fee_type === 'hourly' ? inv.hours_billed + 'h' : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    Rs.{inv.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                      inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Tab 4: Students ──────────────────────────────────────────
function StudentsTab({ students, summary, invoices }: {
  students: Student[]; summary: AttendanceSummary[]; invoices: Invoice[]
}) {
  const [selected, setSelected] = useState<string | null>(null)

  const attMap: Record<string, AttendanceSummary> = {}
  for (const s of summary) attMap[s.id] = s

  const invMap: Record<string, Invoice[]> = {}
  for (const inv of invoices) {
    if (!invMap[inv.student_id]) invMap[inv.student_id] = []
    invMap[inv.student_id].push(inv)
  }

  const activeStudents  = students.filter(s => s.is_active)
  const onlineStudents  = students.filter(s => s.mode === 'online')
  const directStudents  = students.filter(s => s.mode === 'direct')
  const hourlyStudents  = students.filter(s => s.fee_type === 'hourly')

  return (
    <div className="space-y-5">
      {/* Overview stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Active students" value={activeStudents.length} />
        <StatCard label="Online" value={onlineStudents.length} color="blue" />
        <StatCard label="Direct" value={directStudents.length} color="amber" />
        <StatCard label="Hourly billing" value={hourlyStudents.length} color="purple" />
      </div>

      {/* Student cards */}
      <div className="grid grid-cols-1 gap-3">
        {students.map(s => {
          const att = attMap[s.id]
          const invs = invMap[s.id] ?? []
          const paidInvs = invs.filter(i => i.status === 'paid')
          const isOpen = selected === s.id

          return (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button onClick={() => setSelected(isOpen ? null : s.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.mode === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {s.mode}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.fee_type === 'hourly' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {s.fee_type === 'hourly' ? 'Hourly' : 'Fixed'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{s.reg_number} · {s.school_name} · {s.grade}</p>
                </div>
                <div className="flex items-center gap-6 text-right flex-shrink-0">
                  {att && (
                    <div>
                      <p className={`text-sm font-semibold ${(att.attendance_pct ?? 0) >= 75 ? 'text-green-700' : 'text-red-600'}`}>
                        {att.attendance_pct ?? 0}%
                      </p>
                      <p className="text-xs text-gray-400">attendance</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Rs.{s.monthly_fee.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-400">monthly fee</p>
                  </div>
                  <TrendingUp className={`w-4 h-4 ${isOpen ? 'text-blue-500' : 'text-gray-300'}`} />
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 grid grid-cols-3 gap-4">
                  {/* Attendance detail */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Attendance (all time)</p>
                    {att ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Present</span>
                          <span className="font-medium text-green-700">{att.present_count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Absent</span>
                          <span className="font-medium text-red-700">{att.absent_count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Leave</span>
                          <span className="font-medium text-amber-700">{att.leave_count}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <AttBar pct={att.attendance_pct ?? 0} />
                        </div>
                      </div>
                    ) : <p className="text-xs text-gray-400">No attendance data</p>}
                  </div>

                  {/* Fee info */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Fee details</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type</span>
                        <span className="font-medium text-gray-900 capitalize">{s.fee_type}</span>
                      </div>
                      {s.fee_type === 'hourly' ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Rate</span>
                            <span className="font-medium text-gray-900">Rs.{s.hourly_rate}/hr</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Hrs/month</span>
                            <span className="font-medium text-gray-900">{s.hours_per_month}h</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Monthly</span>
                          <span className="font-medium text-gray-900">Rs.{s.monthly_fee.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Cycle</span>
                        <span className="font-medium text-gray-900 capitalize">{s.payment_cycle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Due day</span>
                        <span className="font-medium text-gray-900">{s.due_day}th</span>
                      </div>
                    </div>
                  </div>

                  {/* Invoice history */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Invoice history ({invs.length})
                    </p>
                    {invs.length === 0 ? (
                      <p className="text-xs text-gray-400">No invoices yet</p>
                    ) : (
                      <div className="space-y-2">
                        {invs.slice(0, 5).map(inv => (
                          <div key={inv.id} className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">{fmtMonth(inv.month)}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">Rs.{inv.amount.toLocaleString('en-IN')}</span>
                              <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                                inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                                inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'}`}>
                                {inv.status}
                              </span>
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-gray-200 flex justify-between text-xs font-medium">
                          <span className="text-gray-500">Total paid</span>
                          <span className="text-green-700">
                            Rs.{paidInvs.reduce((a, i) => a + i.amount, 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Shared components ────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const colors = {
    green:  'bg-green-50 border-green-200',
    red:    'bg-red-50 border-red-200',
    blue:   'bg-blue-50 border-blue-200',
    amber:  'bg-amber-50 border-amber-200',
    purple: 'bg-purple-50 border-purple-200',
  }
  const textColors = {
    green: 'text-green-700', red: 'text-red-700', blue: 'text-blue-700',
    amber: 'text-amber-700', purple: 'text-purple-700',
  }
  const bg = color ? colors[color as keyof typeof colors] : 'bg-white border-gray-200'
  const tc = color ? textColors[color as keyof typeof textColors] : 'text-gray-900'
  return (
    <div className={`rounded-xl border p-4 text-center ${bg}`}>
      <p className={`text-2xl font-bold ${tc}`}>{value}</p>
      <p className={`text-xs mt-1 ${color ? tc : 'text-gray-500'}`}>{label}</p>
    </div>
  )
}
