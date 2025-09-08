import { NextResponse } from 'next/server';

// This endpoint is deprecated. Product images are now served directly from products.image_url and products.gallery.
// Calls here caused N+1 requests and have been removed from the app. Keep returning 410 to surface any stragglers in logs.
export async function GET() {
  return NextResponse.json({ error: 'Deprecated endpoint. Use products.image_url.' }, { status: 410 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Deprecated endpoint. Use products.image_url.' }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Deprecated endpoint. Use products.image_url.' }, { status: 410 });
}
