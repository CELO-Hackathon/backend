import { createPublicClient, createWalletClient, http, Address, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {Registry8004} from '../abi/8004Registry';
import { Reputation8004 } from '../abi/8004Reputation';
import { env } from './env';
import { PulseVault } from '../abi/PulseVault';

export const celoSepolia = defineChain({
  id: 1114220,
  name: 'Celo Sepolia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'CELO',
    symbol: 'CELO',
  },
  rpcUrls: {
    default: {
      http: ['https://forno.celo-sepolia.celo-testnet.org'],
    },
    public: {
      http: ['https://forno.celo-sepolia.celo-testnet.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Celo Sepolia Explorer',
      url: 'https://celo-sepolia.blockscout.com',
    },
  },
  testnet: true,
});

export const agentAccount = privateKeyToAccount(env.AGENT_PRIVATE_KEY as `0x${string}`);

// read-only 
export const publicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(env.CELO_RPC_URL),
});

// read + write
export const walletClient = createWalletClient({
  chain: celoSepolia,
  transport: http(env.CELO_RPC_URL),
  account: agentAccount,
});

// Contract addresses
export const CONTRACTS = {
  VAULT: env.VAULT_ADDRESS as Address,
  CUSD: env.CUSD_ADDRESS as Address,
  IDENTITY_REGISTRY: env.IDENTITY_REGISTRY as Address,
  REPUTATION_REGISTRY: env.REPUTATION_REGISTRY as Address,
};

// ABIs
export const VAULT_ABI = PulseVault;
export const IDENTITY_REGISTRY_ABI = Registry8004;
export const REPUTATION_REGISTRY_ABI = Reputation8004;