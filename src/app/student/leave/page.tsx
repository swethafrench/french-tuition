'use client'

import { useState } from 'react'

const upcomingClasses = [
  { label: 'Monday, 11 Aug 2026', value: '2026-08-11' },
  { label: 'Wednesday, 13 Aug 2026', value: '2026-08-13' },
  { label: 'Friday, 15 Aug 2026', value: '2026-08-15' },
  { label: 'Monday, 18 Aug 2026', value: '2026-08-18' },
]

export default function LeavePage() {
  const [selectedDate, setSelectedDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [requests, setRequests] = useState([
    { date: '30 Jul 2026', reason: 'Medical appointment', status: 'Noted' },
    { date: '15 Jul 2026', reason: 'School exam', status: 'Noted' },
  ])

  const handleSubmit = () => {
    if (!selectedDate || !reason) return
    const label = upcomingClasses.find(c => c.value === selectedDate)?.label ?? selectedDate
    setRequests(r => [{ date: label, reason, status: 'Pending' }, ...r])
    setSubmitted(true)
    setSelectedDate('')
    setReason('')
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Apply for leave</h1>
        <p className="text-sm text-gray-500">Request absence from a session</p>
      </div>

      {submitted && (
        <div className="mb-4 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Leave request submitted successfully.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">New request</h2>
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Select session</label>
          <select
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          >
            <option value="">Choose a class date</option>
            {upcomingClasses.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Reason</label>
          <textarea
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Brief reason for leave..."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <button
          onClick={handleSubmit}
          className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Submit leave request
        </button>
      </div>

      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Previous requests</h2>
      <div className="flex flex-col gap-3">
        {requests.map((r, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-start">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-700 whitespace-nowrap">
              {r.date}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{r.reason}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${
                r.status === 'Noted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {r.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
