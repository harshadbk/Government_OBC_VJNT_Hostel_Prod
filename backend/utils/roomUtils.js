export const normalizeRoomNumber = (value) => {
  if (value === null || value === undefined) return '';
  const normalized = String(value).trim();
  if (!normalized) return '';
  return normalized.replace(/\s+/g, '');
};

export const roomNumberMatches = (left, right) => {
  return normalizeRoomNumber(left) === normalizeRoomNumber(right);
};

export const parseRoomOverview = (roomConfigString = '') => {
  const defaultConfig = Array.from({ length: 20 }, (_, i) => `${i + 1}:4`).join(',');
  const rawConfig = typeof roomConfigString === 'string' && roomConfigString.trim()
    ? roomConfigString
    : defaultConfig;

  const rooms = [];
  const seen = new Set();

  rawConfig.split(',').forEach((item) => {
    if (!item || !String(item).trim()) return;
    const [roomNumberRaw, capacityRaw] = item.split(':').map((v) => (typeof v === 'string' ? v.trim() : ''));
    const roomNumber = normalizeRoomNumber(roomNumberRaw);
    if (!roomNumber || seen.has(roomNumber)) return;
    seen.add(roomNumber);

    const capacity = Number(capacityRaw);
    rooms.push({
      roomNumber,
      capacity: Number.isInteger(capacity) && capacity > 0 ? capacity : 4,
    });
  });

  return rooms;
};
