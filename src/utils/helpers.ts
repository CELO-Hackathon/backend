import { parseUnits, formatUnits } from 'viem';

export const usdToWei = (amount: string): bigint => {
  return parseUnits(amount, 18); // cUSD has 18 decimals
};

export const weiToUsd = (amount: bigint): string => {
  return formatUnits(amount, 18);
};

export const calculateDeadline = (hoursFromNow: number = 1): bigint => {
  return BigInt(Math.floor(Date.now() / 1000) + hoursFromNow * 3600);
};

export const calculateNextRun = (frequency: 'daily' | 'weekly' | 'monthly'): Date => {
  const now = new Date();
  
  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() + 1));
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
};

export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};