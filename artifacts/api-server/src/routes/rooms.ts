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

export default router;
