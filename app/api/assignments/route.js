import { createClient } from '@supabase/supabase-js'
import { BrevoClient } from '@getbrevo/brevo'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY })

export async function GET() {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .order('deadline_date', { ascending: true })

  if (error) return Response.json({ error }, { status: 500 })
  return Response.json(data)
}

export async function POST(request) {
  try {
    const body = await request.json()

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert([body])
      .select()
      .single()

    if (error) return Response.json({ error }, { status: 500 })

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')

    if (studentsError) return Response.json({ error: studentsError }, { status: 500 })

    for (const student of students) {
      try {
        const emailHtml = '<p>Hi ' + student.student_name + ',</p>' +
          '<p>A new assignment has just been added to ClassFlow.</p>' +
          '<br/>' +
          '<p><b>Course:</b> ' + assignment.course_title + '</p>' +
          '<p><b>Assignment:</b> ' + assignment.assignment_title + '</p>' +
          '<p><b>Lecturer:</b> ' + assignment.lecturer_name + '</p>' +
          '<p><b>Deadline:</b> ' + assignment.deadline_date + '</p>' +
          '<p><b>Submission Method:</b> ' + assignment.submission_method + '</p>' +
          '<p><b>Priority:</b> ' + assignment.priority + '</p>' +
          (assignment.description ? '<p><b>Description:</b> ' + assignment.description + '</p>' : '') +
          '<br/>' +
          '<p>-- ClassFlow</p>'

        await brevo.transactionalEmails.sendTransacEmail({
          sender: { name: 'ClassFlow', email: 'akoredeayomide099@gmail.com' },
          to: [{ email: student.student_email, name: student.student_name }],
          subject: '[ClassFlow] New Assignment - ' + assignment.assignment_title,
          htmlContent: emailHtml
        })
        console.log('Email sent to:', student.student_email)
      } catch (emailError) {
        console.log('Email error:', emailError.message)
      }
    }

    return Response.json(assignment, { status: 201 })

  } catch (err) {
    console.log('Caught error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}