import { authorizeAdmin } from "../../../../lib/admin-auth";
import {
  listWhatsAppGroups,
  sendWhatsAppGroup,
} from "../../../../lib/whatsapp-server";

export async function GET(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;

  try {
    const data = await listWhatsAppGroups();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 502 });
  }
}

export async function POST(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;

  try {
    const { groupId, message } = await request.json();
    if (
      typeof groupId !== "string" ||
      !groupId.endsWith("@g.us") ||
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 4096
    ) {
      return Response.json(
        { error: "Choose a group and enter a message of up to 4096 characters." },
        { status: 400 },
      );
    }

    const data = await sendWhatsAppGroup(groupId, message.trim());
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 502 });
  }
}
