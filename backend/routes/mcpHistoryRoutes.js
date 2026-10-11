import crypto from 'crypto';
import express from 'express';
import mongoose from 'mongoose';
import McpChat from '../models/McpChat.js';
import { adminAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

const IST_OFFSET = '+05:30';

// Express 4 does not catch rejected promises from async handlers.
const safe = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch((error) => {
    console.error('MCP history route error:', error);
    res.status(500).json({ message: 'Assistant history request failed.' });
  });
const MAX_ANSWER_CHARS = 20000;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isDay = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const startOfDay = (day) => new Date(`${day}T00:00:00${IST_OFFSET}`);
const nextDay = (day) => new Date(startOfDay(day).getTime() + 24 * 60 * 60 * 1000);
const istDay = (date) => new Date(date.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);

// The Python MCP server authenticates with a shared key (MCP_HISTORY_KEY in both .env files).
const mcpServerAuth = (req, res, next) => {
  const expected = process.env.MCP_HISTORY_KEY || '';
  if (!expected) {
    return res.status(503).json({ message: 'MCP_HISTORY_KEY is not configured on the backend.' });
  }
  const given = String(req.headers['x-mcp-key'] || '');
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ message: 'Invalid MCP history key.' });
  }
  next();
};

// Keep the field names the admin panel already uses (snake_case, like the old MCP endpoints).
const serialize = (doc, full = true) => {
  const item = {
    id: String(doc._id),
    created_at: doc.askedAt || doc.createdAt,
    session_id: doc.sessionId || null,
    admin_user: doc.adminUser || null,
    client_ip: doc.clientIp || null,
    question: doc.question,
    success: Boolean(doc.success),
    source: doc.source || null,
    iterations: doc.iterations ?? 0,
    tools_used: (doc.toolsUsed || []).map((t) => ({
      tool: t.tool,
      arguments: t.arguments || {},
      ok: t.ok !== false,
      ...(t.rows != null ? { rows: t.rows } : {}),
      ...(t.error ? { error: t.error } : {})
    })),
    tool_count: doc.toolCount ?? (doc.toolsUsed || []).length,
    duration_ms: doc.durationMs ?? null,
    error: doc.error || null,
    groq_error: doc.groqError || null
  };
  const answer = doc.answer || '';
  if (full) item.answer = answer;
  else item.answer_preview = answer.length > 220 ? `${answer.slice(0, 220)}…` : answer;
  return item;
};

const buildFilter = (query) => {
  const filter = {};
  const search = String(query.search || '').trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ question: rx }, { answer: rx }];
  }
  if (query.session_id) filter.sessionId = String(query.session_id);
  if (query.status === 'success') filter.success = true;
  if (query.status === 'error') filter.success = false;
  if (query.tool) filter['toolsUsed.tool'] = String(query.tool);
  if (query.user) filter.adminUser = String(query.user);
  if (isDay(query.date_from) || isDay(query.date_to)) {
    filter.askedAt = {};
    if (isDay(query.date_from)) filter.askedAt.$gte = startOfDay(query.date_from);
    if (isDay(query.date_to)) filter.askedAt.$lt = nextDay(query.date_to);
  }
  return filter;
};

// ---------------------------------------------------------------------------
// Ingest (called by the MCP server after every /ask)
// ---------------------------------------------------------------------------
router.post('/', mcpServerAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const question = String(body.question || '').trim();
    if (!question) return res.status(400).json({ message: 'question is required.' });

    const toolsUsed = (Array.isArray(body.tools_used) ? body.tools_used : []).slice(0, 50).map((t) => ({
      tool: String(t?.tool || ''),
      arguments: t?.arguments && typeof t.arguments === 'object' ? t.arguments : {},
      ok: t?.ok !== false,
      rows: Number.isFinite(t?.rows) ? t.rows : null,
      error: t?.error ? String(t.error).slice(0, 300) : ''
    }));

    const askedAt = body.created_at ? new Date(body.created_at) : new Date();
    const chat = await McpChat.create({
      sessionId: String(body.session_id || ''),
      adminUser: String(body.admin_user || ''),
      clientIp: String(body.client_ip || ''),
      question,
      answer: String(body.answer || '').slice(0, MAX_ANSWER_CHARS),
      success: body.success !== false,
      source: String(body.source || ''),
      iterations: Number(body.iterations) || 0,
      toolsUsed,
      toolCount: toolsUsed.length,
      durationMs: Number.isFinite(body.duration_ms) ? body.duration_ms : null,
      error: body.error ? String(body.error) : '',
      groqError: body.groq_error ? String(body.groq_error) : '',
      askedAt: Number.isNaN(askedAt.getTime()) ? new Date() : askedAt
    });
    res.status(201).json({ success: true, id: String(chat._id) });
  } catch (error) {
    console.error('Failed to store MCP chat:', error);
    res.status(500).json({ message: 'Failed to store MCP chat.' });
  }
});

