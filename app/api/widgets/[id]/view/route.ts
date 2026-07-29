import { NextResponse } from 'next/server';
import { incrementWidgetViews } from '@/app/lib/store';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const widget = await incrementWidgetViews(id);
  if (!widget) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ views: widget.views });
}
