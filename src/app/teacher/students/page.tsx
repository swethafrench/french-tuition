'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import api from '@/lib/api'
import { Student } from '@/types'

interface Batch { id: string; name: string; days: number[]; start_time: string; end_time: string }

const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ grade: '', batch_id: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([
      api.get('/api/students'),
      api.get('/api/batches'),
    ]).then(([s, b]) => {
      setStudents(s.data)
      setBatches(b.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const startEdit = (s: Student) => {
    setEditId(s.id)
    setEditForm({ grade: s.grade ?? '', batch_id: (s as unknown as { batch_id?: string }).batch_id ?? '' })
  }

  const saveEdit = async (id: string) => {
    setSaving(true)
    await api.patch(`/api/students/${id}`, editForm)
    setEditId(null)
    load()
    setSaving(false)
  }

  const deleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this student?')) return
    await api.delete(`/api/students/${id}`)
    load()
  }

  const gradeOptions = ['Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12']

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
        <a href="/teacher/register" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          + Register new student
        </a>
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
              const isEditing = editId === s.id
              const batch = batches.find(b => b.id === (s as unknown as { batch_id?: string }).batch_id)
              return (
                <tr key={s.id} className={`hover:bg-gray-50 ${isEditing ? 'bg-blue-50' : ''}`}>
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
                  <td className="px-5 py-3 text-gray-600">{s.school_name}</td>
                  <td className="px-5 py-3">
                    {isEditing ? (
                      <select
                        className="px-2 py-1 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.grade}
                        onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))}
                      >
                        {gradeOptions.map(g => <option key={g}>{g}</option>)}
                      </select>
                    ) : (
                      <span className="text-gray-700">{s.grade ?? '-'}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {isEditing ? (
                      <select
                        className="px-2 py-1 text-xs border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.batch_id}
                        onChange={e => setEditForm(f => ({ ...f, batch_id: e.target.value }))}
                      >
                        <option value="">No batch</option>
                        {batches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.days.map((d: number) => DAY_NAMES[d]).join(',')})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-700">
                        {batch ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {batch.name}
                          </span>
                        ) : '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.mode === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {s.mode}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(s.id)} disabled={saving} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditId(null)} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(s)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => deleteStudent(s.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
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
