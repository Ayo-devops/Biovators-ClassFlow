import { createClient } from "@supabase/supabase-js";
import { registrationRecord } from "../../../lib/registration";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
      )
    : null;

// GET - fetch all students
export async function GET() {
  if (!supabase)
    return Response.json(
      { error: "Class data is not configured yet." },
      { status: 503 },
    );
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("student_name", { ascending: true });

  if (error) return Response.json({ error }, { status: 500 });
  return Response.json(data);
}

// POST - add a new student
export async function POST(request) {
  if (!supabase)
    return Response.json(
      { error: "Class data is not configured yet." },
      { status: 503 },
    );
  const body = await request.json();

  const { data, error } = await supabase
    .from("students")
    .insert([registrationRecord(body)])
    .select()
    .single();

  if (error) return Response.json({ error }, { status: 500 });
  return Response.json(data, { status: 201 });
}
