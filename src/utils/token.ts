export const getTokenValidDays = (expiryDate: Date | null | undefined): number => {
  if (!expiryDate) return 0;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};