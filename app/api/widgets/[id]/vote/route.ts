import { NextResponse } from 'next/server';
import { voteWidget, unvoteWidget } from '@/app/lib/store';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const widget = voteWidget(id);
  if (!widget) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(widget);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const widget = unvoteWidget(id);
  if (!widget) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(widget);
}
