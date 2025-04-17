import { NextRequest } from "next/server";
import { getChatsByUserId } from "@/lib/db/queries";
import { verifyAuth } from "@/utils/verify-auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = parseInt(searchParams.get("limit") || "10");
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");

  if (startingAfter && endingBefore) {
    return Response.json(
      "Only one of starting_after or ending_before can be provided!",
      { status: 400 }
    );
  }

  try {
    const user = await verifyAuth();

    const chats = await getChatsByUserId({
      id: user.id,
      limit,
      startingAfter,
      endingBefore,
    });

    return Response.json(chats);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return Response.json("Failed to fetch chats!", { status: 500 });
  }
}
