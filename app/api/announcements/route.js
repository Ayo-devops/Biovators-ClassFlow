import { createClient } from '@supabase/supabase-js'
import { BrevoClient } from '@getbrevo/brevo'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY })

export async function GET() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error }, { status: 500 })
  return Response.json(data)
}

export async function POST(request) {
  try {
    const body = await request.json()

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert([body])
      .select()
      .single()

    if (error) return Response.json({ error }, { status: 500 })

    const { data: students } = await supabase
      .from('students')
      .select('*')

    for (const student of students) {
      try {
        const emailHtml = '<p>Hi ' + student.student_name + ',</p>' +
          '<p>A new announcement has been posted on ClassFlow.</p>' +
          '<br/>' +
          '<p><b>' + announcement.title + '</b></p>' +
          '<p>' + announcement.body.replace(/\n/g, '<br/>') + '</p>' +
          '<br/>' +
          '<p>Posted by: ' + announcement.posted_by + '</p>' +
          '<br/>' +
          '<p>-- ClassFlow</p>'

        await brevo.transactionalEmails.sendTransacEmail({
          sender: { name: 'ClassFlow', email: 'akoredeayomide099@gmail.com' },
          to: [{ email: student.student_email, name: student.student_name }],
          subject: '[ClassFlow] Announcement — ' + announcement.title,
          htmlContent: emailHtml
        })
      } catch (emailError) {
        console.log('Email error:', emailError.message)
      }
    }

    return Response.json(announcement, { status: 201 })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}