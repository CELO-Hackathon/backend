// import { Address, Hex, parseUnits } from 'viem';
// import {
//   publicClient,
//   walletClient,
//   CONTRACTS,
//   VAULT_ABI,
//   IDENTITY_REGISTRY_ABI,
//   REPUTATION_REGISTRY_ABI,
// } from '../config/blockchain';
// import { env } from '../config/env';
// import { logger } from '../utils/logger';
// import { TransferRequest, TransferResult } from '../types/transfer';
// import { AgentReputation } from '../types/blockchain';
// import { weiToUsd } from '../utils/helpers';

// export class BlockchainService {
//   /**
//    * Get user's nonce from vault
//    */
//   async getNonce(userAddress: Address): Promise<bigint> {
//     const nonce = await publicClient.readContract({
//       address: CONTRACTS.VAULT,
//       abi: VAULT_ABI,
//       functionName: 'getNonce',
//       args: [userAddress],
//     });
    
//     return nonce;
//   }

//   /**
//    * Get user's vault balance
//    */
//   async getVaultBalance(userAddress: Address): Promise<bigint> {
//     const balance = await publicClient.readContract({
//       address: CONTRACTS.VAULT,
//       abi: VAULT_ABI,
//       functionName: 'balanceOf',
//       args: [userAddress],
//     });
    
//     return balance;
//   }

//   /**
//    * Execute transfer via vault
//    */
//   async executeTransfer(
//     request: TransferRequest,
//     signature: Hex,
//   ): Promise<TransferResult> {
//     try {
//       const agentId = BigInt(env.PLATFORM_AGENT_ID);
      
//       logger.info('Executing transfer', {
//         recipient: request.recipient,
//         amount: weiToUsd(request.amount),
//         agentId: agentId.toString(),
//       });
      
//       // Execute transaction
//       const hash = await walletClient.writeContract({
//         address: CONTRACTS.VAULT,
//         abi: VAULT_ABI,
//         functionName: 'executeTransfer',
//         args: [request, signature, agentId],
//       });
      
//       logger.info('Transfer transaction sent', { hash });
      
//       // Wait for confirmation
//       const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
//       logger.info('Transfer confirmed', {
//         hash,
//         blockNumber: receipt.blockNumber,
//         gasUsed: receipt.gasUsed.toString(),
//       });
      
//       return {
//         txHash: hash,
//         status: receipt.status === 'success' ? 'confirmed' : 'failed',
//         explorerUrl: `https://celo-sepolia.blockscout.com/tx/${hash}`,
//         blockNumber: Number(receipt.blockNumber),
//         gasUsed: receipt.gasUsed.toString(),
//       };
      
//     } catch (error) {
//       logger.error('Transfer execution failed:', error);
//       throw new Error('Failed to execute transfer on blockchain');
//     }
//   }

//   /**
//    * Verify agent owns the NFT
//    */
//   async verifyAgentOwnership(): Promise<boolean> {
//     try {
//       const agentId = BigInt(env.PLATFORM_AGENT_ID);
      
//       const owner = await publicClient.readContract({
//         address: CONTRACTS.IDENTITY_REGISTRY,
//         abi: IDENTITY_REGISTRY_ABI,
//         functionName: 'ownerOf',
//         args: [agentId],
//       });
      
//       const expectedOwner = walletClient.account.address;
      
//       return (owner as any).toLowerCase() === expectedOwner.toLowerCase();
      
//     } catch (error) {
//       logger.error('Failed to verify agent ownership:', error);
//       return false;
//     }
//   }

//   /**
//    * Get agent reputation from ERC-8004
//    */
//   async getAgentReputation(): Promise<AgentReputation> {
//     try {
//       const agentId = BigInt(env.PLATFORM_AGENT_ID);
      
//       // Get reputation from vault (which queries reputation registry)
//       const [feedbackCount, averageRating] = await publicClient.readContract({
//         address: CONTRACTS.VAULT,
//         abi: VAULT_ABI,
//         functionName: 'getAgentReputation',
//         args: [agentId],
//       });
      
//       logger.debug('Agent reputation fetched', {
//         feedbackCount: feedbackCount.toString(),
//         averageRating: averageRating.toString(),
//       });
      
