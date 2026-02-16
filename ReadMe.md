

# PulseRemit Backend API Documentation

## Base URL
```markdown
http://localhost:3000/api
```

---

## 🔐 Authentication Flow

### 1. Connect Wallet & Get Nonce
Request a unique code to sign:

**Endpoint:** `POST /auth/nonce`

**Request:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "message": "Sign this message to authenticate with PulseRemit.\n\nNonce: abc123...\nTimestamp: 2026-02-14T...",
  "expiresIn": 300
}
```

**Frontend Action:** Ask user to sign this message with their wallet (MetaMask, etc.)

### 2. Login with Signature
Submit the signed message:

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0xabc123def456...",
  "message": "Sign this message to authenticate..."
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
    "agentAuthorized": false,
    "createdAt": "2026-02-14T10:30:00Z"
  }
}
```

**Frontend Action:** Store the `token` in localStorage. Include it in all future requests as:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

### 3. Check Current User
Get logged-in user info:

**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
  "authenticatedAt": "2026-02-14T10:30:00Z",
  "expiresAt": "2026-02-21T10:30:00Z"
}
```

---

## 💬 Natural Language Transfer Flow

### Step 1: Parse User Intent
User types: "Send $50 to mama.eth every week"

**Endpoint:** `POST /intent/parse`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Request:**
```json
{
  "userInput": "Send $50 to mama.eth every week",
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "intentId": "65abc123def456...",
  "intent": {
    "action": "recurring_transfer",
    "amount": "50",
    "currency": "USD",
    "recipient": "0xRecipientAddress",
    "frequency": "weekly"
  },
  "executionPlan": {
    "route": "celo",
    "gasEstimate": "0.002 cUSD",
    "requiresApproval": true,
    "estimatedTime": "Scheduled"
  },
  "userBalance": {
    "vault": "100.50",
    "isAuthorized": false
  }
}
```

**What This Means:**
- ✅ AI understood the request
- ⚠️ User needs to authorize agent first (if `isAuthorized: false`)
- 💰 User has 100.50 cUSD in vault
- 🔄 This is a recurring transfer (weekly)

### Step 2A: Authorize Agent (First Time Only)
If `requiresApproval: true`, user must call this on the blockchain:

```javascript
// Frontend: User signs transaction with wallet
const tx = await vaultContract.write.setAgentLimit([
  AGENT_ADDRESS,
  parseUnits("100", 18) // Daily limit: 100 cUSD
]);
```

After authorization, `isAuthorized` becomes true.

### Step 2B: Sign Transfer Request
User signs the transfer details (EIP-712 signature):

```javascript
// Frontend code example
const domain = {
  name: 'PulseVault',
  version: '1',
  chainId: 1114220,
  verifyingContract: VAULT_ADDRESS
};

