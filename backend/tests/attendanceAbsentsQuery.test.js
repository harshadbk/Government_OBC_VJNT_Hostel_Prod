import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveAbsentsDateRange } from '../routes/attendanceRoutes.js';

test('resolveAbsentsDateRange uses a single selected date as a one-day range', () => {
  const result = resolveAbsentsDateRange({ date: '2026-09-18' });

  assert.equal(result.startDate, '2026-09-18');
  assert.equal(result.endDate, '2026-09-18');
  assert.equal(result.selectedDate, '2026-09-18');
  assert.equal(result.isSingleDate, true);
});

test('resolveAbsentsDateRange falls back to the selected month when no date is supplied', () => {
  const result = resolveAbsentsDateRange({ year: '2026', month: '9' });

  assert.equal(result.startDate, '2026-09-01');
  assert.equal(result.endDate, '2026-09-30');
  assert.equal(result.selectedDate, null);
  assert.equal(result.isSingleDate, false);
});