//       return {
//         agentId: Number(agentId),
//         feedbackCount: Number(feedbackCount),
//         averageRating: Number(averageRating),
//         totalTransactions: Number(feedbackCount), // Same as feedback count
//         totalVolume: '0', // Would need to track separately
//         lastActive: new Date(),
//       };
      
//     } catch (error) {
//       logger.error('Failed to get agent reputation:', error);
//       throw new Error('Failed to fetch agent reputation');
//     }
//   }

//   /**
//    * Get domain separator for EIP-712 signing
//    */
//   async getDomainSeparator(): Promise<Hex> {
//     const domainSeparator = await publicClient.readContract({
//       address: CONTRACTS.VAULT,
//       abi: VAULT_ABI,
//       functionName: 'getDomainSeparator',
//     });
    
//     return domainSeparator;
//   }
// }

// export const blockchain = new BlockchainService();

import { Address, Hex, parseUnits } from 'viem';
import {
  publicClient,
  walletClient,
  CONTRACTS,
  VAULT_ABI,
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
} from '../config/blockchain';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { TransferRequest, TransferResult } from '../types/transfer';
import { AgentReputation } from '../types/blockchain';
import { weiToUsd } from '../utils/helpers';

export class BlockchainService {
  //  Add getter for agent address
  getAgentAddress(): Address {
    return walletClient.account.address;
  }

  /**
   * Get user's nonce from vault
   */
  async getNonce(userAddress: Address): Promise<bigint> {
    const nonce = await publicClient.readContract({
      address: CONTRACTS.VAULT,
      abi: VAULT_ABI,
      functionName: 'getNonce',
      args: [userAddress],
    });
    
    return nonce as any;
  }

  /**
   * Get user's vault balance
   */
  async getVaultBalance(userAddress: Address): Promise<bigint> {
    const balance = await publicClient.readContract({
      address: CONTRACTS.VAULT,
      abi: VAULT_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    });
    
    return balance as any;
  }

  /**
   * Execute transfer via vault
   */
  async executeTransfer(
    request: TransferRequest,
    signature: Hex,
  ): Promise<TransferResult> {
    try {
      const agentId = BigInt(env.PLATFORM_AGENT_ID);
      
      logger.info('Executing transfer', {
        recipient: request.recipient,
        amount: weiToUsd(request.amount),
        agentId: agentId.toString(),
      });
      
      // Execute transaction
      const hash = await walletClient.writeContract({
        address: CONTRACTS.VAULT,
        abi: VAULT_ABI,
        functionName: 'executeTransfer',
        args: [request, signature, agentId],
      });
      
      logger.info('Transfer transaction sent', { hash });
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      logger.info('Transfer confirmed', {
        hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      });
      
      return {
        txHash: hash,
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        explorerUrl: `https://celo-sepolia.blockscout.com/tx/${hash}`,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
      };
      
    } catch (error) {
      logger.error('Transfer execution failed:', error);
      throw new Error('Failed to execute transfer on blockchain');
    }
  }

  /**
   * Verify agent owns the NFT
   */
  async verifyAgentOwnership(): Promise<boolean> {
    try {
      const agentId = BigInt(env.PLATFORM_AGENT_ID);
      
      const owner = await publicClient.readContract({
        address: CONTRACTS.IDENTITY_REGISTRY,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'ownerOf',
        args: [agentId],
      });
      
      const expectedOwner = walletClient.account.address;
      
      return (owner as any).toLowerCase() === expectedOwner.toLowerCase();
      
    } catch (error) {
      logger.error('Failed to verify agent ownership:', error);
      return false;
    }
  }

  /**
   * Get agent reputation from ERC-8004
   */
  // async getAgentReputation(): Promise<AgentReputation> {
  //   try {
  //     const agentId = BigInt(env.PLATFORM_AGENT_ID);
      
  //     //  Try vault's helper function first
  //     try {
  //       const [feedbackCount, averageRating] = await publicClient.readContract({
  //         address: CONTRACTS.VAULT,
  //         abi: VAULT_ABI,
  //         functionName: 'getAgentReputation',
  //         args: [agentId],
  //       });
        
  //       logger.debug('Agent reputation from vault', {
  //         feedbackCount: feedbackCount.toString(),
  //         averageRating: averageRating.toString(),
  //       });
        
