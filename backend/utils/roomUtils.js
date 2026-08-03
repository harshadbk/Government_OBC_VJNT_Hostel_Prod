export const normalizeRoomNumber = (value) => {
  if (value === null || value === undefined) return '';
  const normalized = String(value).trim();
  if (!normalized) return '';
  return String(Number(normalized));
};

export const roomNumberMatches = (left, right) => {
  return normalizeRoomNumber(left) === normalizeRoomNumber(right);
};
