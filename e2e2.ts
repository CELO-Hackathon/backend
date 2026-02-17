import { ethers } from 'ethers';
import fetch from 'node-fetch';
import { VAULT_ABI } from './src/config/blockchain';

// ===========================
// CONFIGURATION + INTERFACES
// ===========================

interface Config {
  PRIVATE_KEY: string;
  VAULT_ADDRESS: string;
  CUSD_ADDRESS: string;
  API_URL: string;
  RECIPIENT: string;
  AMOUNT: string;
  RPC_URL: string;
  CHAIN_ID: number;
  EXPLORER: string;
}

interface NonceResponse {
  message: string;
  expiresIn: number;
}

interface LoginResponse {
  token: string;
  user: {
    address: string;
    agentAuthorized: boolean;
    createdAt: string;
  };
  error?: string;
}

interface IntentResponse {
  intentId: string;
  intent: {
    action: string;
    amount: string;
    currency: string;
    recipient: string;
    frequency?: string;
  };
  executionPlan: {
    route: string;
    gasEstimate: string;
    requiresApproval: boolean;
    estimatedTime: string;
  };
  userBalance: {
    vault: string;
    isAuthorized: boolean;
  };
  error?: string;
}

interface ExecuteResponse {
  transferId: string;
  txHash: string;
  status: string;
  explorerUrl: string;
  blockNumber?: number;
  error?: string;
}

interface AgentStatusResponse {
  isVerified: boolean;
  agentId: string;
  agentAddress: string;
  vaultAddress: string;
  network: string;
  setupComplete: boolean;
}

interface AgentReputationResponse {
  agentId: number;
  owner: string;
  isVerified: boolean;
  reputation: {
    agentId: number;
    score: number;
    totalFeedback: number;
    rating: string;
    explorerUrl: string;
  };
  recentActivity: Array<{
    txHash: string;
    recipient: string;
    amount: string;
    confirmedAt: string;
  }>;
  explorerUrl: string;
}

interface TransferRequest {
  recipient: string;
  amount: bigint;
  nonce: bigint;
  deadline: number;
}

interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

interface EIP712Types {
  [key: string]: Array<{
    name: string;
    type: string;
  }>;
}

const CONFIG: Config = {
  // Your test wallet private key
  PRIVATE_KEY: '',
  // Contract addresses (update after deployment)
  VAULT_ADDRESS: '0x4a37e2904a5eB84e18374041C7654Cfb3e7E1058',
  CUSD_ADDRESS: '0xAd9a854784BD9e8e5E975e39cdFD34cA32dd7fEf',
  
  // Backend API
  API_URL: 'http://localhost:3000/api',
  
  // Test transfer details
  RECIPIENT: '0xb4c547cD699b2149EE8F675690fD41D65c30FE57',
  AMOUNT: '200', // cUSD
  
  // Network
  RPC_URL: 'https://forno.celo-sepolia.celo-testnet.org',
  CHAIN_ID: 11142220,
  EXPLORER: 'https://celo-sepolia.blockscout.com',
};
// ===========================
// PROVIDER SETUP
// ===========================

const provider = new ethers.JsonRpcProvider(
  CONFIG.RPC_URL,
  undefined,
  {
    staticNetwork: true,
    polling: true,
    pollingInterval: 4000,
  }
);

provider.pollingInterval = 15000;

const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);

// ===========================
// RETRY HELPERS (FIXED LOGIC)
// ===========================
const ERC20_ABI: string[] = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
];

const VAULT_ABI_ = VAULT_ABI

// ===========================
// HELPER FUNCTIONS
// ===========================

function log(step: number, message: string, data?: any): void {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[STEP ${step}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('='.repeat(80));
}

function success(message: string): void {
  console.log(`\n✅ ${message}\n`);
}

function error(message: string): never {
  console.log(`\n❌ ${message}\n`);
  process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry<T>(
  fn: () => Promise<T>,
  label: string,
  retries = 5,
  delayMs = 3000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.log(
        `⚠️  ${label} failed (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms...`
      );

      if (attempt < retries) {
        await sleep(delayMs);
      }
    }
  }

  throw new Error(`${label} failed after ${retries} attempts: ${String(lastError)}`);
}

