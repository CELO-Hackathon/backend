import { Router } from 'express';
import { authenticate, verifyAddressOwnership } from '../middleware/auth';
import { aiAgent } from '../services/aiAgent';
import { blockchain } from '../services/blockchain';
import { User } from '../models/User';
import { Intent } from '../models/Intent';
import { validate, parseIntentSchema } from '../middleware/validation';
import { logger } from '../utils/logger';
import { weiToUsd } from '../utils/helpers';
import { env } from '../config/env';

const router = Router();

/**
 * POST /api/intent/parse
 * Parse natural language input into structured intent
 */
router.post(
  '/parse',
  authenticate,
  verifyAddressOwnership,
  validate(parseIntentSchema),
  async (req, res, next) => {
    try {
      const { userInput, userAddress } = req.body;
      
      logger.info('Parsing intent', { userAddress, userInput });
      const user = await User.findOne({ address: userAddress.toLowerCase() });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Parse intent with agent
      const parsedIntent = await aiAgent.parseIntent(userInput);
      
      // resolve ENS
      let preparedIntent = parsedIntent;
      let resolutionError = null;
      
      try {
        preparedIntent = await aiAgent.prepareIntent(parsedIntent);
      } catch (resolveError) {
        // If resolution fails, we'll store the error but continue
        resolutionError = resolveError instanceof Error ? resolveError.message : 'Resolution failed';
        logger.warn('Recipient resolution failed', { 
          recipient: parsedIntent.recipient, 
          error: resolutionError 
        });
      }
      
      // Check user's vault balance
      const vaultBalance = await blockchain.getVaultBalance(userAddress as any);
      const vaultBalanceUSD = weiToUsd(vaultBalance);
      
      const gasEstimate = await aiAgent.estimateGas(
        preparedIntent.amount,
        preparedIntent.recipient
      );
      
      // Create execution plan
      const executionPlan = {
        route: 'celo' as const,
        gasEstimate,
        requiresApproval: !user.agentAuthorized,
        estimatedTime: parsedIntent.action === 'single_transfer' ? '~30 seconds' : 'Scheduled',
      };
      
      // save intent to database
      const intent = await Intent.create({
        userId: user._id,
        rawInput: userInput,
        parsedIntent: preparedIntent,
        status: parsedIntent.action === 'recurring_transfer' ? 'pending' : 'pending',
        executionPlan,
      });
      
      res.json({
        intentId: intent._id,
        intent: preparedIntent,
        executionPlan,
        userBalance: {
          vault: vaultBalanceUSD,
          isAuthorized: user.agentAuthorized,
        },
        ...(resolutionError && {
          warning: resolutionError,
          originalRecipient: parsedIntent.recipient,
        }),
      });
      
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/intent/parse-test
 * Test endpoint - bypasses auth (development only)
 */
if (env.NODE_ENV === 'development') {
  router.post('/parse-test', validate(parseIntentSchema), async (req, res, next) => {
    try {
      const { userInput, userAddress } = req.body;
      
      logger.info('[TEST] Parsing intent', { userAddress, userInput });
      
      // Find or create test user
      let user = await User.findOne({ address: userAddress.toLowerCase() });
      if (!user) {
        user = await User.create({ 
          address: userAddress.toLowerCase(),
          agentAuthorized: true, // Auto-authorize for testing
        });
        logger.info('[TEST] Created test user', { address: userAddress });
      }
      
      // Parse intent with AI
      const parsedIntent = await aiAgent.parseIntent(userInput);
      
      // Prepare intent (resolve ENS, validate)
      let preparedIntent = parsedIntent;
      let resolutionError = null;
      
      try {
        preparedIntent = await aiAgent.prepareIntent(parsedIntent);
      } catch (resolveError) {
        resolutionError = resolveError instanceof Error ? resolveError.message : 'Resolution failed';
        logger.warn('[TEST] Recipient resolution failed', { 
          recipient: parsedIntent.recipient, 
          error: resolutionError 
        });
      }
      
      // Check user's vault balance (might fail if agent not verified)
      let vaultBalanceUSD = '0';
      try {
        const vaultBalance = await blockchain.getVaultBalance(userAddress as any);
        vaultBalanceUSD = weiToUsd(vaultBalance);
      } catch (e) {
        logger.warn('[TEST] Could not fetch vault balance (agent not verified?)');
      }
      
      // Estimate gas with actual params
      const gasEstimate = await aiAgent.estimateGas(
        preparedIntent.amount,
        preparedIntent.recipient
      );
      
      // Create execution plan
      const executionPlan = {
        route: 'celo' as const,
        gasEstimate,
        requiresApproval: !user.agentAuthorized,
        estimatedTime: parsedIntent.action === 'single_transfer' ? '~30 seconds' : 'Scheduled',
      };
      
      // Save intent to database
      const intent = await Intent.create({
        userId: user._id,
        rawInput: userInput,
        parsedIntent: preparedIntent,
        status: parsedIntent.action === 'recurring_transfer' ? 'pending' : 'pending',
        executionPlan,
      });
      
      res.json({
        testMode: true,
        intentId: intent._id,
        intent: preparedIntent,
        executionPlan,
        userBalance: {
          vault: vaultBalanceUSD,
          isAuthorized: user.agentAuthorized,
        },
        ...(resolutionError && {
          warning: resolutionError,
          originalRecipient: parsedIntent.recipient,
        }),
      });
      
    } catch (error) {
      next(error);
    }
  });
}

export default router;