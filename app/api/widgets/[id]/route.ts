import { NextResponse } from 'next/server';
import { getWidget } from '@/app/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const widget = await getWidget(id);
  if (!widget) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(widget);
}
