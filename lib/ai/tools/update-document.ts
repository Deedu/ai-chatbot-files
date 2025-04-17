import { type DataStreamWriter, tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { getDocumentById } from "@/lib/db/queries";
import { documentHandlersByArtifactKind } from "@/lib/artifacts/server";
import type { ArtifactKind } from "@/components/artifact";

interface UpdateDocumentProps {
  session: Session;
  dataStream: DataStreamWriter;
}

export const updateDocument = ({ session, dataStream }: UpdateDocumentProps) =>
  tool({
    description: "Update a document with the given description.",
    parameters: z.object({
      id: z.string().describe("The ID of the document to update"),
      description: z
        .string()
        .describe("The description of changes that need to be made"),
    }),
    execute: async ({ id, description }) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return {
          error: "Document not found",
        };
      }

      dataStream.writeData({
        type: "clear",
        content: document.title,
      });

      // Ensure the document.kind is one of the valid ArtifactKind values
      const documentKind = document.kind as ArtifactKind;

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === documentKind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${documentKind}`);
      }

      await documentHandler.onUpdateDocument({
        document: {
          ...document,
          kind: documentKind,
        },
        description,
        dataStream,
        session,
      });

      dataStream.writeData({ type: "finish", content: "" });

      return {
        id,
        title: document.title,
        kind: documentKind,
        content: "The document has been updated successfully.",
      };
    },
  });
