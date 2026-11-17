import { createClient } from "@supabase/supabase-js";
import { BrevoClient } from "@getbrevo/brevo";
import { sendWhatsAppGroup } from "../../../lib/whatsapp-server";
import { authorizeAdmin } from "../../../lib/admin-auth";
import { CLASSFLOW_PUBLIC_URL } from "../../../lib/classflow-links";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
      )
    : null;

const ASSIGNMENT_REMINDER_GROUP_ID =
  process.env.ASSIGNMENT_REMINDER_GROUP_ID || "120363353819665592@g.us";
const ASSIGNMENT_REMINDER_GROUP_NAME =
  process.env.ASSIGNMENT_REMINDER_GROUP_NAME || "400 LVL BME Materials group";

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

function assignmentGroupMessage(group) {
  const heading = group.subject.replace("[ClassFlow] ", "");
  const assignments = group.assignments
    .map(
      (assignment, index) =>
        `${index + 1}. *${assignment.course_title}*\n` +
        `${assignment.assignment_title}\n` +
        `Deadline: ${assignment.deadline_date}\n` +
        `Submission: ${assignment.submission_method}` +
        (assignment.priority ? `\nPriority: ${assignment.priority}` : ""),
    )
    .join("\n\n");

  return (
    `📝 *${heading}*\n\n` +
    `${group.line}\n\n` +
    `${assignments}\n\n` +
    `View assignments: ${CLASSFLOW_PUBLIC_URL}/assignments\n\n` +
    `_ClassFlow — Biovators, connected._`
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
    `<br/><p>— ClassFlow for Biovators</p>`
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
    deliveries:
      assignments * context.students.length +
      (studentId ? 0 : context.groups.filter((group) => group.assignments.length).length),
    emailDeliveries: assignments * context.students.length,
    whatsappGroupDeliveries: studentId
      ? 0
      : context.groups.filter((group) => group.assignments.length).length,
    whatsappTarget: studentId ? null : ASSIGNMENT_REMINDER_GROUP_NAME,
    breakdown: {
      today: context.groups[0].assignments.length,
      tomorrow: context.groups[1].assignments.length,
      threeDays: context.groups[2].assignments.length,
    },
  };
}

function samplePreview() {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 3);
  const assignment = {
    course_title: "Sample Course",
    assignment_title: "Practice Assignment",
    lecturer_name: "Sample Lecturer",
    deadline_date: deadline.toISOString().split("T")[0],
    submission_method: "LMS",
    priority: "Medium",
    description:
      "This is a preview only. No assignment was created and nothing was sent.",
  };
  const subject = "[ClassFlow] Due in 3 Days";

  return {
    dryRun: true,
    sample: true,
    target: "preview_only",
    students: 1,
    assignments: 1,
    deliveries: 2,
    email: {
      subject: `${subject} - ${assignment.assignment_title}`,
      summary: "One reminder email would be prepared for the selected student.",
    },
    whatsappTarget: ASSIGNMENT_REMINDER_GROUP_NAME,
    whatsapp: assignmentGroupMessage({
      subject,
      line: "This assignment is due in 3 days. Start early.",
      assignments: [assignment],
    }),
  };
}

async function deliver(context, { sendGroup = true } = {}) {
  const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  const results = { emails: 0, whatsapp: 0, skipped: 0, failures: [] };
  const emailJobs = [];

  for (const group of context.groups) {
    for (const assignment of group.assignments) {
      for (const student of context.students) {
        if (student.student_email) {
          emailJobs.push({ group, assignment, student });
        } else {
          results.skipped += 1;
        }
      }
    }
  }

  // A small pool keeps Brevo delivery fast enough for the scheduler without
  // releasing all messages at once.
  let nextEmailJob = 0;
  async function sendNextEmail() {
    while (nextEmailJob < emailJobs.length) {
      const { group, assignment, student } = emailJobs[nextEmailJob];
      nextEmailJob += 1;
      try {
        await brevo.transactionalEmails.sendTransacEmail({
          sender: {
            name: "ClassFlow for Biovators",
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
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(5, emailJobs.length) },
      () => sendNextEmail(),
    ),
  );

  for (const group of context.groups) {
    // Email remains personal, but WhatsApp reminders are deliberately
    // published once per deadline window instead of once per student.
    if (sendGroup && group.assignments.length) {
      try {
        await sendWhatsAppGroup(
          ASSIGNMENT_REMINDER_GROUP_ID,
          assignmentGroupMessage(group),
        );
        results.whatsapp += 1;
      } catch (error) {
        results.failures.push({
          assignmentIds: group.assignments.map((assignment) => assignment.id),
          channel: "whatsapp_group",
          groupId: ASSIGNMENT_REMINDER_GROUP_ID,
          error: error.message,
        });
      }
    }
  }
  return results;
}

export async function GET(request) {
  const authorization = await authorizeAdmin(request, {
    allowReminderKey: true,
    allowWorkerKey: true,
  });
  if (authorization.error) return authorization.error;
  const searchParams = new URL(request.url).searchParams;
  if (searchParams.get("sample") === "true") {
    return Response.json(samplePreview());
  }
  if (!supabase) {
    return Response.json(
      { error: "Class data is not configured yet." },
      { status: 503 },
    );
  }

  try {
    const studentId = searchParams.get("studentId");
    const context = await loadReminderContext(studentId);
    return Response.json(preview(context, studentId));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authorization = await authorizeAdmin(request, {
    allowReminderKey: true,
    allowWorkerKey: true,
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

    const results = await deliver(context, { sendGroup: !studentId });
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
