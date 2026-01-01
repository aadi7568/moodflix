import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Mood analysis feature is not yet implemented',
    },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Mood analysis feature is not yet implemented',
    },
    { status: 501 }
  );
}

