import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  TaLoginBody,
  TaLoginResponse,
  TaLogoutResponse,
  GetTaMeResponse,
  ClaimQuestionParams,
  ClaimQuestionResponse,
  ReleaseQuestionParams,
  ReleaseQuestionResponse,
  ListQuestionGroupsQueryParams,
  ListQuestionGroupsResponse,
  CreateQuestionGroupBody,
  CreateQuestionGroupResponse,
  AddGroupMemberParams,
  AddGroupMemberBody,
  AddGroupMemberResponse,
  RemoveGroupMemberParams,
  RemoveGroupMemberResponse,
  CreateGroupReplyParams,
  CreateGroupReplyBody,
  CreateGroupReplyResponse,
  FlagQuestionParams,
  FlagQuestionResponse,
  SendToLiveQueueParams,
  SendToLiveQueueResponse,
  GetTaDeskParams,
  GetTaDeskResponse,
} from "@workspace/api-zod";
import {
  verifyTaPassword,
  createSessionCookie,
  clearSessionCookie,
  parseTaSession,
  requireTa,
} from "../lib/ta-auth";
import { getQuestionsForDesk, formatQuestion } from "../lib/questions-query";

const router: IRouter = Router();

// POST /ta/login
router.post("/ta/login", async (req, res): Promise<void> => {
  const body = TaLoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { name, password } = body.data;

  if (!verifyTaPassword(password)) {
    res.status(401).json({ error: "Invalid TA password" });
    return;
  }

  if (!name || name.trim().length === 0) {
    res.status(400).json({ error: "TA name is required" });
    return;
  }

  createSessionCookie(res, name.trim());

  res.json(TaLoginResponse.parse({ taName: name.trim(), loggedIn: true }));
});

// POST /ta/logout
router.post("/ta/logout", async (req, res): Promise<void> => {
  clearSessionCookie(res);
  res.json(TaLogoutResponse.parse({ ok: true, message: "Logged out" }));
});

// GET /ta/me
router.get("/ta/me", async (req, res): Promise<void> => {
  const session = parseTaSession(req);
  if (!session) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(GetTaMeResponse.parse({ taName: session.taName, loggedIn: true }));
});

// POST /ta/questions/:id/claim
router.post("/ta/questions/:id/claim", requireTa, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const taName = req.taName!;

  await pool.query(`
    INSERT INTO ta_claims (question_id, ta_name) VALUES ($1, $2)
    ON CONFLICT (question_id) DO UPDATE SET ta_name = $2
  `, [id, taName]);

  res.json(ClaimQuestionResponse.parse({ claimed: true, claimedByTa: taName }));
});

// DELETE /ta/questions/:id/claim
router.delete("/ta/questions/:id/claim", requireTa, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await pool.query(`DELETE FROM ta_claims WHERE question_id = $1`, [id]);

  res.json(ReleaseQuestionResponse.parse({ claimed: false, claimedByTa: null }));
});

// GET /ta/question-groups
router.get("/ta/question-groups", requireTa, async (req, res): Promise<void> => {
  const query = ListQuestionGroupsQueryParams.safeParse(req.query);
  const roomCode = query.success ? query.data.roomCode : undefined;

  let sql = `
    SELECT qg.id, qg.title, qg.created_at,
      COALESCE(array_agg(qgm.question_id ORDER BY qgm.created_at) FILTER (WHERE qgm.question_id IS NOT NULL), '{}') AS question_ids,
      COUNT(qgm.id)::int AS question_count,
      gr.id AS gr_id, gr.body AS gr_body, gr.ta_name AS gr_ta, gr.created_at AS gr_created_at
    FROM question_groups qg
    LEFT JOIN question_group_members qgm ON qgm.group_id = qg.id
    LEFT JOIN group_replies gr ON gr.group_id = qg.id
  `;

  const params: string[] = [];
  if (roomCode) {
    sql += ` WHERE qg.room_code = $1`;
    params.push(roomCode);
  }

  sql += ` GROUP BY qg.id, qg.title, qg.created_at, gr.id, gr.body, gr.ta_name, gr.created_at ORDER BY qg.created_at DESC`;

  const result = await pool.query(sql, params);

  const groups = result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    questionIds: row.question_ids as number[],
    questionCount: row.question_count,
    groupReply: row.gr_id ? {
      id: row.gr_id,
      groupId: row.id,
      body: row.gr_body,
      taName: row.gr_ta,
      createdAt: row.gr_created_at.toISOString(),
    } : undefined,
    createdAt: row.created_at.toISOString(),
  }));

  res.json(ListQuestionGroupsResponse.parse(groups));
});

