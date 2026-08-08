'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface ScheduleSlot {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  label: string
  is_active: boolean
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function SchedulePage() {
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/schedule')
      .then(r => setSlots(r.data))
      .finally(() => setLoading(false))
  }, [])

  const classdays = slots.map(s => s.day_of_week)

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-400 text-sm">Loading schedule...</p>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Class schedule</h1>
        <p className="text-sm text-gray-500 mt-1">Weekly recurring schedule for all students.</p>
      </div>

      {/* Week grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Weekly view</h2>
        <div className="grid grid-cols-7 gap-2">
          {DAY_NAMES.map((day, i) => {
            const slot = slots.find(s => s.day_of_week === i)
            const isClass = classdays.includes(i)
            return (
              <div key={day} className="flex flex-col gap-1">
                <p className="text-xs font-medium text-gray-500 text-center">{DAY_SHORT[i]}</p>
                <div className={`rounded-lg p-2 text-center min-h-16 flex flex-col items-center justify-center ${
                  isClass
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-gray-50 border border-gray-100'
                }`}>
                  {isClass && slot ? (
                    <>
                      <p className="text-xs font-semibold text-blue-700">{slot.label}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        {slot.start_time.slice(0,5)}
                      </p>
                      <p className="text-xs text-blue-500">
                        {slot.end_time.slice(0,5)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-300">No class</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Schedule details table */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Active class slots</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Day</th>
              <th className="text-left px-5 py-3 font-medium">Batch</th>
              <th className="text-left px-5 py-3 font-medium">Start time</th>
              <th className="text-left px-5 py-3 font-medium">End time</th>
              <th className="text-left px-5 py-3 font-medium">Duration</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {slots.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  No schedule configured. Add slots in Supabase to see them here.
                </td>
              </tr>
            ) : slots.map(slot => {
              const start = slot.start_time.slice(0, 5)
              const end = slot.end_time.slice(0, 5)
              const [sh, sm] = start.split(':').map(Number)
              const [eh, em] = end.split(':').map(Number)
              const duration = (eh * 60 + em) - (sh * 60 + sm)
              return (
                <tr key={slot.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {DAY_NAMES[slot.day_of_week]}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{slot.label}</td>
                  <td className="px-5 py-3 text-gray-600">{start}</td>
                  <td className="px-5 py-3 text-gray-600">{end}</td>
                  <td className="px-5 py-3 text-gray-600">{duration} mins</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      slot.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {slot.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{slots.length}</p>
          <p className="text-xs text-gray-500 mt-1">Classes per week</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">
            {slots.length > 0 ? slots[0].start_time.slice(0,5) : '-'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Start time</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">
            {slots.length > 0 ? slots[0].end_time.slice(0,5) : '-'}
          </p>
          <p className="text-xs text-gray-500 mt-1">End time</p>
        </div>
      </div>
    </div>
  )
}
