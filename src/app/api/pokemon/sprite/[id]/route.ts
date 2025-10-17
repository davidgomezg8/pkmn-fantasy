// src/app/api/pokemon/sprite/[id]/route.ts
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const id = params.id;
  console.log(`[SPRITE PROXY] Received request for Pokemon ID: ${id}`);

  if (!id || id === 'undefined') {
    console.error('[SPRITE PROXY] Error: Invalid ID received.');
    return new NextResponse('Invalid ID', { status: 400 });
  }

  const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  console.log(`[SPRITE PROXY] Fetching image from URL: ${imageUrl}`);

  try {
    const response = await fetch(imageUrl);
    console.log(`[SPRITE PROXY] Fetched from ${imageUrl}. Status: ${response.status}`);

    if (!response.ok) {
      console.error(`[SPRITE PROXY] Error: Failed to fetch image. Status: ${response.status} ${response.statusText}`);
      return new NextResponse('Image not found', { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    console.log(`[SPRITE PROXY] Successfully fetched image. Content-Type: ${contentType}. Size: ${imageBuffer.byteLength} bytes.`);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache', // Disable cache for debugging
      },
    });
  } catch (error: unknown) {
    console.error(`[SPRITE PROXY] CRITICAL ERROR fetching image for ID ${id}:`, error);
    // Check for proxy-related errors
    if (error.cause?.code) {
      console.error(`[SPRITE PROXY] Underlying error code: ${error.cause.code}`);
    }
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
