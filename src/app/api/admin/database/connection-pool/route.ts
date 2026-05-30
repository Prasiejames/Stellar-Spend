import { NextRequest, NextResponse } from "next/server";
import { connectionPoolManager } from "@/lib/db/connection-pool";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const stats = connectionPoolManager.getAllPoolStats();
    return NextResponse.json({ poolStats: stats });
  } catch (error) {
    logger.error("Failed to fetch connection pool stats", { error });
    return NextResponse.json(
      { error: "Failed to fetch connection pool stats" },
      { status: 500 },
    );
  }
}
