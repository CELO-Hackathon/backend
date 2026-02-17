import { Router } from 'express';
import { reputation } from '../services/reputation';
import { blockchain } from '../services/blockchain';
import { Transfer } from '../models/Transfer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { aiAgent } from '../services/aiAgent';
import { isValidAddress } from '../utils/helpers';

const router = Router();

/**
 * GET /api/agent/status
 * Check agent setup status (for frontend health check)
 */
router.get('/status', async (req, res, next) => {
  try {
    let isVerified = false;
    let verificationError = null;
    let reputationData = null;
    
    // Check verification
    try {
      isVerified = await blockchain.verifyAgentOwnership();
    } catch (error) {
      verificationError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // Get reputation if verified
    if (isVerified) {
      try {
        reputationData = await reputation.getReputation();
      } catch (error) {
        // Ignore reputation errors
      }
    }
    
    res.json({
      isVerified,
      agentId: isVerified ? env.PLATFORM_AGENT_ID : null,
      agentAddress: blockchain.getAgentAddress(),
      reputation: reputationData,
      vaultAddress: env.VAULT_ADDRESS,
      network: 'celo-sepolia',
      setupComplete: isVerified,
      ...(verificationError && { verificationError }),
      ...(!isVerified && {
        setupInstructions: {
          step1: 'Get test CELO from https://faucet.celo.org/celo-sepolia',
          step2: 'Run: ./scripts/register-agent-quick.sh',
          step3: 'Update PLATFORM_AGENT_ID in .env',
          step4: 'Restart server'
        }
      })
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/agent/:agentId
 * Get agent status and reputation
 */
router.get('/:agentId', async (req, res, next) => {
  try {
    const { agentId } = req.params;
    
    // Verify this is our platform agent
    if (agentId !== env.PLATFORM_AGENT_ID) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Get reputation
    const rep = await reputation.getReputation();
    
    // Get recent transfers
    const recentTransfers = await Transfer.find({
      agentId: parseInt(agentId),
      status: 'confirmed',
    })
      .sort({ confirmedAt: -1 })
      .limit(10)
      .select('txHash recipient amount confirmedAt');
    
    // Verify agent ownership
    const isOwner = await blockchain.verifyAgentOwnership();
    
    res.json({
      agentId: parseInt(agentId),
      owner: blockchain.getAgentAddress(), // ✅ Fixed
      isVerified: isOwner,
      reputation: rep,
      recentActivity: recentTransfers,
      explorerUrl: `https://8004scan.io/agent/${agentId}`,
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/agent/reputation
 * Get agent reputation summary
 */
router.get('/reputation', async (req, res, next) => {
  try {
    const rep = await reputation.getReputation();
    res.json(rep);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/agent/estimate-gas
 * Estimate gas for a transfer
 */
router.post('/estimate-gas', async (req, res, next) => {
  try {
    const { amount, recipient } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }
    
    const gasEstimate = await aiAgent.estimateGas(amount, recipient);
    
    res.json({
      gasEstimate,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/agent/resolve-recipient
 * Resolve ENS/CNS name to address
 */
router.post('/resolve-recipient', async (req, res, next) => {
  try {
    const { recipient } = req.body;
    
    if (!recipient) {
      return res.status(400).json({ error: 'Recipient is required' });
    }
    
    const resolved = await aiAgent.resolveRecipient(recipient);
    
    res.json({
      original: recipient,
      resolved,
      isENS: recipient.endsWith('.eth'),
      isCNS: recipient.endsWith('.celo'),
      isAddress: isValidAddress(recipient),
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/feedback/:agentId/:timestamp
 * Get feedback metadata ( makes URIs resolvable)
 */
router.get('/feedback/:agentId/:timestamp', async (req, res, next) => {
  try {
    const { agentId, timestamp } = req.params;
    
    // Find transfer at this timestamp
    const transfer = await Transfer.findOne({
      agentId: parseInt(agentId),
      createdAt: new Date(parseInt(timestamp) * 1000),
    });
    
    if (!transfer) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    res.json({
      agentId: parseInt(agentId),
      timestamp: parseInt(timestamp),
      transfer: {
        txHash: transfer.txHash,
        amount: transfer.amount,
        recipient: transfer.recipient,
        status: transfer.status,
      },
      rating: 5,
      tags: ['remittance', 'transfer'],
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;