import { blockchain } from './blockchain';
import { logger } from '../utils/logger';

export class ReputationService {
  /**
   * Get current agent reputation
   */
  async getReputation() {
    try {
      const reputation = await blockchain.getAgentReputation();
      
      return {
        agentId: reputation.agentId,
        score: reputation.averageRating,
        totalFeedback: reputation.feedbackCount,
        rating: `${reputation.averageRating}/5`,
        explorerUrl: `https://8004scan.io/agent/${reputation.agentId}`,
      };
      
    } catch (error) {
      logger.error('Failed to get reputation:', error);
      throw error;
    }
  }

  /**
   * Check if agent meets minimum reputation requirements
   */
  async meetsMinimumReputation(minScore: number = 0): Promise<boolean> {
    const reputation = await blockchain.getAgentReputation();
    return reputation.averageRating >= minScore;
  }
}

export const reputation = new ReputationService();