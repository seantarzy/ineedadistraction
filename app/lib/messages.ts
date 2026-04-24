import { prisma } from './prisma';
import type { Message as PrismaMessage, Prisma } from '@prisma/client';

export type MessageRole = 'user' | 'assistant';
export type MessageKind = 'chat' | 'plan' | 'generate_result';

// Structured payloads keyed by kind — stored as JSON in Postgres.
export type PlanPayload = { summary: string; steps: string[] };
export type GenerateResultPayload = { version: number; stepCount?: number };
export type MessagePayload = PlanPayload | GenerateResultPayload | null;

export type Message = {
  id: string;
  draftId: string;
  role: MessageRole;
  kind: MessageKind;
  content: string;
  payload: MessagePayload;
  createdAt: number;
};

function toMessage(row: PrismaMessage): Message {
  return {
    id: row.id,
    draftId: row.draftId,
    role: row.role as MessageRole,
    kind: row.kind as MessageKind,
    content: row.content,
    payload: (row.payload ?? null) as MessagePayload,
    createdAt: row.createdAt.getTime(),
  };
}

export async function getMessages(draftId: string): Promise<Message[]> {
  const rows = await prisma.message.findMany({
    where: { draftId },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toMessage);
}

export async function addMessage(input: {
  draftId: string;
  role: MessageRole;
  kind: MessageKind;
  content: string;
  payload?: MessagePayload;
}): Promise<Message> {
  const row = await prisma.message.create({
    data: {
      draftId: input.draftId,
      role: input.role,
      kind: input.kind,
      content: input.content,
      payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  return toMessage(row);
}
