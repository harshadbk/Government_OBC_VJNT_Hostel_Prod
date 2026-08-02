import test from 'node:test';
import assert from 'node:assert/strict';
import { generateOtp, hashOtp, verifyOtp } from '../utils/passwordOtp.js';

test('generateOtp returns a six-digit code', () => {
  const otp = generateOtp();
  assert.match(otp, /^\d{6}$/);
});

test('verifyOtp validates a matching code and rejects expired entries', () => {
  const otp = '123456';
  const stored = { otpHash: hashOtp(otp), expiresAt: Date.now() + 60_000 };
  assert.equal(verifyOtp(stored, otp), true);
  assert.equal(verifyOtp({ otpHash: hashOtp('654321'), expiresAt: Date.now() + 60_000 }, otp), false);
  assert.equal(verifyOtp({ otpHash: hashOtp(otp), expiresAt: Date.now() - 1 }, otp), false);
});
