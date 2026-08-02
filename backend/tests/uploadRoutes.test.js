import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdmittedUser, isUploadVisibleToUser } from '../routes/uploadRoutes.js';

test('isAdmittedUser returns true for users with a valid creation or admission date', () => {
  assert.equal(isAdmittedUser({ createdAt: new Date('2024-01-01') }), true);
  assert.equal(isAdmittedUser({ admissionDate: new Date('2024-01-01') }), true);
  assert.equal(isAdmittedUser({ createdAt: null, admissionDate: null }), false);
  assert.equal(isAdmittedUser({}), false);
  assert.equal(isAdmittedUser(null), false);
});

test('isUploadVisibleToUser only shows uploads created on or after the user creation date', () => {
  const user = { createdAt: new Date('2024-01-15') };
  assert.equal(isUploadVisibleToUser({ createdAt: new Date('2024-01-10') }, user), false);
  assert.equal(isUploadVisibleToUser({ createdAt: new Date('2024-01-15T12:00:00') }, user), true);
  assert.equal(isUploadVisibleToUser({ createdAt: new Date('2024-01-16') }, user), true);
  assert.equal(isUploadVisibleToUser({ createdAt: new Date('2024-01-16') }, {}), false);
});
