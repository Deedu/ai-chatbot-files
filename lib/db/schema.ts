// This file provides type definitions for backward compatibility
import type { VisibilityType } from "@/components/visibility-selector";
import type { ArtifactKind } from "@/components/artifact";

// Define User type
export type User = {
  id: string;
  email: string;
  password: string | null;
};

// Define Chat type
export type Chat = {
  id: string;
  createdAt: Date;
  title: string;
  userId: string;
  visibility: VisibilityType;
};

// Define Message (deprecated) type
export type MessageDeprecated = {
  id: string;
  chatId: string;
  role: string;
  content: any;
  createdAt: Date;
};

// Define Message_v2 type (current version)
export type DBMessage = {
  id: string;
  chatId: string;
  role: string;
  parts: any;
  attachments: any;
  createdAt: Date;
};

// Define Vote (deprecated) type
export type VoteDeprecated = {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
};

// Define Vote_v2 type (current version)
export type Vote = {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
};

// Define Document type
export type Document = {
  id: string;
  createdAt: Date;
  title: string;
  content: string | null;
  kind: ArtifactKind;
  userId: string;
};

// Define Suggestion type
export type Suggestion = {
  id: string;
  documentId: string;
  documentCreatedAt: Date;
  originalText: string;
  suggestedText: string;
  description: string | null;
  isResolved: boolean;
  userId: string;
  createdAt: Date;
};
