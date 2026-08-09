'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'
import { whatsappLink, generalMessage } from '@/lib/whatsapp'

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
                      <a
                        href={whatsappLink(s.mobile, generalMessage(s.name))}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </a>
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
