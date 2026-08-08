'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'

interface Student {
  id: string
  reg_number: string
  name: string
  mobile: string
  school_name: string
  grade: string
  mode: string
  batch_id: string | null
  school_id: string | null
}

interface Batch {
  id: string
  name: string
  days: number[]
  start_time: string
  end_time: string
}

const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function StudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [{ data: s }, { data: b }] = await Promise.all([
      supabase.from('students').select('*').eq('is_active', true).order('name'),
      supabase.from('batches').select('*').eq('is_active', true).order('name'),
    ])
    setStudents(s ?? [])
    setBatches(b ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const deleteStudent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate ${name}?`)) return
    await api.delete(`/api/students/${id}`)
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-400 text-sm">Loading students...</p>
    </div>
  )

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-1">{students.length} active students</p>
        </div>
        <button
          onClick={() => router.push('/teacher/register')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          + Register new student
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Student</th>
              <th className="text-left px-5 py-3 font-medium">Mobile</th>
              <th className="text-left px-5 py-3 font-medium">School</th>
              <th className="text-left px-5 py-3 font-medium">Grade</th>
              <th className="text-left px-5 py-3 font-medium">Batch</th>
              <th className="text-left px-5 py-3 font-medium">Mode</th>
              <th className="text-left px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                  No students registered yet.
                </td>
              </tr>
            ) : students.map(s => {
              const batch = batches.find(b => b.id === s.batch_id)
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                        {s.name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.reg_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{s.mobile}</td>
                  <td className="px-5 py-3 text-gray-600">{s.school_name ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-600">{s.grade ?? '-'}</td>
                  <td className="px-5 py-3">
                    {batch ? (
                      <div>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {batch.name}
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {batch.days.map((d: number) => DAY_NAMES[d]).join(', ')} · {batch.start_time.slice(0,5)} to {batch.end_time.slice(0,5)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No batch</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.mode === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {s.mode}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/teacher/students/${s.id}/edit`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => deleteStudent(s.id, s.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
