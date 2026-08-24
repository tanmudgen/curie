import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import {
  GetQuestionParams,
  GetQuestionQueryParams,
  VoteQuestionParams,
  VoteQuestionBody,
  UnvoteQuestionParams,
  UnvoteQuestionBody,
  CreateReplyParams,
  CreateReplyBody,
  MarkReplyHelpfulParams,
  MarkReplyHelpfulBody,
  UnmarkReplyHelpfulBody,
  FollowQuestionParams,
  FollowQuestionBody,
  UnfollowQuestionParams,
  UnfollowQuestionBody,
  BlockQuestionParams,
  BlockQuestionBody,
  UnblockQuestionParams,
  UnblockQuestionBody,
  GetQuestionResponse,
  VoteQuestionResponse,
  UnvoteQuestionResponse,
  CreateReplyResponse,
  MarkReplyHelpfulResponse,
  FollowQuestionResponse,
  UnfollowQuestionResponse,
  BlockQuestionResponse,
  UnblockQuestionResponse,
  ResolveQuestionBody,
  ResolveQuestionResponse,
} from "@workspace/api-zod";
import { getQuestionById, formatQuestion } from "../lib/questions-query";
import { parseTaSession } from "../lib/ta-auth";
import { countWords, MAX_CONTENT_WORDS } from "../lib/word-count";

const router: IRouter = Router();

async function setQuestionResolved(
  req: Request,
  res: Response,
  id: number,
  resolved: boolean,
): Promise<void> {
  const body = ResolveQuestionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const taSession = parseTaSession(req);
  const questionResult = await pool.query(
    `SELECT device_id FROM questions WHERE id = $1 AND is_flagged = false`,
    [id],
  );
  if (questionResult.rows.length === 0) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  if (!taSession && questionResult.rows[0].device_id !== body.data.deviceId) {
    res.status(403).json({ error: "Only the question author or a TA may change resolution" });
    return;
  }

  await pool.query(`UPDATE questions SET is_resolved = $1 WHERE id = $2`, [resolved, id]);
  res.json(ResolveQuestionResponse.parse({ resolved }));
}

// GET /questions/:id
router.get("/questions/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid question id" });
    return;
  }

  const query = GetQuestionQueryParams.safeParse(req.query);
  const deviceId = query.success ? (query.data.deviceId ?? "") : "";

  const row = await getQuestionById(id, deviceId);
  if (!row) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const question = formatQuestion(row, deviceId);

  // Fetch replies
  const repliesResult = await pool.query(`
    SELECT r.id, r.question_id, r.body, r.author_label, r.is_ta, r.ta_name, r.created_at,
      COUNT(DISTINCT hm.id)::int AS helpful_count,
      EXISTS(SELECT 1 FROM helpful_marks WHERE reply_id = r.id AND device_id = $2) AS viewer_marked_helpful
    FROM replies r
    LEFT JOIN helpful_marks hm ON hm.reply_id = r.id
    WHERE r.question_id = $1 AND r.is_flagged = false
    GROUP BY r.id
    ORDER BY r.created_at ASC
  `, [id, deviceId]);

  const replies = repliesResult.rows.map((r) => ({
    id: r.id,
    questionId: r.question_id,
    body: r.body,
    authorLabel: r.author_label,
    isTa: r.is_ta,
    helpfulCount: r.helpful_count,
    viewerMarkedHelpful: !!r.viewer_marked_helpful,
    createdAt: r.created_at.toISOString(),
  }));

  // Fetch group reply if in group
  let groupReply = null;
  if (question.groupId) {
    const grResult = await pool.query(`
      SELECT id, group_id, body, ta_name, created_at FROM group_replies WHERE group_id = $1 LIMIT 1
    `, [question.groupId]);
    if (grResult.rows.length > 0) {
      const gr = grResult.rows[0];
      groupReply = {
        id: gr.id,
        groupId: gr.group_id,
        body: gr.body,
        taName: gr.ta_name,
        createdAt: gr.created_at.toISOString(),
      };
    }
  }

  res.json(GetQuestionResponse.parse({
    ...question,
    replies,
    ...(groupReply ? { groupReply } : {}),
  }));
});

// POST /questions/:id/resolve — question author or TA
router.post("/questions/:id/resolve", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await setQuestionResolved(req, res, id, true);
});

// DELETE /questions/:id/resolve — question author or TA
router.delete("/questions/:id/resolve", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await setQuestionResolved(req, res, id, false);
});

// POST /questions/:id/vote
router.post("/questions/:id/vote", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = VoteQuestionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const { deviceId } = body.data;

  await pool.query(`
    INSERT INTO votes (question_id, device_id) VALUES ($1, $2)
    ON CONFLICT (question_id, device_id) DO NOTHING
  `, [id, deviceId]);

  const result = await pool.query(`
    SELECT COUNT(*)::int AS vote_count,
      EXISTS(SELECT 1 FROM votes WHERE question_id = $1 AND device_id = $2) AS viewer_voted
    FROM votes WHERE question_id = $1
  `, [id, deviceId]);

  res.json(VoteQuestionResponse.parse({
    voteCount: result.rows[0].vote_count,
    viewerVoted: !!result.rows[0].viewer_voted,
  }));
});

// DELETE /questions/:id/vote
router.delete("/questions/:id/vote", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = UnvoteQuestionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  await pool.query(`DELETE FROM votes WHERE question_id = $1 AND device_id = $2`, [id, body.data.deviceId]);

  const result = await pool.query(`SELECT COUNT(*)::int AS vote_count FROM votes WHERE question_id = $1`, [id]);

  res.json(UnvoteQuestionResponse.parse({
    voteCount: result.rows[0].vote_count,
    viewerVoted: false,
  }));
});

