import { Router, type IRouter } from "express";
import { db, roomsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { pool } from "@workspace/db";
import {
  GetRoomParams,
  GetRoomPulseParams,
  ListQuestionsParams,
  ListQuestionsQueryParams,
  CreateQuestionParams,
  CreateQuestionBody,
  GetRoomResponse,
  GetRoomPulseResponse,
  CreateQuestionResponse,
} from "@workspace/api-zod";
import { getQuestionsForRoom, formatQuestion } from "../lib/questions-query";

const router: IRouter = Router();

// GET /rooms/:roomCode
router.get("/rooms/:roomCode", async (req, res): Promise<void> => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.roomCode, params.data.roomCode));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json(GetRoomResponse.parse({
    id: room.id,
    roomCode: room.roomCode,
    cohortName: room.cohortName,
    sessionName: room.sessionName,
    isLive: room.isLive,
    questionCount: 0,
    liveVoteThreshold: room.liveVoteThreshold,
  }));
});

// GET /rooms/:roomCode/pulse
router.get("/rooms/:roomCode/pulse", async (req, res): Promise<void> => {
  const params = GetRoomPulseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { roomCode } = params.data;

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.roomCode, roomCode));
  if (!room) {
    res.json(GetRoomPulseResponse.parse({
      memberCount: 0,
      openQuestions: 0,
      answeredToday: 0,
      liveVoteThreshold: 10,
    }));
    return;
  }

  const statsResult = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM questions WHERE room_code = $1 AND is_flagged = false
        AND NOT EXISTS (SELECT 1 FROM replies WHERE question_id = questions.id AND is_flagged = false))::int AS open_questions,
      (SELECT COUNT(*) FROM questions q2 WHERE q2.room_code = $1 AND q2.is_flagged = false
        AND EXISTS (SELECT 1 FROM replies WHERE question_id = q2.id AND is_flagged = false)
        AND q2.created_at >= NOW() - INTERVAL '1 day')::int AS answered_today,
      (SELECT COUNT(DISTINCT device_id) FROM questions WHERE room_code = $1
        AND created_at >= NOW() - INTERVAL '1 hour')::int AS member_count
  `, [roomCode]);

  const stats = statsResult.rows[0];

  res.json(GetRoomPulseResponse.parse({
    memberCount: stats.member_count || 0,
    openQuestions: stats.open_questions || 0,
    answeredToday: stats.answered_today || 0,
    liveVoteThreshold: room.liveVoteThreshold,
  }));
});

// GET /rooms/:roomCode/questions
router.get("/rooms/:roomCode/questions", async (req, res): Promise<void> => {
  const params = ListQuestionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const query = ListQuestionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const view = query.data.view ?? "rising";
  const deviceId = query.data.deviceId ?? "";

  const rows = await getQuestionsForRoom(params.data.roomCode, view, deviceId);
  const questions = rows.map((row) => formatQuestion(row, deviceId));

  res.json(questions);
});

// POST /rooms/:roomCode/questions
router.post("/rooms/:roomCode/questions", async (req, res): Promise<void> => {
  const params = CreateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreateQuestionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { title, body: questionBody, authorName, isAnonymous, tags, deviceId } = body.data;
  const roomCode = params.data.roomCode;

  // Ensure room exists, auto-create if not
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.roomCode, roomCode));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const result = await pool.query(`
    INSERT INTO questions (room_code, title, body, author_label, is_anonymous, device_id, tags)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, room_code, title, body, author_label, is_anonymous, device_id, tags, is_flagged, is_in_live_queue, created_at
  `, [
    roomCode,
    title,
    questionBody || null,
    authorName || "Anonymous",
    isAnonymous ?? false,
    deviceId,
    tags ?? [],
  ]);

  const q = result.rows[0];
  res.status(201).json(CreateQuestionResponse.parse({
    id: q.id,
    roomCode: q.room_code,
    title: q.title,
    body: q.body,
    authorLabel: q.is_anonymous ? "Anonymous" : q.author_label,
    isAnonymous: q.is_anonymous,
    voteCount: 0,
    followCount: 0,
    blockedCount: 0,
    replyCount: 0,
    hasReplies: false,
    status: "unanswered",
    tags: q.tags,
    claimedByTa: null,
    groupId: null,
    groupTitle: null,
    isInLiveQueue: false,
    viewerVoted: false,
    viewerFollows: false,
    viewerBlocked: false,
    viewerAsked: true,
    viewerReplied: false,
    lastReplyAt: null,
    risingScore: 0,
    createdAt: q.created_at.toISOString(),
  }));
});

// GET /rooms/:roomCode/participants
router.get("/rooms/:roomCode/participants", async (req, res): Promise<void> => {
  const roomCode = req.params.roomCode;
  if (!roomCode) { res.status(400).json({ error: "Missing roomCode" }); return; }

  const result = await pool.query(`
    SELECT name, bool_or(is_ta) AS is_ta
    FROM (
      SELECT q.author_label AS name, false AS is_ta
      FROM questions q
      WHERE q.room_code = $1 AND q.is_anonymous = false AND q.is_flagged = false
      UNION ALL
      SELECT r.author_label AS name, r.is_ta
      FROM replies r
      JOIN questions q ON q.id = r.question_id
      WHERE q.room_code = $1 AND r.is_flagged = false
    ) combined
    WHERE name IS NOT NULL AND name <> '' AND name <> 'Anonymous'
    GROUP BY name
    ORDER BY name ASC
  `, [roomCode]);

  res.json(result.rows.map((r) => ({ name: r.name as string, isTa: r.is_ta as boolean })));
});

// ── Similarity search helpers (module-scoped so they survive across requests) ─

const STOP = new Set([
  "a","an","the","is","it","in","of","on","at","to","for","do","does","did",
  "what","why","how","when","which","where","who","can","could","would","should",
  "will","am","are","was","were","be","been","being","have","has","had",
  "with","this","that","these","those","i","my","me","we","our","you","your",
  "he","his","she","her","they","their","and","or","but","not","no","its",
  "about","if","so","just","like","also","more","get","got","use","using",
]);

const simTokenize = (text: string): string[] =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));

const simCosine = (a: Record<string, number>, b: Record<string, number>): number => {
  let dot = 0, normA = 0, normB = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const av = a[k] ?? 0, bv = b[k] ?? 0;
    dot += av * bv; normA += av * av; normB += bv * bv;
  }
  return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

interface RoomSimCache {
  questionIds: string;                         // JSON of sorted id array — cheap change detection
  rows: { id: number; title: string }[];       // ordered question list
  tokens: Map<number, string[]>;               // tokenized title per question id
  df: Record<string, number>;                  // corpus document frequency
  vecs: Map<number, Record<string, number>>;   // TF-IDF vector per question id
}

const simCache = new Map<string, RoomSimCache>();

function buildVec(tokens: string[], df: Record<string, number>, N: number): Record<string, number> {
  const tf: Record<string, number> = {};
  for (const t of tokens) tf[t] = (tf[t] ?? 0) + 1;
  const vec: Record<string, number> = {};
  for (const [t, c] of Object.entries(tf))
    vec[t] = (c / tokens.length) * (Math.log((N + 1) / ((df[t] ?? 0) + 1)) + 1);
  return vec;
}

// POST /rooms/:roomCode/similar-questions
router.post("/rooms/:roomCode/similar-questions", async (req, res): Promise<void> => {
  const rawCode = Array.isArray(req.params.roomCode) ? req.params.roomCode[0] : req.params.roomCode;
  const roomCode = rawCode.toUpperCase();
  const query: unknown = (req.body as Record<string, unknown>).query;

  if (!query || typeof query !== "string" || query.trim().length < 6) {
    res.json([]);
    return;
  }

  const result = await pool.query(
    `SELECT id, title FROM questions WHERE room_code = $1 AND is_flagged = false ORDER BY created_at ASC`,
    [roomCode],
  );
  if (result.rows.length === 0) { res.json([]); return; }

  const rows: { id: number; title: string }[] = result.rows;
  const freshIds = JSON.stringify(rows.map((r) => r.id));
  let cache = simCache.get(roomCode);

  if (!cache || cache.questionIds !== freshIds) {
    // Determine which question ids are new vs already tokenized
    const prevTokens = cache?.tokens ?? new Map<number, string[]>();
    const newTokens = new Map<number, string[]>(prevTokens);
    for (const row of rows) {
      if (!newTokens.has(row.id)) {
        newTokens.set(row.id, simTokenize(row.title));
      }
    }

    // Recompute document frequency from full corpus
    const df: Record<string, number> = {};
    for (const row of rows) {
      for (const t of new Set(newTokens.get(row.id) ?? [])) {
        df[t] = (df[t] ?? 0) + 1;
      }
    }
    const N = rows.length;

    // Recompute TF-IDF vectors (IDF changed so all must be refreshed)
    const vecs = new Map<number, Record<string, number>>();
    for (const row of rows) {
      vecs.set(row.id, buildVec(newTokens.get(row.id) ?? [], df, N));
    }

    cache = { questionIds: freshIds, rows, tokens: newTokens, df, vecs };
    simCache.set(roomCode, cache);
  }

  // Vectorize query against cached IDF (never cached — query changes every call)
  const queryTokens = simTokenize(query);
  if (queryTokens.length === 0) { res.json([]); return; }
  const N = cache.rows.length;
  const queryVec = buildVec(queryTokens, cache.df, N);

  const matches = cache.rows
    .map((q) => ({ id: q.id, title: q.title, score: simCosine(queryVec, cache!.vecs.get(q.id)!) }))
    .filter((m) => m.score > 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ id, title }) => ({ id, title }));

  res.json(matches);
});

export default router;
