import { createClient } from "@supabase/supabase-js";
import { BrevoClient } from "@getbrevo/brevo";
import { sendWhatsApp } from "../../../lib/whatsapp-server";
import { authorizeAdmin } from "../../../lib/admin-auth";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
      )
    : null;

async function loadReminderContext(studentId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in1Day = new Date(today);
  in1Day.setDate(today.getDate() + 1);
  const in3Days = new Date(today);
  in3Days.setDate(today.getDate() + 3);

  let studentsQuery = supabase.from("students").select("*");
  if (studentId) studentsQuery = studentsQuery.eq("id", studentId);

  const [studentsResult, todayResult, oneDayResult, threeDayResult] =
    await Promise.all([
      studentsQuery,
      supabase
        .from("assignments")
        .select("*")
        .eq("deadline_date", today.toISOString().split("T")[0]),
      supabase
        .from("assignments")
        .select("*")
        .eq("deadline_date", in1Day.toISOString().split("T")[0]),
      supabase
        .from("assignments")
        .select("*")
        .eq("deadline_date", in3Days.toISOString().split("T")[0]),
    ]);

  const queryError =
    studentsResult.error ||
    todayResult.error ||
    oneDayResult.error ||
    threeDayResult.error;
  if (queryError) throw new Error(queryError.message);

  return {
    students: studentsResult.data || [],
    groups: [
      {
        assignments: todayResult.data || [],
        subject: "[ClassFlow] Due Today",
        line: "Today is the deadline. Submit before it is too late.",
      },
      {
        assignments: oneDayResult.data || [],
        subject: "[ClassFlow] Due Tomorrow",
        line: "This assignment is due TOMORROW. Do not wait.",
      },
      {
        assignments: threeDayResult.data || [],
        subject: "[ClassFlow] Due in 3 Days",
        line: "This assignment is due in 3 days. Start early.",
      },
    ],
  };
}

function assignmentMessage(assignment, subjectPrefix) {
  return (
    `${subjectPrefix}\n\n` +
    `Course: ${assignment.course_title}\n` +
    `Assignment: ${assignment.assignment_title}\n` +
    `Lecturer: ${assignment.lecturer_name}\n` +
    `Deadline: ${assignment.deadline_date}\n` +
    `Submission: ${assignment.submission_method}\n` +
    `Priority: ${assignment.priority}` +
    (assignment.description ? `\n\n${assignment.description}` : "") +
    `\n\n— ClassFlow`
  );
}

function assignmentEmail(assignment, student, messageLine) {
  return (
    `<p>Hi ${student.student_name},</p>` +
    `<p>${messageLine}</p><br/>` +
    `<p><b>Course:</b> ${assignment.course_title}</p>` +
    `<p><b>Assignment:</b> ${assignment.assignment_title}</p>` +
    `<p><b>Lecturer:</b> ${assignment.lecturer_name}</p>` +
    `<p><b>Deadline:</b> ${assignment.deadline_date}</p>` +
    `<p><b>Submission Method:</b> ${assignment.submission_method}</p>` +
    `<p><b>Priority:</b> ${assignment.priority}</p>` +
    (assignment.description
      ? `<p><b>Description:</b></p><p>${assignment.description.replace(/\n/g, "<br/>")}</p>`
      : "") +
    `<br/><p>-- ClassFlow</p>`
  );
}

function preview(context, studentId) {
  const assignments = context.groups.reduce(
    (total, group) => total + group.assignments.length,
    0,
  );
  return {
    dryRun: true,
    target: studentId ? "single_student" : "all_students",
    studentId: studentId || null,
    students: context.students.length,
    assignments,
    deliveries: assignments * context.students.length,
    breakdown: {
      today: context.groups[0].assignments.length,
      tomorrow: context.groups[1].assignments.length,
      threeDays: context.groups[2].assignments.length,
    },
  };
}

async function deliver(context) {
  const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  const results = { emails: 0, whatsapp: 0, skipped: 0, failures: [] };

  for (const group of context.groups) {
    for (const assignment of group.assignments) {
      for (const student of context.students) {
        if (student.student_email) {
          try {
            await brevo.transactionalEmails.sendTransacEmail({
              sender: {
                name: "ClassFlow",
                email: "akoredeayomide099@gmail.com",
              },
              to: [
                {
                  email: student.student_email,
                  name: student.student_name,
                },
              ],
              subject: `${group.subject} - ${assignment.assignment_title}`,
              htmlContent: assignmentEmail(assignment, student, group.line),
            });
            results.emails += 1;
          } catch (error) {
            results.failures.push({
              studentId: student.id,
              assignmentId: assignment.id,
              channel: "email",
              error: error.message,
            });
          }
        } else {
          results.skipped += 1;
        }

        if (student.phone_number) {
          try {
            await sendWhatsApp(
              student.phone_number,
              assignmentMessage(assignment, group.subject),
            );
            results.whatsapp += 1;
          } catch (error) {
            results.failures.push({
              studentId: student.id,
              assignmentId: assignment.id,
              channel: "whatsapp",
              error: error.message,
            });
          }
        } else {
          results.skipped += 1;
        }
      }
    }
  }
  return results;
}

export async function GET(request) {
  const authorization = await authorizeAdmin(request, {
    allowReminderKey: true,
  });
  if (authorization.error) return authorization.error;
  if (!supabase) {
    return Response.json(
      { error: "Class data is not configured yet." },
      { status: 503 },
    );
  }

  try {
    const studentId = new URL(request.url).searchParams.get("studentId");
    const context = await loadReminderContext(studentId);
    return Response.json(preview(context, studentId));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authorization = await authorizeAdmin(request, {
    allowReminderKey: true,
  });
  if (authorization.error) return authorization.error;
  if (!supabase || !process.env.BREVO_API_KEY) {
    return Response.json(
      { error: "Reminder delivery is not configured yet." },
      { status: 503 },
    );
  }

  try {
    const { studentId, confirmAll = false } = await request.json();
    if (!studentId && confirmAll !== true) {
      return Response.json(
        {
          error:
            "Provide a studentId for a controlled test or set confirmAll to true.",
        },
        { status: 400 },
      );
    }

    const context = await loadReminderContext(studentId);
    if (studentId && context.students.length === 0) {
      return Response.json({ error: "Student not found." }, { status: 404 });
    }

    const results = await deliver(context);
    return Response.json({
      message: "Reminder delivery completed.",
      ...preview(context, studentId),
      dryRun: false,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
