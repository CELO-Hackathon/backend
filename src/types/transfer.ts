import { Address, Hex } from 'viem';

export interface TransferRequest {
  recipient: Address;
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
}

export interface SignedTransferRequest {
  request: TransferRequest;
  signature: Hex;
  agentId: bigint;
}

export interface TransferResult {
  txHash: Hex;
  status: 'pending' | 'confirmed' | 'failed';
  explorerUrl: string;
  blockNumber?: number;
  gasUsed?: string;
}