// POST /ta/question-groups
router.post("/ta/question-groups", requireTa, async (req, res): Promise<void> => {
  const body = CreateQuestionGroupBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const taName = req.taName!;
  const { title, questionIds } = body.data;

  // Get roomCode from first question
  const qResult = await pool.query(`SELECT room_code FROM questions WHERE id = $1`, [questionIds[0]]);
  if (qResult.rows.length === 0) { res.status(400).json({ error: "Invalid question" }); return; }
  const roomCode = qResult.rows[0].room_code;

  const grpResult = await pool.query(`
    INSERT INTO question_groups (room_code, title, created_by_ta) VALUES ($1, $2, $3) RETURNING id, title, created_at
  `, [roomCode, title, taName]);

  const group = grpResult.rows[0];

  // Add members
  for (const qid of questionIds) {
    await pool.query(`
      INSERT INTO question_group_members (group_id, question_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
    `, [group.id, qid]);
  }

  res.status(201).json(CreateQuestionGroupResponse.parse({
    id: group.id,
    title: group.title,
    questionIds,
    questionCount: questionIds.length,
    createdAt: group.created_at.toISOString(),
  }));
});

// POST /ta/question-groups/:id/members
router.post("/ta/question-groups/:id/members", requireTa, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = AddGroupMemberBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  await pool.query(`
    INSERT INTO question_group_members (group_id, question_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
  `, [id, body.data.questionId]);

  const result = await pool.query(`
    SELECT qg.id, qg.title, qg.created_at,
      COALESCE(array_agg(qgm.question_id ORDER BY qgm.created_at) FILTER (WHERE qgm.question_id IS NOT NULL), '{}') AS question_ids,
      COUNT(qgm.id)::int AS question_count
    FROM question_groups qg
    LEFT JOIN question_group_members qgm ON qgm.group_id = qg.id
    WHERE qg.id = $1
    GROUP BY qg.id
  `, [id]);

  const row = result.rows[0];
  res.json(AddGroupMemberResponse.parse({
    id: row.id,
    title: row.title,
    questionIds: row.question_ids,
    questionCount: row.question_count,
    createdAt: row.created_at.toISOString(),
  }));
});

// DELETE /ta/question-groups/:id/members/:questionId
router.delete("/ta/question-groups/:id/members/:questionId", requireTa, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawQid = Array.isArray(req.params.questionId) ? req.params.questionId[0] : req.params.questionId;
  const id = parseInt(rawId, 10);
  const qid = parseInt(rawQid, 10);
  if (isNaN(id) || isNaN(qid)) { res.status(400).json({ error: "Invalid id" }); return; }

  await pool.query(`DELETE FROM question_group_members WHERE group_id = $1 AND question_id = $2`, [id, qid]);

  const result = await pool.query(`
    SELECT qg.id, qg.title, qg.created_at,
      COALESCE(array_agg(qgm.question_id ORDER BY qgm.created_at) FILTER (WHERE qgm.question_id IS NOT NULL), '{}') AS question_ids,
      COUNT(qgm.id)::int AS question_count
    FROM question_groups qg
    LEFT JOIN question_group_members qgm ON qgm.group_id = qg.id
    WHERE qg.id = $1
    GROUP BY qg.id
  `, [id]);

  const row = result.rows[0];
  res.json(RemoveGroupMemberResponse.parse({
    id: row.id,
    title: row.title,
    questionIds: row.question_ids,
    questionCount: row.question_count,
    createdAt: row.created_at.toISOString(),
  }));
});

