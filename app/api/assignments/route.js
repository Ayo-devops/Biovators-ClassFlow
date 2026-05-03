import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

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
    console.log('Body received:', body)

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert([body])
      .select()
      .single()

    if (error) {
      console.log('Supabase error:', error)
      return Response.json({ error }, { status: 500 })
    }

    console.log('Assignment saved:', assignment)

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')

    if (studentsError) {
      console.log('Students error:', studentsError)
      return Response.json({ error: studentsError }, { status: 500 })
    }

    console.log('Students found:', students?.length)

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
      '<br/>' +
      '<p>-- ClassFlow</p>'

    const result = await resend.emails.send({
      from: 'ClassFlow <onboarding@resend.dev>',
      to: student.student_email,
      subject: '[ClassFlow] New Assignment - ' + assignment.assignment_title,
      html: emailHtml
    })
    console.log('Email result:', JSON.stringify(result))
  } catch (emailError) {
    console.log('Email error:', emailError)
  }
}

    return Response.json(assignment, { status: 201 })

  } catch (err) {
    console.log('Caught error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}