// POST /questions/:id/replies
router.post("/questions/:id/replies", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = CreateReplyBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const { body: replyBody, authorName, deviceId } = body.data;
  if (countWords(replyBody) > MAX_CONTENT_WORDS) {
    res.status(400).json({ error: `Replies are limited to ${MAX_CONTENT_WORDS} words` });
    return;
  }

  const taSession = parseTaSession(req);
  const isTa = !!taSession;
  const taName = taSession?.taName ?? null;
  const label = isTa ? (taName ?? "TA") : (authorName || "Anonymous");

  const result = await pool.query(`
    INSERT INTO replies (question_id, body, author_label, device_id, is_ta, ta_name)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, question_id, body, author_label, is_ta, ta_name, created_at
  `, [id, replyBody, label, deviceId, isTa, taName]);

  const r = result.rows[0];
  res.status(201).json(CreateReplyResponse.parse({
    id: r.id,
    questionId: r.question_id,
    body: r.body,
    authorLabel: r.author_label,
    isTa: r.is_ta,
    helpfulCount: 0,
    viewerMarkedHelpful: false,
    createdAt: r.created_at.toISOString(),
  }));
});

// POST /replies/:id/helpful
router.post("/replies/:id/helpful", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = MarkReplyHelpfulBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  await pool.query(`
    INSERT INTO helpful_marks (reply_id, device_id) VALUES ($1, $2)
    ON CONFLICT (reply_id, device_id) DO NOTHING
  `, [id, body.data.deviceId]);

  const result = await pool.query(`
    SELECT COUNT(*)::int AS helpful_count,
      EXISTS(SELECT 1 FROM helpful_marks WHERE reply_id = $1 AND device_id = $2) AS viewer_marked
    FROM helpful_marks WHERE reply_id = $1
  `, [id, body.data.deviceId]);

  res.json(MarkReplyHelpfulResponse.parse({
    helpfulCount: result.rows[0].helpful_count,
    viewerMarkedHelpful: !!result.rows[0].viewer_marked,
  }));
});

// DELETE /replies/:id/helpful
router.delete("/replies/:id/helpful", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = UnmarkReplyHelpfulBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  await pool.query(`
    DELETE FROM helpful_marks WHERE reply_id = $1 AND device_id = $2
  `, [id, body.data.deviceId]);

  const result = await pool.query(`
    SELECT COUNT(*)::int AS helpful_count,
      EXISTS(SELECT 1 FROM helpful_marks WHERE reply_id = $1 AND device_id = $2) AS viewer_marked
    FROM helpful_marks WHERE reply_id = $1
  `, [id, body.data.deviceId]);

  res.json(MarkReplyHelpfulResponse.parse({
    helpfulCount: result.rows[0].helpful_count,
    viewerMarkedHelpful: !!result.rows[0].viewer_marked,
  }));
});

// POST /questions/:id/follow
router.post("/questions/:id/follow", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = FollowQuestionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  await pool.query(`
    INSERT INTO follows (question_id, device_id) VALUES ($1, $2)
    ON CONFLICT (question_id, device_id) DO NOTHING
  `, [id, body.data.deviceId]);

  const result = await pool.query(`
    SELECT COUNT(*)::int AS follow_count,
      EXISTS(SELECT 1 FROM follows WHERE question_id = $1 AND device_id = $2) AS viewer_follows
    FROM follows WHERE question_id = $1
  `, [id, body.data.deviceId]);

  res.json(FollowQuestionResponse.parse({
    followCount: result.rows[0].follow_count,
    viewerFollows: !!result.rows[0].viewer_follows,
  }));
});

// DELETE /questions/:id/follow
router.delete("/questions/:id/follow", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = UnfollowQuestionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  await pool.query(`DELETE FROM follows WHERE question_id = $1 AND device_id = $2`, [id, body.data.deviceId]);

  const result = await pool.query(`SELECT COUNT(*)::int AS follow_count FROM follows WHERE question_id = $1`, [id]);

  res.json(UnfollowQuestionResponse.parse({
    followCount: result.rows[0].follow_count,
    viewerFollows: false,
  }));
});

// POST /questions/:id/blocked
router.post("/questions/:id/blocked", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = BlockQuestionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  await pool.query(`
    INSERT INTO blocked_signals (question_id, device_id) VALUES ($1, $2)
    ON CONFLICT (question_id, device_id) DO NOTHING
  `, [id, body.data.deviceId]);

  const result = await pool.query(`
    SELECT COUNT(*)::int AS blocked_count,
      EXISTS(SELECT 1 FROM blocked_signals WHERE question_id = $1 AND device_id = $2) AS viewer_blocked
    FROM blocked_signals WHERE question_id = $1
  `, [id, body.data.deviceId]);

  res.json(BlockQuestionResponse.parse({
    blockedCount: result.rows[0].blocked_count,
    viewerBlocked: !!result.rows[0].viewer_blocked,
  }));
});

// DELETE /questions/:id/blocked
router.delete("/questions/:id/blocked", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = UnblockQuestionBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  await pool.query(`DELETE FROM blocked_signals WHERE question_id = $1 AND device_id = $2`, [id, body.data.deviceId]);

  const result = await pool.query(`SELECT COUNT(*)::int AS blocked_count FROM blocked_signals WHERE question_id = $1`, [id]);

  res.json(UnblockQuestionResponse.parse({
    blockedCount: result.rows[0].blocked_count,
    viewerBlocked: false,
  }));
});

export default router;
