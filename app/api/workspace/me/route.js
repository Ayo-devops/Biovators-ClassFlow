import { authorizeWorkspaceMember } from "../../../../lib/admin-auth";

export async function GET(request) {
  const authorization = await authorizeWorkspaceMember(request);
  if (authorization.error) return authorization.error;
  return Response.json({
    role: authorization.actor,
    email: authorization.user.email,
  });
}
