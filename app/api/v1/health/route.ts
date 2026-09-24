import { NextResponse } from "next/server";
import { db } from "../../../../lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();
  try {
    // Quick probe to verify database connectivity
    await db.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    return NextResponse.json({
      status: "HEALTHY",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        status: "CONNECTED",
        latencyMs: latency
      },
      version: "0.1.0",
      environment: process.env.NODE_ENV || "development"
    }, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: "UNHEALTHY",
      timestamp: new Date().toISOString(),
      database: {
        status: "DISCONNECTED",
        error: error instanceof Error ? error.message : "Database probe failed"
      }
    }, {
      status: 503,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }
}