// POST /ta/question-groups/:id/reply
router.post("/ta/question-groups/:id/reply", requireTa, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = CreateGroupReplyBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

  const taName = req.taName!;

  const result = await pool.query(`
    INSERT INTO group_replies (group_id, body, ta_name) VALUES ($1, $2, $3)
    ON CONFLICT (group_id) DO UPDATE SET body = $2, ta_name = $3
    RETURNING id, group_id, body, ta_name, created_at
  `, [id, body.data.body, taName]);

  const gr = result.rows[0];
  res.status(201).json(CreateGroupReplyResponse.parse({
    id: gr.id,
    groupId: gr.group_id,
    body: gr.body,
    taName: gr.ta_name,
    createdAt: gr.created_at.toISOString(),
  }));
});

// POST /ta/questions/:id/flag
router.post("/ta/questions/:id/flag", requireTa, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await pool.query(`UPDATE questions SET is_flagged = true WHERE id = $1`, [id]);
  res.json(FlagQuestionResponse.parse({ ok: true, message: "Flagged" }));
});

// POST /ta/questions/:id/live-queue
router.post("/ta/questions/:id/live-queue", requireTa, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await pool.query(`UPDATE questions SET is_in_live_queue = true WHERE id = $1`, [id]);
  res.json(SendToLiveQueueResponse.parse({ ok: true, message: "Sent to live queue" }));
});

// GET /ta/desk/:roomCode
router.get("/ta/desk/:roomCode", requireTa, async (req, res): Promise<void> => {
  const params = GetTaDeskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const { roomCode } = params.data;
  const taName = req.taName!;
  const deviceId = "__ta__";

  const [claimRows, needsTaRows, liveRows] = await Promise.all([
    getQuestionsForDesk(roomCode, taName, "claims"),
    getQuestionsForDesk(roomCode, taName, "needs_ta"),
    getQuestionsForDesk(roomCode, taName, "live_queue"),
  ]);

  const myClaims = claimRows.map((r) => formatQuestion(r, deviceId));
  const needsATa = needsTaRows.slice(0, 10).map((r) => formatQuestion(r, deviceId));
  const liveQueue = liveRows.map((r) => formatQuestion(r, deviceId));

  // Get groups for this room
  const groupsResult = await pool.query(`
    SELECT qg.id, qg.title, qg.created_at,
      COALESCE(array_agg(qgm.question_id ORDER BY qgm.created_at) FILTER (WHERE qgm.question_id IS NOT NULL), '{}') AS question_ids,
      COUNT(qgm.id)::int AS question_count,
      gr.id AS gr_id, gr.body AS gr_body, gr.ta_name AS gr_ta, gr.created_at AS gr_created_at
    FROM question_groups qg
    LEFT JOIN question_group_members qgm ON qgm.group_id = qg.id
    LEFT JOIN group_replies gr ON gr.group_id = qg.id
    WHERE qg.room_code = $1
    GROUP BY qg.id, qg.title, qg.created_at, gr.id, gr.body, gr.ta_name, gr.created_at
    ORDER BY qg.created_at DESC
    LIMIT 10
  `, [roomCode]);

  const questionGroups = groupsResult.rows.map((row) => ({
    id: row.id,
    title: row.title,
    questionIds: row.question_ids as number[],
    questionCount: row.question_count,
    groupReply: row.gr_id ? {
      id: row.gr_id,
      groupId: row.id,
      body: row.gr_body,
      taName: row.gr_ta,
      createdAt: row.gr_created_at.toISOString(),
    } : undefined,
    createdAt: row.created_at.toISOString(),
  }));

  res.json(GetTaDeskResponse.parse({
    myClaims,
    needsATa,
    questionGroups,
    liveQueue,
  }));
});

export default router;
