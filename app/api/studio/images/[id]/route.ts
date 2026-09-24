import { NextResponse } from "next/server";
import { db } from "../../../../../lib/server/db";

export const runtime = "nodejs";
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!/^[a-z0-9]{20,40}$/.test(params.id)) return new NextResponse(null, { status: 404 });
  const image = await db.studioImage.findUnique({ where: { id: params.id } });
  if (!image) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(image.data), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
