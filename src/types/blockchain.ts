import { Address } from 'viem';

export interface AgentReputation {
  agentId: number;
  feedbackCount: number;
  averageRating: number;
  totalTransactions: number;
  totalVolume: string;
  lastActive: Date;
}

export interface UserBalance {
  address: Address;
  vaultBalance: string;
  walletBalance: string;
}