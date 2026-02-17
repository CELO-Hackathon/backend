import { Router } from 'express';
import { blockchain } from '../services/blockchain';
import { Intent } from '../models/Intent';
import { Transfer } from '../models/Transfer';
import { User } from '../models/User';
import { validate, executeTransferSchema } from '../middleware/validation';
import { authenticate, verifyAddressOwnership } from '../middleware/auth';
import {requireAgentVerification} from '../middleware/agentVerification';
import { transferLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { usdToWei, calculateDeadline } from '../utils/helpers';
import { env } from '../config/env';
import { Address, Hex } from 'viem';

const router = Router();

/**
 * POST /api/transfer/execute
 * Execute a transfer
 */
router.post('/execute',
    authenticate,
    verifyAddressOwnership,
    transferLimiter,
    requireAgentVerification,
    validate(executeTransferSchema),
    async (req, res, next) => {
  try {
    // const { intentId, signature, userAddress } = req.body;
    
    // logger.info('Executing transfer', { intentId, userAddress });
    
    // // Get intent
    // const intent = await Intent.findById(intentId);
    // if (!intent) {
    //   return res.status(404).json({ error: 'Intent not found' });
    // }
    
    // if (intent.status === 'executed') {
    //   return res.status(400).json({ error: 'Intent already executed' });
    // }
    
    // // Get user
    // const user = await User.findOne({ address: userAddress.toLowerCase() });
    // if (!user) {
    //   return res.status(404).json({ error: 'User not found' });
    // }
    
    // // Build transfer request
    // const nonce = await blockchain.getNonce(userAddress as Address);
    // const amount = usdToWei(intent.parsedIntent.amount);
    // const deadline = calculateDeadline(1);
    
    // const request = {
    //   recipient: intent.parsedIntent.recipient as Address,
    //   amount,
    //   nonce,
    //   deadline: BigInt(deadline),
    // };
    const { intentId, signature, userAddress, request: signedRequest } = req.body; // ✅ Accept request from body
    
    logger.info('Executing transfer', { intentId, userAddress });
    
    // Get intent
    const intent = await Intent.findById(intentId);
    if (!intent) {
      return res.status(404).json({ error: 'Intent not found' });
    }
    
    if (intent.status === 'executed') {
      return res.status(400).json({ error: 'Intent already executed' });
    }
    
    // Get user
    const user = await User.findOne({ address: userAddress.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // ✅ Use the signed request if provided, otherwise build it
    let request;
    if (signedRequest) {
      request = {
        recipient: signedRequest.recipient as Address,
        amount: BigInt(signedRequest.amount),
        nonce: BigInt(signedRequest.nonce),
        deadline: BigInt(signedRequest.deadline),
      };
    } else {
      // Fallback to building it (won't work for pre-signed requests)
      const nonce = await blockchain.getNonce(userAddress as Address);
      const amount = usdToWei(intent.parsedIntent.amount);
      const deadline = calculateDeadline(1);
      
      request = {
        recipient: intent.parsedIntent.recipient as Address,
        amount,
        nonce,
        deadline: BigInt(deadline),
      };
    }
    // Execute on blockchain
    const result = await blockchain.executeTransfer(request, signature as Hex);
    
    // Save transfer record
    const transfer = await Transfer.create({
      intentId: intent._id,
      userId: user._id,
      agentId: parseInt(env.PLATFORM_AGENT_ID),
      txHash: result.txHash,
      recipient: intent.parsedIntent.recipient,
      amount: signedRequest.amount.toString() || usdToWei(intent.parsedIntent.amount),
      status: result.status,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed,
      reputationRecorded: true,
      confirmedAt: result.status === 'confirmed' ? new Date() : undefined,
    });
    
    // Update intent
    intent.status = 'executed';
    intent.executedAt = new Date();
    await intent.save();
    
    res.json({
      transferId: transfer._id,
      txHash: result.txHash,
      status: result.status,
      explorerUrl: result.explorerUrl,
      blockNumber: result.blockNumber,
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/transfer/:txHash
 * Get transfer status
 */
router.get('/:txHash', async (req, res, next) => {
  try {
    const { txHash } = req.params;
    
    const transfer = await Transfer.findOne({ txHash })
      .populate('userId', 'address')
      .populate('intentId');
    
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    res.json({
      txHash: transfer.txHash,
      status: transfer.status,
      recipient: transfer.recipient,
      amount: transfer.amount,
      blockNumber: transfer.blockNumber,
      gasUsed: transfer.gasUsed,
      createdAt: transfer.createdAt,
      confirmedAt: transfer.confirmedAt,
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;