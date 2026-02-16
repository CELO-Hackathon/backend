import { Address } from 'viem';

export interface AuthNonce {
  nonce: string;
  expiresAt: Date;
}

export interface AuthPayload {
  address: Address;
  iat: number;
  exp: number;
}

export interface LoginRequest {
  address: string;
  signature: string;
  message: string;
}

export interface LoginResponse {
  token: string;
  user: {
    address: string;
    agentAuthorized: boolean;
    createdAt: Date;
  };
}