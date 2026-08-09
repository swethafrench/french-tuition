import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { data, error } = await sb.from('invoices')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id).select()
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data![0])
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await sb.from('invoices')
    .select('*, students(name, reg_number, mobile, school_name, grade, mode, parent_name)')
    .eq('id', id).single()
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data)
}
