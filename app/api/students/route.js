 import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

// GET - fetch all students
export async function GET() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('student_name', { ascending: true })

  if (error) return Response.json({ error }, { status: 500 })
  return Response.json(data)
}

// POST - add a new student
export async function POST(request) {
  const body = await request.json()

  const { data, error } = await supabase
    .from('students')
    .insert([body])
    .select()
    .single()

  if (error) return Response.json({ error }, { status: 500 })
  return Response.json(data, { status: 201 })
}