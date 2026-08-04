import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoomNumber, roomNumberMatches } from '../utils/roomUtils.js';

test('normalizeRoomNumber trims and removes leading zeroes', () => {
  assert.equal(normalizeRoomNumber(' 01 '), '1');
  assert.equal(normalizeRoomNumber('0010'), '10');
  assert.equal(normalizeRoomNumber(''), '');
});

test('roomNumberMatches treats equivalent room values as the same room', () => {
  assert.equal(roomNumberMatches('01', '1'), true);
  assert.equal(roomNumberMatches(' 1 ', '001'), true);
  assert.equal(roomNumberMatches('2', '3'), false);
});