// ---------------------------------------------------------------------------
// Admin views
// ---------------------------------------------------------------------------
router.get('/', adminAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const filter = buildFilter(req.query);
    const [total, docs] = await Promise.all([
      McpChat.countDocuments(filter),
      McpChat.find(filter).sort({ askedAt: -1, _id: -1 }).skip(offset).limit(limit).lean()
    ]);
    res.json({ success: true, total, limit, offset, items: docs.map((d) => serialize(d, false)) });
  } catch (error) {
    console.error('Failed to list MCP chats:', error);
    res.status(500).json({ message: 'Failed to load assistant history.' });
  }
});

router.get('/stats', adminAuth, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 90);
    const today = istDay(new Date());
    const firstDay = istDay(new Date(startOfDay(today).getTime() - (days - 1) * 24 * 60 * 60 * 1000));

    const [totals] = await McpChat.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          ok: { $sum: { $cond: ['$success', 1, 0] } },
          avgMs: { $avg: '$durationMs' },
          sessions: { $addToSet: '$sessionId' }
        }
      }
    ]);
    const [todayCount, perDayRows, toolRows] = await Promise.all([
      McpChat.countDocuments({ askedAt: { $gte: startOfDay(today), $lt: nextDay(today) } }),
      McpChat.aggregate([
        { $match: { askedAt: { $gte: startOfDay(firstDay) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$askedAt', timezone: 'Asia/Kolkata' } },
            total: { $sum: 1 },
            errors: { $sum: { $cond: ['$success', 0, 1] } }
          }
        }
      ]),
      McpChat.aggregate([
        { $unwind: '$toolsUsed' },
        { $group: { _id: '$toolsUsed.tool', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    const byDay = Object.fromEntries(perDayRows.map((r) => [r._id, { total: r.total, errors: r.errors }]));
    const perDay = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const day = istDay(new Date(startOfDay(today).getTime() - i * 24 * 60 * 60 * 1000));
      perDay.push({ date: day, ...(byDay[day] || { total: 0, errors: 0 }) });
    }

    const total = totals?.total || 0;
    const ok = totals?.ok || 0;
    res.json({
      success: true,
      total,
      today: todayCount,
      errors: total - ok,
      success_rate: total ? Math.round((ok / total) * 1000) / 10 : null,
      avg_duration_ms: totals?.avgMs != null ? Math.round(totals.avgMs) : null,
      sessions: (totals?.sessions || []).filter(Boolean).length,
      top_tools: toolRows.filter((r) => r._id).map((r) => ({ tool: r._id, count: r.count })),
      per_day: perDay
    });
  } catch (error) {
    console.error('Failed to build MCP chat stats:', error);
    res.status(500).json({ message: 'Failed to load assistant stats.' });
  }
});

router.get('/:id', adminAuth, safe(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'History entry not found.' });
  const doc = await McpChat.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ message: 'History entry not found.' });
  res.json({ success: true, item: serialize(doc) });
}));

router.delete('/:id', adminAuth, safe(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'History entry not found.' });
  const result = await McpChat.deleteOne({ _id: req.params.id });
  if (!result.deletedCount) return res.status(404).json({ message: 'History entry not found.' });
  res.json({ success: true, deleted: 1 });
}));

// Delete everything, or only entries before ?before=YYYY-MM-DD
router.delete('/', adminAuth, safe(async (req, res) => {
  const filter = isDay(req.query.before) ? { askedAt: { $lt: startOfDay(req.query.before) } } : {};
  const result = await McpChat.deleteMany(filter);
  res.json({ success: true, deleted: result.deletedCount || 0 });
}));

export default router;
