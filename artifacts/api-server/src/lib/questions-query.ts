import { pool } from "@workspace/db";

export interface QuestionRow {
  id: number;
  room_code: string;
  title: string;
  body: string | null;
  author_label: string;
  is_anonymous: boolean;
  device_id: string;
  tags: string[];
  is_flagged: boolean;
  is_in_live_queue: boolean;
  created_at: Date;
  vote_count: string;
  follow_count: string;
  blocked_count: string;
  reply_count: string;
  last_reply_at: Date | null;
  claimed_by_ta: string | null;
  group_id: number | null;
  group_title: string | null;
  group_reply_body: string | null;
  group_reply_ta: string | null;
  group_reply_id: number | null;
  group_reply_created_at: Date | null;
  rising_score: string;
  viewer_voted: boolean;
  viewer_follows: boolean;
  viewer_blocked: boolean;
  viewer_asked: boolean;
  viewer_replied: boolean;
}

export function formatQuestion(row: QuestionRow, deviceId: string) {
  const voteCount = parseInt(row.vote_count, 10);
  const followCount = parseInt(row.follow_count, 10);
  const blockedCount = parseInt(row.blocked_count, 10);
  const replyCount = parseInt(row.reply_count, 10);

  return {
    id: row.id,
    roomCode: row.room_code,
    title: row.title,
    body: row.body ?? null,
    authorLabel: row.is_anonymous ? "Anonymous" : row.author_label,
    isAnonymous: row.is_anonymous,
    voteCount,
    followCount,
    blockedCount,
    replyCount,
    hasReplies: replyCount > 0,
    status: replyCount > 0 ? "answered" : "unanswered",
    tags: row.tags ?? [],
    claimedByTa: row.claimed_by_ta ?? null,
    groupId: row.group_id ?? null,
    groupTitle: row.group_title ?? null,
    isInLiveQueue: row.is_in_live_queue,
    viewerVoted: !!row.viewer_voted,
    viewerFollows: !!row.viewer_follows,
    viewerBlocked: !!row.viewer_blocked,
    viewerAsked: row.device_id === deviceId,
    viewerReplied: !!row.viewer_replied,
    lastReplyAt: row.last_reply_at ? row.last_reply_at.toISOString() : null,
    risingScore: parseFloat(row.rising_score),
    createdAt: row.created_at.toISOString(),
  };
}

const BASE_QUESTION_SELECT = `
  q.id, q.room_code, q.title, q.body, q.author_label, q.is_anonymous, q.device_id,
  q.tags, q.is_flagged, q.is_in_live_queue, q.created_at,
  COUNT(DISTINCT v.id)::text AS vote_count,
  COUNT(DISTINCT f.id)::text AS follow_count,
  COUNT(DISTINCT bs.id)::text AS blocked_count,
  COUNT(DISTINCT r.id)::text AS reply_count,
  MAX(r.created_at) AS last_reply_at,
  tc.ta_name AS claimed_by_ta,
  qg.id AS group_id,
  qg.title AS group_title,
  gr.body AS group_reply_body,
  gr.ta_name AS group_reply_ta,
  gr.id AS group_reply_id,
  gr.created_at AS group_reply_created_at,
  (
    COUNT(DISTINCT v.id) * 2.0 +
    COUNT(DISTINCT bs.id) * 3.0 +
    EXTRACT(EPOCH FROM (NOW() - q.created_at)) / 120.0 -
    CASE WHEN tc.ta_name IS NOT NULL THEN 5.0 ELSE 0.0 END
  )::text AS rising_score
`;

const BASE_JOINS = `
  FROM questions q
  LEFT JOIN votes v ON v.question_id = q.id
  LEFT JOIN follows f ON f.question_id = q.id
  LEFT JOIN blocked_signals bs ON bs.question_id = q.id
  LEFT JOIN replies r ON r.question_id = q.id AND r.is_flagged = false
  LEFT JOIN ta_claims tc ON tc.question_id = q.id
  LEFT JOIN question_group_members qgm ON qgm.question_id = q.id
  LEFT JOIN question_groups qg ON qg.id = qgm.group_id
  LEFT JOIN group_replies gr ON gr.group_id = qg.id
`;