const types = {
  TransferRequest: [
    { name: 'recipient', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

const value = {
  recipient: intent.recipient,
  amount: parseUnits(intent.amount, 18),
  nonce: await vaultContract.read.getNonce([userAddress]),
  deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour
};

const signature = await wallet.signTypedData({ domain, types, value });
```

### Step 3: Execute Transfer (Single) or Schedule (Recurring)

#### For Single Transfer:

**Endpoint:** `POST /transfer/execute`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Request:**
```json
{
  "intentId": "65abc123def456...",
  "signature": "0xabc123def456...",
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "transferId": "65xyz789...",
  "txHash": "0xdef456ghi789...",
  "status": "confirmed",
  "explorerUrl": "https://celo-sepolia.blockscout.com/tx/0xdef456...",
  "blockNumber": 12345678
}
```

**What Happened:**
- ✅ Transfer executed on blockchain
- 💸 Funds sent to recipient
- ⭐ Agent reputation increased
- 🔗 View on block explorer

#### For Recurring Transfer:

**Endpoint:** `POST /schedule/create`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Request:**
```json
{
  "intentId": "65abc123def456...",
  "signature": "0xabc123def456...",
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Response:**
```json
{
  "scheduleId": "65schedule123...",
  "frequency": "weekly",
  "nextRun": "2026-02-21T10:00:00Z",
  "status": "active"
}
```

**What Happened:**
- 📅 Schedule created
- 🔁 Will run every week automatically
- ⏰ Next run: Feb 21, 2026

---

## 📊 Query Agent & Transfer Status

### Get Agent Reputation

**Endpoint:** `GET /agent/1`

**Response:**
```json
{
  "agentId": 1,
  "owner": "0xBackendAgentAddress",
  "isVerified": true,
  "reputation": {
    "agentId": 1,
    "score": 5,
    "totalFeedback": 42,
    "rating": "5/5",
    "explorerUrl": "https://8004scan.io/agent/1"
  },
  "recentActivity": [
    {
      "txHash": "0xabc...",
      "recipient": "0xRecipient1",
      "amount": "50000000000000000000",
      "confirmedAt": "2026-02-14T09:00:00Z"
    }
  ]
}
```

### Check Transfer Status

**Endpoint:** `GET /transfer/0xTRANSACTION_HASH`

**Response:**
```json
{
  "txHash": "0xdef456ghi789...",
  "status": "confirmed",
  "recipient": "0xRecipientAddress",
  "amount": "50000000000000000000",
  "blockNumber": 12345678,
  "gasUsed": "21000",
  "createdAt": "2026-02-14T10:00:00Z",
  "confirmedAt": "2026-02-14T10:00:30Z"
}
```

### View User's Schedules

**Endpoint:** `GET /schedule/user/0xUSER_ADDRESS`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "schedules": [
    {
      "scheduleId": "65schedule123...",
      "frequency": "weekly",
      "amount": "50000000000000000000",
      "recipient": "0xMamaAddress",
      "nextRun": "2026-02-21T10:00:00Z",
      "lastRun": "2026-02-14T10:00:00Z",
      "isActive": true
    }
  ]
}
```

### Cancel a Schedule

**Endpoint:** `DELETE /schedule/65schedule123...`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "message": "Schedule cancelled",
  "scheduleId": "65schedule123...",
  "isActive": false
}
```

---

## 🎯 Complete User Journey

### Scenario: Send $50 to mama.eth every week

```
1. Connect Wallet
   └─> POST /auth/nonce (get message to sign)
   └─> Sign message with wallet
   └─> POST /auth/login (get token)
   
2. Say What You Want
   └─> POST /intent/parse
       Input: "Send $50 to mama.eth every week"
       Returns: intentId + parsed details
   
3. Authorize Agent (First Time)
   └─> Call setAgentLimit() on blockchain
       (User signs transaction)
   
4. Sign Transfer
   └─> Sign EIP-712 message with wallet
       (No blockchain transaction, just signature)
   
5. Create Schedule
   └─> POST /schedule/create
       Backend will execute weekly automatically
   
6. Done! 
   └─> GET /schedule/user/0xYourAddress (view schedules)
   └─> GET /agent/1 (see agent reputation growing)
```

---

## ⚡ Quick Reference

| Action | Endpoint | Auth Required |
|--------|----------|---------------|
| Get sign message | `POST /auth/nonce` | ❌ |
| Login | `POST /auth/login` | ❌ |
| Check user | `GET /auth/me` | ✅ |
| Parse intent | `POST /intent/parse` | ✅ |
| Execute transfer | `POST /transfer/execute` | ✅ |
| Create schedule | `POST /schedule/create` | ✅ |
| Get agent info | `GET /agent/:id` | ❌ |
| Get transfer status | `GET /transfer/:hash` | ❌ |
| View schedules | `GET /schedule/user/:address` | ✅ |
| Cancel schedule | `DELETE /schedule/:id` | ✅ |

---

## 🔢 Data Formats

### Amounts
Always in wei (18 decimals)
```
"50000000000000000000" = 50 cUSD
Use parseUnits("50", 18) to convert
Use formatUnits(amount, 18) to display
```

### Addresses
Lowercase, checksummed
```
"0x742d35cc6634c0532925a3b844bc9e7595f0beb"
```

### Dates
ISO 8601 format
```
"2026-02-14T10:30:00Z"
```

---

## 🚨 Error Responses

All errors return:
```json
{
  "error": "Human-readable error message"
}
```

### Common Errors:
- **401** - Not authenticated (missing/invalid token)
- **403** - Not authorized (wrong user)
- **404** - Resource not found
- **400** - Invalid request data
- **500** - Server error

---

## 💡 For Frontend

- Store token in localStorage after login
- Check token expiry (7 days) and prompt re-login
- Show loading states for blockchain operations
- Handle wallet connection separately from API auth
- Convert amounts properly (wei ↔ human-readable)
- Poll `/transfer/:hash` for status updates
- Refresh schedules after creation/cancellation
```