  //       return {
  //         agentId: Number(agentId),
  //         feedbackCount: Number(feedbackCount),
  //         averageRating: Number(averageRating),
  //         totalTransactions: Number(feedbackCount),
  //         totalVolume: '0',
  //         lastActive: new Date(),
  //       };
  //     } catch (vaultError) {
  //       //  If vault fails, query reputation registry directly
  //       logger.warn('Vault getAgentReputation failed, querying registry directly');
        
  //       const [feedbackCount, averageRating] = await publicClient.readContract({
  //         address: CONTRACTS.REPUTATION_REGISTRY,
  //         abi: REPUTATION_REGISTRY_ABI,
  //         functionName: 'getSummary',
  //         args: [
  //           agentId,
  //           [], // Empty array for all clients
  //           'remittance',
  //           'transfer'
  //         ],
  //       });
        
  //       logger.debug('Agent reputation from registry', {
  //         feedbackCount: feedbackCount.toString(),
  //         averageRating: averageRating.toString(),
  //       });
        
  //       return {
  //         agentId: Number(agentId),
  //         feedbackCount: Number(feedbackCount),
  //         averageRating: Number(averageRating),
  //         totalTransactions: Number(feedbackCount),
  //         totalVolume: '0',
  //         lastActive: new Date(),
  //       };
  //     }
      
  //   } catch (error) {
  //     logger.error('Failed to get agent reputation:', error);
      
  //     //  Return default values instead of throwing
  //     logger.warn('Returning default reputation (agent may have no feedback yet)');
      
  //     return {
  //       agentId: Number(env.PLATFORM_AGENT_ID),
  //       feedbackCount: 0,
  //       averageRating: 0,
  //       totalTransactions: 0,
  //       totalVolume: '0',
  //       lastActive: new Date(),
  //     };
  //   }
  // }

  /**
   * Get agent reputation from ERC-8004
   */
  async getAgentReputation(): Promise<AgentReputation> {
    try {
      const agentId = BigInt(env.PLATFORM_AGENT_ID);
      
      //  Try vault's helper function first
      try {
        const result = await publicClient.readContract({
          address: CONTRACTS.VAULT,
          abi: VAULT_ABI,
          functionName: 'getAgentReputation',
          args: [agentId],
        }) as readonly [bigint, bigint, number]; //  Type assertion
        
        const [feedbackCount, averageRating] = result;
        
        logger.debug('Agent reputation from vault', {
          feedbackCount: feedbackCount.toString(),
          averageRating: averageRating.toString(),
        });
        
        return {
          agentId: Number(agentId),
          feedbackCount: Number(feedbackCount),
          averageRating: Number(averageRating),
          totalTransactions: Number(feedbackCount),
          totalVolume: '0',
          lastActive: new Date(),
        };
      } catch (vaultError) {
        //  If vault fails, query reputation registry directly
        logger.warn('Vault getAgentReputation failed, querying registry directly');
        
        const result = await publicClient.readContract({
          address: CONTRACTS.REPUTATION_REGISTRY,
          abi: REPUTATION_REGISTRY_ABI,
          functionName: 'getSummary',
          args: [
            agentId,
            [], // Empty array for all clients
            'remittance',
            'transfer'
          ],
        }) as readonly [bigint, bigint, number]; //  Type assertion
        
        const [feedbackCount, averageRating] = result;
        
        logger.debug('Agent reputation from registry', {
          feedbackCount: feedbackCount.toString(),
          averageRating: averageRating.toString(),
        });
        
        return {
          agentId: Number(agentId),
          feedbackCount: Number(feedbackCount),
          averageRating: Number(averageRating),
          totalTransactions: Number(feedbackCount),
          totalVolume: '0',
          lastActive: new Date(),
        };
      }
      
    } catch (error) {
      logger.error('Failed to get agent reputation:', error);
      
      //  Return default values
      logger.warn('Returning default reputation (agent may have no feedback yet)');
      
      return {
        agentId: Number(env.PLATFORM_AGENT_ID),
        feedbackCount: 0,
        averageRating: 0,
        totalTransactions: 0,
        totalVolume: '0',
        lastActive: new Date(),
      };
    }
  }
  /**
   * Get domain separator for EIP-712 signing
   */
  async getDomainSeparator(): Promise<Hex> {
    const domainSeparator = await publicClient.readContract({
      address: CONTRACTS.VAULT,
      abi: VAULT_ABI,
      functionName: 'getDomainSeparator',
    });
    
    return domainSeparator as any;
  }
}

export const blockchain = new BlockchainService();