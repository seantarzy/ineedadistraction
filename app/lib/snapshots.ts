import { prisma } from './prisma';
import type { Snapshot as PrismaSnapshot } from '@prisma/client';

export type Snapshot = {
  id: string;
  draftId: string;
  version: number;
  html: string;
  createdAt: number;
};

function toSnapshot(row: PrismaSnapshot): Snapshot {
  return {
    id: row.id,
    draftId: row.draftId,
    version: row.version,
    html: row.html,
    createdAt: row.createdAt.getTime(),
  };
}

export async function getSnapshot(id: string): Promise<Snapshot | undefined> {
  const row = await prisma.snapshot.findUnique({ where: { id } });
  return row ? toSnapshot(row) : undefined;
}

export async function createSnapshot(draftId: string, version: number, html: string): Promise<Snapshot> {
  const row = await prisma.snapshot.create({
    data: { draftId, version, html },
  });
  return toSnapshot(row);
}
