import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { data, error } = await sb.from('students').update(body).eq('id', id).select()
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data![0])
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params
  await sb.from('students').update({ is_active: false }).eq('id', id)
  return NextResponse.json({ success: true })
}
