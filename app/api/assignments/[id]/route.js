import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

export async function DELETE(request, { params }) {
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', params.id)

  if (error) return Response.json({ error }, { status: 500 })
  return Response.json({ success: true })
}