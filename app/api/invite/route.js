import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

export async function POST(request) {
  try {
    const { email, role } = await request.json()

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { role: role }
    })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true, user: data })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}