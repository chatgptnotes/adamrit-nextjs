'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DataTable from '@/components/DataTable'
import StatCard from '@/components/StatCard'
import { Building2, DoorOpen, BedDouble, MapPin, Layers } from 'lucide-react'

export default function InfrastructurePage() {
  const [locations, setLocations] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [wards, setWards] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [beds, setBeds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'departments' | 'wards' | 'rooms' | 'beds'>('departments')

  useEffect(() => {
    async function fetch() {
      const [l, d, w, r, b] = await Promise.all([
        supabase.from('locations').select('*'),
        supabase.from('departments').select('*').order('name'),
        supabase.from('wards_full').select('*').order('name'),
        supabase.from('rooms_full').select('*').order('name'),
        supabase.from('beds_full').select('*').order('name').limit(500),
      ])
      setLocations(l.data || [])
      setDepartments(d.data || [])
      setWards(w.data || [])
      setRooms(r.data || [])
      setBeds(b.data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const deptCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Department', render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: 'description', label: 'Description' },
    { key: 'location_id', label: 'Location' },
  ]

  const wardCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Ward', render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: 'ward_type', label: 'Type' },
    { key: 'total_beds', label: 'Beds' },
    { key: 'location_id', label: 'Location' },
  ]

  const roomCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Room', render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: 'ward_id', label: 'Ward ID' },
    { key: 'room_type', label: 'Type' },
    { key: 'location_id', label: 'Location' },
  ]

  const bedCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Bed', render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: 'room_id', label: 'Room ID' },
    { key: 'ward_id', label: 'Ward ID' },
    { key: 'status', label: 'Status', render: (r: any) => {
      const s = r.status || '—'
      const color = s === 'available' ? 'bg-green-100 text-green-700' : s === 'occupied' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
      return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{s}</span>
    }},
  ]

  const tabs = [
    { key: 'departments', label: `Departments (${departments.length})` },
    { key: 'wards', label: `Wards (${wards.length})` },
    { key: 'rooms', label: `Rooms (${rooms.length})` },
    { key: 'beds', label: `Beds (${beds.length})` },
  ] as const

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600"><Building2 className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Infrastructure</h1>
          <p className="text-sm text-gray-500">{locations.length} locations, {departments.length} departments, {wards.length} wards, {rooms.length} rooms, {beds.length} beds</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Locations" value={loading ? '...' : locations.length.toString()} icon={MapPin} color="blue" />
        <StatCard title="Departments" value={loading ? '...' : departments.length.toString()} icon={Layers} color="purple" />
        <StatCard title="Wards" value={loading ? '...' : wards.length.toString()} icon={DoorOpen} color="green" />
        <StatCard title="Beds" value={loading ? '...' : beds.length.toString()} icon={BedDouble} color="orange" />
      </div>

      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'departments' && <DataTable data={departments} columns={deptCols} loading={loading} searchPlaceholder="Search departments..." searchKey="name" />}
      {tab === 'wards' && <DataTable data={wards} columns={wardCols} loading={loading} searchPlaceholder="Search wards..." searchKey="name" />}
      {tab === 'rooms' && <DataTable data={rooms} columns={roomCols} loading={loading} searchPlaceholder="Search rooms..." searchKey="name" />}
      {tab === 'beds' && <DataTable data={beds} columns={bedCols} loading={loading} searchPlaceholder="Search beds..." searchKey="name" />}
    </div>
  )
}
