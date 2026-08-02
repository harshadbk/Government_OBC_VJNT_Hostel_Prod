export const validatePasswordResetPayload = ({ username, otp, newPassword, confirmPassword }) => {
  if (!String(username || '').trim()) {
    return { ok: false, message: 'Username is required.' };
  }

  if (!String(otp || '').trim()) {
    return { ok: false, message: 'OTP is required.' };
  }

  if (!String(newPassword || '').trim()) {
    return { ok: false, message: 'New password is required.' };
  }

  if (String(newPassword).length < 6) {
    return { ok: false, message: 'Password must be at least 6 characters.' };
  }

  if (String(newPassword) !== String(confirmPassword || '')) {
    return { ok: false, message: 'Passwords do not match.' };
  }

  return { ok: true, message: '' };
};
