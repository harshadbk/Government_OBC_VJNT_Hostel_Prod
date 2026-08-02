import test from 'node:test';
import assert from 'node:assert/strict';
import Document from '../models/Document.js';

test('document schema should use a per-user document index instead of a unique email index', () => {
  assert.equal(Document.schema.paths.email.options.unique, undefined);
  assert.equal(Document.schema.paths.userId.options.unique, true);
});
