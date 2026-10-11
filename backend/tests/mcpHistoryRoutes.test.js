import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import McpChat from '../models/McpChat.js';
import mcpHistoryRoutes from '../routes/mcpHistoryRoutes.js';

// Runs the real router over HTTP with the model's database calls stubbed out,
// so no MongoDB connection is needed.
process.env.JWT_SECRET = 'test-secret';
process.env.MCP_HISTORY_KEY = 'test-history-key';

const adminToken = jwt.sign({ role: 'admin', username: 'warden' }, 'test-secret');
const studentToken = jwt.sign({ role: 'student', username: 'rahul' }, 'test-secret');

const stored = [];
McpChat.create = async (doc) => {
  const saved = { _id: '65f000000000000000000001', ...doc };
  stored.push(saved);
  return saved;
};
let lastFilter = null;
McpChat.countDocuments = async (filter) => {
  lastFilter = filter;
  return stored.length;
};
McpChat.find = () => ({
  sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => stored }) }) })
});

const app = express();
app.use(express.json());
app.use('/api/mcp-history', mcpHistoryRoutes);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api/mcp-history`;
test.after(() => server.close());

const post = (body, key) =>
  fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key ? { 'x-mcp-key': key } : {}) },
    body: JSON.stringify(body)
  });

test('ingest rejects a missing or wrong MCP key', async () => {
  assert.equal((await post({ question: 'hi' })).status, 401);
  assert.equal((await post({ question: 'hi' }, 'wrong-key')).status, 401);
  assert.equal(stored.length, 0);
});

test('ingest requires a question', async () => {
  assert.equal((await post({ answer: 'x' }, 'test-history-key')).status, 400);
});

test('ingest stores the chat with mapped fields', async () => {
  const res = await post(
    {
      question: 'Who lives in room 14?',
      answer: 'Three students.',
      success: true,
      session_id: 's1',
      admin_user: 'warden',
      duration_ms: 812,
      tools_used: [{ tool: 'find_students', arguments: { room: '14' }, ok: true, rows: 3 }]
    },
    'test-history-key'
  );
  assert.equal(res.status, 201);
  const saved = stored[0];
  assert.equal(saved.question, 'Who lives in room 14?');
  assert.equal(saved.sessionId, 's1');
  assert.equal(saved.adminUser, 'warden');
  assert.equal(saved.durationMs, 812);
  assert.equal(saved.toolCount, 1);
  assert.deepEqual(saved.toolsUsed[0], { tool: 'find_students', arguments: { room: '14' }, ok: true, rows: 3, error: '' });
});

test('reading history needs an admin token', async () => {
  assert.equal((await fetch(base)).status, 401);
  const asStudent = await fetch(base, { headers: { Authorization: `Bearer ${studentToken}` } });
  assert.equal(asStudent.status, 403);
});

test('list returns snake_case items with an answer preview and applies filters', async () => {
  const res = await fetch(`${base}?status=error&tool=find_students&search=room&date_from=2026-10-01`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.total, 1);
  const item = data.items[0];
  assert.equal(item.question, 'Who lives in room 14?');
  assert.equal(item.session_id, 's1');
  assert.equal(item.tool_count, 1);
  assert.equal(item.answer_preview, 'Three students.');
  assert.equal(item.answer, undefined);
  assert.equal(lastFilter.success, false);
  assert.equal(lastFilter['toolsUsed.tool'], 'find_students');
  assert.ok(lastFilter.$or);
  assert.equal(lastFilter.askedAt.$gte.toISOString(), '2026-09-30T18:30:00.000Z'); // midnight IST
});
