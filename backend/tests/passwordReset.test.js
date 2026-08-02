import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePasswordResetPayload } from '../utils/passwordReset.js';

test('validatePasswordResetPayload rejects mismatched passwords', () => {
  const result = validatePasswordResetPayload({
    username: 'student01',
    otp: '123456',
    newPassword: 'newPassword123',
    confirmPassword: 'different123',
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /match/i);
});

test('validatePasswordResetPayload accepts a complete reset payload', () => {
  const result = validatePasswordResetPayload({
    username: 'student01',
    otp: '123456',
    newPassword: 'newPassword123',
    confirmPassword: 'newPassword123',
  });

  assert.equal(result.ok, true);
  assert.equal(result.message, '');
});
