// Only import server-only in a Next.js environment
if (process.env.NEXT_RUNTIME) {
  require("server-only");
}

import { genSaltSync, hashSync } from "bcrypt-ts";
import { prisma } from "./prisma";
import type { ArtifactKind } from "@/components/artifact";

// Export types from our schema.ts file for backward compatibility
export type {
  User,
  Chat,
  DBMessage,
  MessageDeprecated,
  Vote,
  VoteDeprecated,
  Document,
  Suggestion,
} from "./schema";

export async function getUser(email: string): Promise<Array<any>> {
  try {
    // Use findFirst instead of findUnique since email is not a unique field in the Prisma schema
    const user = await prisma.user.findFirst({
      where: { email },
    });
    return user ? [user] : [];
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await prisma.user.create({
      data: { email, password: hash },
    });
  } catch (error) {
    console.error("Failed to create user in database");
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await prisma.chat.create({
      data: {
        id,
        createdAt: new Date(),
        userId,
        title,
      },
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    // Delete votes first due to foreign key constraints
    await prisma.vote_v2.deleteMany({
      where: { chatId: id },
    });

    // Delete messages
    await prisma.message_v2.deleteMany({
      where: { chatId: id },
    });

    // Delete the chat
    return await prisma.chat.delete({
      where: { id },
    });
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    let queryCondition = {};

    if (startingAfter) {
      const selectedChat = await prisma.chat.findUnique({
        where: { id: startingAfter },
      });

      if (!selectedChat) {
        throw new Error(`Chat with id ${startingAfter} not found`);
      }

      queryCondition = {
        createdAt: { gt: selectedChat.createdAt },
      };
    } else if (endingBefore) {
      const selectedChat = await prisma.chat.findUnique({
        where: { id: endingBefore },
      });

      if (!selectedChat) {
        throw new Error(`Chat with id ${endingBefore} not found`);
      }

      queryCondition = {
        createdAt: { lt: selectedChat.createdAt },
      };
    }

    const filteredChats = await prisma.chat.findMany({
      where: {
        userId: id,
        ...queryCondition,
      },
      orderBy: { createdAt: "desc" },
      take: extendedLimit,
    });

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    console.error("Failed to get chats by user from database");
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    return await prisma.chat.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<any> }) {
  try {
    return await prisma.message_v2.createMany({
      data: messages,
    });
  } catch (error) {
    console.error("Failed to save messages in database", error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await prisma.message_v2.findMany({
      where: { chatId: id },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    console.error("Failed to get messages by chat id from database", error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const existingVote = await prisma.vote_v2.findUnique({
      where: {
        chatId_messageId: {
          chatId,
          messageId,
        },
      },
    });

    if (existingVote) {
      return await prisma.vote_v2.update({
        where: {
          chatId_messageId: {
            chatId,
            messageId,
          },
        },
        data: { isUpvoted: type === "up" },
      });
    }

    return await prisma.vote_v2.create({
      data: {
        chatId,
        messageId,
        isUpvoted: type === "up",
      },
    });
  } catch (error) {
    console.error("Failed to upvote message in database", error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await prisma.vote_v2.findMany({
      where: { chatId: id },
    });
  } catch (error) {
    console.error("Failed to get votes by chat id from database", error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await prisma.document.create({
      data: {
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to save document in database");
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    return await prisma.document.findMany({
      where: { id },
      orderBy: { createdAt: "asc" },
    });
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const document = await prisma.document.findFirst({
      where: { id },
      orderBy: { createdAt: "desc" },
    });

    return document;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    // First delete related suggestions
    await prisma.suggestion.deleteMany({
      where: {
        documentId: id,
        documentCreatedAt: { gt: timestamp },
      },
    });

    // Then delete the documents
    return await prisma.document.deleteMany({
      where: {
        id,
        createdAt: { gt: timestamp },
      },
    });
  } catch (error) {
    console.error(
      "Failed to delete documents by id after timestamp from database"
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<any>;
}) {
  try {
    return await prisma.suggestion.createMany({
      data: suggestions,
    });
  } catch (error) {
    console.error("Failed to save suggestions in database");
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await prisma.suggestion.findMany({
      where: { documentId },
    });
  } catch (error) {
    console.error(
      "Failed to get suggestions by document version from database"
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await prisma.message_v2.findMany({
      where: { id },
    });
  } catch (error) {
    console.error("Failed to get message by id from database");
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    // Find messages to delete
    const messagesToDelete = await prisma.message_v2.findMany({
      where: {
        chatId,
        createdAt: { gte: timestamp },
      },
      select: { id: true },
    });

    const messageIds = messagesToDelete.map(
      (message: { id: string }) => message.id
    );

    if (messageIds.length > 0) {
      // Delete votes first
      await prisma.vote_v2.deleteMany({
        where: {
          chatId,
          messageId: { in: messageIds },
        },
      });

      // Then delete messages
      return await prisma.message_v2.deleteMany({
        where: {
          chatId,
          id: { in: messageIds },
        },
      });
    }
  } catch (error) {
    console.error(
      "Failed to delete messages by id after timestamp from database"
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await prisma.chat.update({
      where: { id: chatId },
      data: { visibility },
    });
  } catch (error) {
    console.error("Failed to update chat visibility in database");
    throw error;
  }
}

export async function ensureUserExists(id: string, email: string) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (existingUser) {
      return existingUser;
    }

    // Create user if they don't exist
    return await prisma.user.create({
      data: {
        id,
        email,
      },
    });
  } catch (error) {
    console.error("Failed to ensure user exists in database", error);
    throw error;
  }
}
