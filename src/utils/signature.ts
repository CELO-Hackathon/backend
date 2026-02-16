import { Address, Hex, encodeAbiParameters, keccak256, toBytes } from 'viem';

export const EIP712_DOMAIN = {
  name: 'PulseVault',
  version: '1',
  chainId: process.env.CELO_CHAIN_ID || 11142220,
  verifyingContract: '' as Address, // Will be set dynamically
};

export const TRANSFER_TYPES = {
  TransferRequest: [
    { name: 'recipient', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

export interface TransferMessage {
  recipient: Address;
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
}

export const getTransferHash = (message: TransferMessage): Hex => {
  const typeHash = keccak256(
    toBytes('TransferRequest(address recipient,uint256 amount,uint256 nonce,uint256 deadline)')
  );
  
  const encoded = encodeAbiParameters(
    [
      { name: 'typeHash', type: 'bytes32' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
    [typeHash, message.recipient, message.amount, message.nonce, message.deadline]
  );
  
  return keccak256(encoded);
};