const BASE_GROUP_BY = `
  GROUP BY q.id, tc.ta_name, qg.id, qg.title, gr.body, gr.ta_name, gr.id, gr.created_at
`;

function viewerSubqueries(deviceId: string, paramIndex: number) {
  return `
  , EXISTS(SELECT 1 FROM votes WHERE question_id = q.id AND device_id = $${paramIndex}) AS viewer_voted
  , EXISTS(SELECT 1 FROM follows WHERE question_id = q.id AND device_id = $${paramIndex}) AS viewer_follows
  , EXISTS(SELECT 1 FROM blocked_signals WHERE question_id = q.id AND device_id = $${paramIndex}) AS viewer_blocked
  , EXISTS(SELECT 1 FROM replies WHERE question_id = q.id AND device_id = $${paramIndex} AND is_flagged = false) AS viewer_replied
  `;
}

export async function getQuestionsForRoom(
  roomCode: string,
  view: string,
  deviceId: string,
): Promise<QuestionRow[]> {
  const params: (string | boolean)[] = [roomCode, deviceId];

  let whereClause = `WHERE q.room_code = $1 AND q.is_flagged = false`;
  let orderClause = `ORDER BY rising_score DESC`;

  if (view === "unanswered") {
    whereClause += ` AND NOT EXISTS (SELECT 1 FROM replies r2 WHERE r2.question_id = q.id AND r2.is_flagged = false)`;
  } else if (view === "answered") {
    whereClause += ` AND EXISTS (SELECT 1 FROM replies r2 WHERE r2.question_id = q.id AND r2.is_flagged = false)`;
    orderClause = `ORDER BY last_reply_at DESC NULLS LAST`;
  } else if (view === "mine") {
    whereClause += ` AND (q.device_id = $2 OR EXISTS (SELECT 1 FROM replies r2 WHERE r2.question_id = q.id AND r2.device_id = $2 AND r2.is_flagged = false))`;
    orderClause = `ORDER BY q.created_at DESC`;
  }

  const sql = `
    SELECT ${BASE_QUESTION_SELECT}
    ${viewerSubqueries(deviceId, 2)}
    ${BASE_JOINS}
    ${whereClause}
    ${BASE_GROUP_BY}
    ${orderClause}
    LIMIT 100
  `;

  const result = await pool.query(sql, params);
  return result.rows as QuestionRow[];
}

export async function getQuestionById(
  id: number,
  deviceId: string,
): Promise<QuestionRow | null> {
  const sql = `
    SELECT ${BASE_QUESTION_SELECT}
    ${viewerSubqueries(deviceId, 2)}
    ${BASE_JOINS}
    WHERE q.id = $1 AND q.is_flagged = false
    ${BASE_GROUP_BY}
    LIMIT 1
  `;
  const result = await pool.query(sql, [id, deviceId]);
  if (result.rows.length === 0) return null;
  return result.rows[0] as QuestionRow;
}

export async function getQuestionsForDesk(
  roomCode: string,
  taName: string,
  mode: "claims" | "needs_ta" | "live_queue",
): Promise<QuestionRow[]> {
  const deviceId = "__ta__";
  const params: (string | boolean)[] = [roomCode];

  let extraWhere = "";
  if (mode === "claims") {
    extraWhere = ` AND tc.ta_name = $2`;
    params.push(taName);
  } else if (mode === "needs_ta") {
    extraWhere = ` AND tc.ta_name IS NULL AND NOT EXISTS (SELECT 1 FROM replies r2 WHERE r2.question_id = q.id AND r2.is_flagged = false)`;
  } else if (mode === "live_queue") {
    extraWhere = ` AND q.is_in_live_queue = true`;
  }

  const paramIndex = params.length + 1;
  params.push(deviceId);

  const sql = `
    SELECT ${BASE_QUESTION_SELECT}
    ${viewerSubqueries(deviceId, paramIndex)}
    ${BASE_JOINS}
    WHERE q.room_code = $1 AND q.is_flagged = false ${extraWhere}
    ${BASE_GROUP_BY}
    ORDER BY rising_score DESC
    LIMIT 20
  `;

  const result = await pool.query(sql, params);
  return result.rows as QuestionRow[];
}
