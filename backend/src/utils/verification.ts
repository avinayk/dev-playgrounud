export const generateVerificationCode = (): string => {
  // Generate a random 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const validateVerificationCode = (code: string): boolean => {
  return /^\d{6}$/.test(code);
};