async function fetchWithRetry<T>(
  url: string,
  options: any,
  label: string,
  retries = 5,
  delayMs = 3000
): Promise<T> {
  return retry(async () => {
    const res = await fetch(url, options);

    if (!res.ok) {
      throw new Error(`${label} HTTP ${res.status}`);
    }

    return (await res.json()) as T;
  }, label, retries, delayMs);
}

// ===========================
// MAIN
// ===========================

async function main(): Promise<void> {
  console.log('\n🚀 PulseRemit E2E Test Starting...\n');
  console.log(`Wallet: ${wallet.address}`);
  console.log(`Vault: ${CONFIG.VAULT_ADDRESS}`);
  console.log(`Backend: ${CONFIG.API_URL}\n`);

  try {
    const cUSD = new ethers.Contract(CONFIG.CUSD_ADDRESS, ERC20_ABI, wallet);
    const vault = new ethers.Contract(CONFIG.VAULT_ADDRESS, VAULT_ABI_, wallet);

    // STEP 1
    log(1, 'Checking wallet balances...');

    const celoBalance = await retry(
      () => provider.getBalance(wallet.address),
      'Get CELO balance'
    );

    const cusdBalance = await retry(
      () => cUSD.balanceOf(wallet.address) as Promise<bigint>,
      'Get cUSD balance'
    );

    console.log(`CELO Balance: ${ethers.formatEther(celoBalance)} CELO`);
    console.log(`cUSD Balance: ${ethers.formatEther(cusdBalance)} cUSD`);

    if (celoBalance === 0n) {
      error('No CELO for gas!');
    }

    const requiredAmount = ethers.parseEther(CONFIG.AMOUNT);
    if (cusdBalance < requiredAmount) {
      error(`Need at least ${CONFIG.AMOUNT} cUSD`);
    }

    success('Wallet has sufficient balance');

    // STEP 2
    log(2, 'Approving Vault to spend cUSD...');

    const approveTx = await retry(
      () =>
        cUSD.approve(CONFIG.VAULT_ADDRESS, ethers.parseEther('1000')),
      'Approve transaction'
    );

    console.log(`Approve TX: ${approveTx.hash}`);
    await retry(() => approveTx.wait(), 'Approve confirmation');

    success('Approval confirmed');

    // STEP 3
    log(3, 'Depositing cUSD to Vault...');

    const depositAmount = ethers.parseEther('100');

    const depositTx = await retry(
      () => vault.deposit(depositAmount),
      'Deposit transaction'
    );

    console.log(`Deposit TX: ${depositTx.hash}`);
    await retry(() => depositTx.wait(), 'Deposit confirmation');

    const vaultBalance = await retry(
      () => vault.balanceOf(wallet.address) as Promise<bigint>,
      'Read vault balance'
    );

    console.log(`Vault Balance: ${ethers.formatEther(vaultBalance)} cUSD`);
    success('Deposit successful');
     log(3.5, 'DEBUG: Verifying vault state...');
    
    const onChainBalance = await retry(
      () => vault.balanceOf(wallet.address) as Promise<bigint>,
      'Read vault balance (debug)'
    );
    
    const onChainNonce = await retry(
      () => vault.getNonce(wallet.address) as Promise<bigint>,
      'Read nonce (debug)'
    );
    
    console.log('On-chain vault balance:', ethers.formatEther(onChainBalance), 'cUSD');
    console.log('On-chain nonce:', onChainNonce.toString());
    console.log('Transfer amount:', CONFIG.AMOUNT, 'cUSD');
    console.log('Has enough?', onChainBalance >= ethers.parseEther(CONFIG.AMOUNT));
    
    if (onChainBalance < ethers.parseEther(CONFIG.AMOUNT)) {
      error(`Insufficient vault balance! Has ${ethers.formatEther(onChainBalance)}, needs ${CONFIG.AMOUNT}`);
    }

    // STEP 4
    log(4, 'Authorizing backend agent...');

    const statusData = await fetchWithRetry<AgentStatusResponse>(
      `${CONFIG.API_URL}/agent/status`,
      { method: 'GET' },
      'Fetch agent status'
    );

    const authTx = await retry(
      () =>
        vault.setAgentLimit(
          statusData.agentAddress,
          ethers.parseEther('300')
        ),
      'Authorize agent transaction'
    );

    console.log(`Authorization TX: ${authTx.hash}`);
    await retry(() => authTx.wait(), 'Authorization confirmation');

    success('Agent authorized');

    await sleep(3000);

    // STEP 5
    log(5, 'Authenticating with backend...');

    const nonceData = await fetchWithRetry<NonceResponse>(
      `${CONFIG.API_URL}/auth/nonce`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet.address }),
      },
      'Fetch auth nonce'
    );

    const signature = await wallet.signMessage(nonceData.message);

    const loginData = await fetchWithRetry<LoginResponse>(
      `${CONFIG.API_URL}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: wallet.address,
          signature,
          message: nonceData.message,
        }),
      },
      'Login request'
    );

    if (loginData.error) {
      error(`Login failed: ${loginData.error}`);
    }

    const token = loginData.token;
    success('Backend authentication successful');

    // STEP 6
    log(6, 'Parsing transfer intent with AI...');

    const intentData = await fetchWithRetry<IntentResponse>(
      `${CONFIG.API_URL}/intent/parse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userInput: `Send ${CONFIG.AMOUNT} cUSD to ${CONFIG.RECIPIENT}`,
          userAddress: wallet.address,
        }),
      },
      'Parse intent'
    );

    if (intentData.error) {
      error(`Intent parsing failed: ${intentData.error}`);
    }

    success('AI parsed the transfer intent');

    // STEP 7
    log(7, 'Signing transfer with EIP-712 (manual)...');

    const nonce = await retry(
      () => vault.getNonce(wallet.address) as Promise<bigint>,
      'Fetch vault nonce'
    );

    console.log('Nonce from vault:', nonce.toString());
    console.log('Wallet address:', wallet.address);

    // ✅ Get domain separator from contract
    const domainSeparator = await retry(
      () => vault.getDomainSeparator() as Promise<string>,
      'Get domain separator'
    );

    console.log('Domain separator:', domainSeparator);

    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // ✅ Calculate TRANSFER_REQUEST_TYPEHASH exactly like SignatureValidator does
    const TRANSFER_REQUEST_TYPEHASH = ethers.keccak256(
      ethers.toUtf8Bytes(
        'TransferRequest(address recipient,uint256 amount,uint256 nonce,uint256 deadline)'
      )
    );

    console.log('TRANSFER_REQUEST_TYPEHASH:', TRANSFER_REQUEST_TYPEHASH);

    // ✅ Encode struct hash exactly like SignatureValidator.getTransferHash
    const structHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'address', 'uint256', 'uint256', 'uint256'],
        [
          TRANSFER_REQUEST_TYPEHASH,
          CONFIG.RECIPIENT,
          ethers.parseEther(CONFIG.AMOUNT),
          nonce,
          deadline,
        ]
      )
    );

    console.log('Struct hash:', structHash);

    // ✅ Create digest exactly like contract's _verifySignature
    const digest = ethers.keccak256(
      ethers.solidityPacked(
        ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
        ['0x19', '0x01', domainSeparator, structHash]
      )
    );

    console.log('Digest to sign:', digest);

    // ✅ Sign the raw digest
    const transferSignature = await wallet.signingKey.sign(digest).serialized;

    console.log('Signature:', transferSignature);

    success('Transfer signed successfully (manual EIP-712)');

    // STEP 8
    // log(8, 'Executing transfer via backend...');

    // const executeData = await fetchWithRetry<ExecuteResponse>(
    //   `${CONFIG.API_URL}/transfer/execute`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       Authorization: `Bearer ${token}`,
    //     },
    //     body: JSON.stringify({
    //       intentId: intentData.intentId,
    //       signature: transferSignature,
    //       userAddress: wallet.address,
    //     }),
    //   },
    //   'Execute transfer'
    // );
    log(8, 'Executing transfer via backend...');

    const executeData = await fetchWithRetry<ExecuteResponse>(
      `${CONFIG.API_URL}/transfer/execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          intentId: intentData.intentId,
          signature: transferSignature,
          userAddress: wallet.address,
          // ✅ ADD: Send the exact request that was signed
          request: {
            recipient: CONFIG.RECIPIENT,
            amount: ethers.parseEther(CONFIG.AMOUNT).toString(),
            nonce: nonce.toString(),
            deadline: deadline.toString(),
          },
        }),
      },
      'Execute transfer'
    );

    if (executeData.error) {
      error(`Transfer execution failed: ${executeData.error}`);
    }

    success('Transfer executed on blockchain!');

    console.log('\n🎉 E2E TEST COMPLETED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED\n');
    console.error(err);
    process.exit(1);
  }
}

main();
