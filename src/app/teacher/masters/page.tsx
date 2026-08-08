'use client'

import { useEffect, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import api from '@/lib/api'

interface School { id: string; name: string }
interface Batch { id: string; name: string; days: number[]; start_time: string; end_time: string }

const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function MastersPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [newSchool, setNewSchool] = useState('')
  const [schoolMsg, setSchoolMsg] = useState('')
  const [newBatch, setNewBatch] = useState({ name: '', days: [] as number[], start_time: '16:00', end_time: '17:30' })
  const [batchMsg, setBatchMsg] = useState('')

  const load = () => {
    api.get('/api/schools').then(r => setSchools(r.data))
    api.get('/api/batches').then(r => setBatches(r.data))
  }

  useEffect(() => { load() }, [])

  const addSchool = async () => {
    if (!newSchool.trim()) return
    await api.post('/api/schools', { name: newSchool.trim() })
    setNewSchool('')
    setSchoolMsg('School added.')
    load()
    setTimeout(() => setSchoolMsg(''), 2000)
  }

  const deleteSchool = async (id: string) => {
    await api.delete('/api/schools', { data: { id } })
    load()
  }

  const toggleDay = (d: number) => {
    setNewBatch(b => ({
      ...b,
      days: b.days.includes(d) ? b.days.filter(x => x !== d) : [...b.days, d]
    }))
  }

  const addBatch = async () => {
    if (!newBatch.name || newBatch.days.length === 0) {
      setBatchMsg('Please enter a name and select at least one day.')
      return
    }
    await api.post('/api/batches', newBatch)
    setNewBatch({ name: '', days: [], start_time: '16:00', end_time: '17:30' })
    setBatchMsg('Batch added.')
    load()
    setTimeout(() => setBatchMsg(''), 2000)
  }

  const deleteBatch = async (id: string) => {
    await api.delete('/api/batches', { data: { id } })
    load()
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Masters</h1>
        <p className="text-sm text-gray-500 mt-1">Manage schools and batches.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* SCHOOLS */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Add school</h2>
            {schoolMsg && <p className="text-xs text-green-600 mb-2">{schoolMsg}</p>}
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="School name"
                value={newSchool}
                onChange={e => setNewSchool(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSchool()}
              />
              <button onClick={addSchool} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Schools ({schools.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {schools.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">No schools added yet.</p>
              ) : schools.map(s => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <p className="text-sm text-gray-900">{s.name}</p>
                  <button onClick={() => deleteSchool(s.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BATCHES */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Add batch</h2>
            {batchMsg && <p className={`text-xs mb-2 ${batchMsg.includes('Please') ? 'text-red-500' : 'text-green-600'}`}>{batchMsg}</p>}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Batch name</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Batch A"
                  value={newBatch.name}
                  onChange={e => setNewBatch(b => ({ ...b, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class days</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAY_NAMES.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${
                        newBatch.days.includes(i)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-600 hover:border-blue-400'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start time</label>
                  <input type="time" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={newBatch.start_time} onChange={e => setNewBatch(b => ({ ...b, start_time: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End time</label>
                  <input type="time" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value={newBatch.end_time} onChange={e => setNewBatch(b => ({ ...b, end_time: e.target.value }))} />
                </div>
              </div>
              <button onClick={addBatch} className="w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Add batch
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Batches ({batches.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {batches.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">No batches added yet.</p>
              ) : batches.map(b => (
                <div key={b.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {b.days.map((d: number) => DAY_NAMES[d]).join(', ')} · {b.start_time.slice(0,5)} to {b.end_time.slice(0,5)}
                    </p>
                  </div>
                  <button onClick={() => deleteBatch(b.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
