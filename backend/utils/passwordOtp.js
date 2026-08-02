import crypto from 'crypto';

const OTP_TTL_MS = 5 * 60 * 1000;

export const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

export const verifyOtp = (entry, otp) => {
  if (!entry || !entry.otpHash || !entry.expiresAt) return false;
  if (Date.now() > entry.expiresAt) return false;
  return entry.otpHash === hashOtp(otp);
};

export const createOtpEntry = () => ({
  otpHash: hashOtp(generateOtp()),
  expiresAt: Date.now() + OTP_TTL_MS,
  otp: null,
});

export const createOtpPayload = () => {
  const otp = generateOtp();
  return {
    otp,
    otpHash: hashOtp(otp),
    expiresAt: Date.now() + OTP_TTL_MS,
  };
};
