import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'
import { createHash } from 'crypto'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  const hashed = createHash('sha256').update(password).digest('hex')

  const { data } = await sb.table('teachers')
    .select('id,name,username')
    .eq('username', username)
    .eq('password', hashed)
    .eq('is_active', true)

  if (!data || data.length === 0) {
    return NextResponse.json({ detail: 'Invalid username or password' }, { status: 401 })
  }

  const teacher = data[0]
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
  const token = await new SignJWT({ sub: teacher.id, name: teacher.name, role: 'teacher' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)

  return NextResponse.json({ token, teacher })
}
