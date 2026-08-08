import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await sb
    .from('students')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Students fetch error:', error)
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  // Log what we got to debug
  console.log('First student keys:', data && data[0] ? Object.keys(data[0]) : 'no data')

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data: existing } = await sb
    .from('students')
    .select('id')
    .or(`mobile.eq.${body.mobile},reg_number.eq.${body.reg_number}`)

  if (existing && existing.length > 0) {
    return NextResponse.json({ detail: 'Mobile or reg number already exists' }, { status: 400 })
  }

  body.passcode = createHash('sha256').update(body.passcode).digest('hex')
  const { data, error } = await sb.from('students').insert(body).select()
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data![0])
}
