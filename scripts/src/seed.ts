/**
 * Idempotent seed script — creates the default room if it does not already exist.
 * Run with: pnpm --filter @workspace/scripts run seed
 */
import { db } from "@workspace/db";
import { roomsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_ROOMS = [
  {
    roomCode: "AGENTS-W4",
    cohortName: "Cohort Table",
    sessionName: "Week 4 — Agent Tool Loops",
    isLive: true as const,
    liveVoteThreshold: 10,
  },
];

async function seed() {
  for (const room of DEFAULT_ROOMS) {
    const existing = await db
      .select({ id: roomsTable.id })
      .from(roomsTable)
      .where(eq(roomsTable.roomCode, room.roomCode))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(roomsTable).values(room);
      console.log(`Created room: ${room.roomCode}`);
    } else {
      console.log(`Room already exists: ${room.roomCode}`);
    }
  }
  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
