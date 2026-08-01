import test from 'node:test';
import assert from 'node:assert/strict';
import LeaveApplication from '../models/LeaveApplication.js';

test('leave application defaults to pending status', () => {
  const leave = new LeaveApplication({
    userId: '507f1f77bcf86cd799439011',
    fullName: 'Test Student',
    reason: 'Family visit',
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    mobileNumber: '9876543210'
  });

  assert.equal(leave.status, 'Pending');
  assert.equal(leave.comebackMarked, false);
  assert.equal(leave.comebackDate, '');
  assert.equal(leave.comebackReminderSent, false);
  assert.equal(leave.comebackReminderSentAt, null);
  assert.equal(leave.notificationCount, 0);
  assert.equal(leave.adminNote, '');
  assert.equal(leave.attachmentUrl, '');
});
