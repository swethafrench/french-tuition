import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data } = await sb.table('schools')
    .select('*').eq('is_active', true).order('name')
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await sb.table('schools').insert({ name: body.name }).select()
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data![0])
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await sb.table('schools').update({ is_active: false }).eq('id', id)
  return NextResponse.json({ success: true })
}
