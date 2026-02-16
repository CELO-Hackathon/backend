import { GoogleGenerativeAI } from '@google/generative-ai';
import { normalize } from 'viem/ens';
import { env } from '../config/env';
import { ParsedIntent, IntentSchema } from '../types/intent';
import { logger } from '../utils/logger';
import { isValidAddress } from '../utils/helpers';
import { publicClient, CONTRACTS } from '../config/blockchain';
import { Address } from 'viem';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export class AIAgentService {
  /**
   * Parse natural language input into structured intent
   */
  async parseIntent(userInput: string): Promise<ParsedIntent> {
    try {
      const prompt = `
You are an AI assistant that extracts structured remittance data from natural language.

Extract the following information from the user's input and return ONLY a valid JSON object with no additional text:

{
  "action": "single_transfer" or "recurring_transfer",
  "amount": "numeric value as string",
  "currency": "USD" or "cUSD",
  "recipient": "Ethereum address (0x...)",
  "frequency": "daily" | "weekly" | "monthly" (only if recurring)
}

Rules:
1. If input mentions "weekly", "daily", "monthly", "recurring", "every", set action to "recurring_transfer"
2. Otherwise, set action to "single_transfer"
3. Extract numeric amount (remove $, commas, etc.)
4. Default currency to "USD"
5. If recipient is an ENS name (e.g., "mama.eth"), keep it as-is for now
6. If recipient looks like an address (0x...), use it directly
7. Return ONLY the JSON object, no markdown, no explanation

Examples:
Input: "Send $50 to 0xABC123..."
Output: {"action":"single_transfer","amount":"50","currency":"USD","recipient":"0xABC123..."}

Input: "Transfer 100 cUSD weekly to mama.eth"
Output: {"action":"recurring_transfer","amount":"100","currency":"cUSD","recipient":"mama.eth","frequency":"weekly"}

Now extract from this input:
"${userInput}"
`;
       logger.debug('Sending to Gemini:', { userInput });
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // logger.debug('Gemini raw response:', response);
      
      // remove gemini markdown
      const cleanedResponse = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate with Zod
      const validated = IntentSchema.parse(parsed);
      
      logger.info('Intent parsed successfully', { intent: validated });
      
      return validated;
      
    } catch (error) {
      logger.error('Failed to parse intent:', error);
       if (error instanceof Error) {
        logger.error('Error details:', error.message);
      }
      throw new Error('Failed to understand your request. Please try rephrasing.');
    }
  }

  /**
   * Resolve ENS/CNS names to addresses
   */
  async resolveRecipient(recipient: string): Promise<string> {
    try {
      // If already a valid address, return as-is
      if (isValidAddress(recipient)) {
        logger.debug('Recipient is already a valid address', { recipient });
        return recipient;
      }
      
      // handle ENS names
      if (recipient.endsWith('.eth')) {
        logger.info('Resolving ENS name', { ensName: recipient });
        
        try {
          // handle unicode, case sensitivity
          const normalizedName = normalize(recipient);
          const address = await this.resolveENS(normalizedName);
          
          if (!address) {
            throw new Error(`ENS name "${recipient}" does not resolve to an address`);
          }
          
          logger.info('ENS resolved successfully', { ensName: recipient, address });
          return address;
          
        } catch (ensError) {
          logger.error('ENS resolution failed', { ensName: recipient, error: ensError });
          throw new Error(`Could not resolve ENS name "${recipient}". Please verify the name or use a 0x address.`);
        }
      }
      
      // handle CeloNameService
      if (recipient.endsWith('.celo')) {
        logger.warn('Celo Name Service not yet implemented', { cnsName: recipient });
        throw new Error('Celo Name Service (.celo) is not yet supported. Please use a 0x address or .eth name.');
      }
      
      // handle other formats
      throw new Error(`Invalid recipient format: "${recipient}". Please use a 0x address or .eth name.`);
      
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to resolve recipient address');
    }
  }

  /**
   * Resolve ENS name using Ethereum mainnet
   */
  private async resolveENS(ensName: string): Promise<string | null> {
    try {
      const { createPublicClient, http } = await import('viem');
      const { mainnet } = await import('viem/chains');
      
      const ethereumClient = createPublicClient({
        chain: mainnet,
        transport: http('https://eth.llamarpc.com'),
      });
      
      // Resolve ENS name
      const address = await ethereumClient.getEnsAddress({
        name: normalize(ensName),
      });
      
      return address;
      
    } catch (error) {
      logger.error('ENS resolution error:', error);
      return null;
    }
  }

  /**
   * Estimate gas for transfer
   */
  async estimateGas(amount?: string, recipient?: string): Promise<string> {
    try {
      if (amount && recipient && isValidAddress(recipient)) {
        logger.debug('Estimating gas for transfer', { amount, recipient });
        
        // current gas price
        const gasPrice = await publicClient.getGasPrice();
        const estimatedGasUnits = 150000n; // Average for executeTransfer + reputation recording
        
        // total gas cost
        const gasCost = gasPrice * estimatedGasUnits;
        const gasCostInCUSD = Number(gasCost) / 1e18;
        
        logger.debug('Gas estimation', {
          gasPrice: gasPrice.toString(),
          estimatedGasUnits: estimatedGasUnits.toString(),
          gasCostInCUSD: gasCostInCUSD.toFixed(6),
        });
        
        return `${gasCostInCUSD.toFixed(6)} cUSD`;
      }
      
      // Default estimation if params not available
      logger.debug('Using default gas estimation');
      return '0.002 cUSD';
      
    } catch (error) {
      logger.error('Gas estimation failed, using default', error);
      return '0.002 cUSD';
    }
  }

  /**
   * Validate and prepare intent for execution
   */
  async prepareIntent(intent: ParsedIntent): Promise<ParsedIntent> {
    logger.info('Preparing intent for execution', { intent });
    const resolvedRecipient = await this.resolveRecipient(intent.recipient);
    
    // prepared intent with resolved recipient
    const preparedIntent: ParsedIntent = {
      ...intent,
      recipient: resolvedRecipient,
    };
    
    logger.info('Intent prepared successfully', { preparedIntent });
    
    return preparedIntent;
  }
}

export const aiAgent = new AIAgentService();

// import { GoogleGenerativeAI } from '@google/generative-ai';
// import { normalize } from 'viem/ens';
// import { env } from '../config/env';
// import { ParsedIntent, IntentSchema } from '../types/intent';
// import { logger } from '../utils/logger';
// import { isValidAddress } from '../utils/helpers';
// import { publicClient } from '../config/blockchain';

// const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// export class AIAgentService {
//   async parseIntent(userInput: string): Promise<ParsedIntent> {
//     try {
//       const prompt = `Extract transfer info from: "${userInput}"

// Return ONLY valid JSON (no markdown):
// {
//   "action": "single_transfer" or "recurring_transfer",
//   "amount": "number",
//   "currency": "USD",
//   "recipient": "0x address",
//   "frequency": "daily|weekly|monthly" (if recurring)
// }

// Rules:
// - If "daily", "weekly", "monthly", "every", "recurring" → action: "recurring_transfer"
// - Extract amount (remove $, commas)
// - Default currency: "USD"
// - Keep recipient as-is`;

//       logger.debug('Sending to Gemini:', { userInput });

//       const result = await model.generateContent(prompt);
//       const response = result.response.text();

//       // ✅ Log as string, not object
//       logger.debug('Gemini response:', response);

//       // Clean response
//       const cleaned = response.replace(/```json|```/g, '').trim();

//       // Parse JSON
//       const parsed = JSON.parse(cleaned);
      
//       // ✅ Normalize recipient address to lowercase
//       if (parsed.recipient) {
//         // parsed.recipient = parsed.recipient.toLowerCase();
//         parsed.recipient = parsed.recipient.toLowerCase().trim();
//       }

//       logger.debug('Parsed JSON:', parsed);

//       // Validate with Zod
//       const validated = IntentSchema.parse(parsed);

//       logger.info('✅ Intent parsed successfully:', validated);
//       return validated;

//     } catch (error) {
//       logger.error('Gemini parsing failed:', error);
      
//       if (error instanceof Error) {
//         logger.error('Error message:', error.message);
//       }
      
//       throw new Error('Failed to understand your request. Please try rephrasing.');
//     }
//   }
// //   async parseIntent(userInput: string): Promise<ParsedIntent> {
// //   try {
// //     const prompt = `Extract transfer info from: "${userInput}"

// // Return ONLY valid JSON (no markdown):
// // {
// //   "action": "single_transfer" | "recurring_transfer",
// //   "amount": "string",
// //   "currency": "USD",
// //   "recipient": "0x address",
// //   "frequency": "daily|weekly|monthly"
// // }

// // Rules:
// // - If "daily", "weekly", "monthly", "every", "recurring" → action: "recurring_transfer"
// // - Extract amount (remove symbols)
// // - Default currency: "USD"`;

// //     logger.debug('Sending to Gemini:', { userInput });

// //     const result = await model.generateContent({
// //       contents: [{ role: 'user', parts: [{ text: prompt }] }],
// //       generationConfig: {
// //         responseMimeType: "application/json",
// //       },
// //     });

// //     let rawResponse = result.response.text();

// //     // 1. CRITICAL FIX: Convert object-style strings back to actual strings
// //     // This handles the {"0": "{", "1": "\n" ...} issue seen in your logs
// //     if (typeof rawResponse === 'object' && rawResponse !== null) {
// //       rawResponse = Object.values(rawResponse).join('');
// //     }

// //     logger.debug('Gemini response (cleaned string):', rawResponse);

// //     // 2. Parse the JSON
// //     const parsed = JSON.parse(rawResponse);

// //     // 3. SANITIZE RECIPIENT
// //     if (parsed.recipient) {
// //       // Force recipient to be a primitive string, just in case
// //       let recipient = String(Object.values(parsed.recipient).join('') || parsed.recipient)
// //         .toLowerCase()
// //         .trim()
// //         .replace(/\s/g, '');

// //       // Check length against standard Ethereum address (42 chars)
// //       if (recipient.length !== 42) {
// //         logger.debug('Recipient length mismatch, searching original input...');
// //         const match = userInput.match(/0x[a-fA-F0-9]{40}/);
// //         if (match) {
// //           recipient = match[0].toLowerCase();
// //         } else {
// //           // If we still don't have 42 chars, it's invalid
// //           throw new Error(`Invalid address length: ${recipient.length}`);
// //         }
// //       }

// //       parsed.recipient = recipient;

// //       if (!isValidAddress(parsed.recipient)) {
// //         throw new Error(`Invalid checksum: ${parsed.recipient}`);
// //       }
// //     }

// //     // 4. Validate with Schema
// //     const validated = IntentSchema.parse(parsed);
// //     logger.info('✅ Intent parsed successfully:', validated);
// //     return validated;

// //   } catch (error) {
// //     logger.error('Gemini parsing failed:', error);
// //     throw new Error('Failed to understand your request. Please try rephrasing.');
// //   }
// // }
//   async resolveRecipient(recipient: string): Promise<string> {
//     try {
//       // If already a valid address, return as-is (lowercase)
//       if (isValidAddress(recipient)) {
//         logger.debug('Recipient is already a valid address', { recipient });
//         return recipient.toLowerCase();
//       }
      
//       // Handle ENS names (.eth)
//       if (recipient.endsWith('.eth')) {
//         logger.info('Resolving ENS name', { ensName: recipient });
        
//         try {
//           const normalizedName = normalize(recipient);
//           const address = await this.resolveENS(normalizedName);
          
//           if (!address) {
//             throw new Error(`ENS name "${recipient}" does not resolve to an address`);
//           }
          
//           logger.info('✅ ENS resolved:', { ensName: recipient, address });
//           return address.toLowerCase();
          
//         } catch (ensError) {
//           logger.error('ENS resolution failed', { ensName: recipient, error: ensError });
//           throw new Error(`Could not resolve ENS name "${recipient}".`);
//         }
//       }
      
//       // Handle Celo domains (.celo)
//       if (recipient.endsWith('.celo')) {
//         throw new Error('Celo Name Service (.celo) is not yet supported. Use a 0x address or .eth name.');
//       }
      
//       throw new Error(`Invalid recipient: "${recipient}". Use a 0x address or .eth name.`);
      
//     } catch (error) {
//       if (error instanceof Error) {
//         throw error;
//       }
//       throw new Error('Failed to resolve recipient address');
//     }
//   }

//   private async resolveENS(ensName: string): Promise<string | null> {
//     try {
//       const { createPublicClient, http } = await import('viem');
//       const { mainnet } = await import('viem/chains');
      
//       const ethereumClient = createPublicClient({
//         chain: mainnet,
//         transport: http('https://eth.llamarpc.com'),
//       });
      
//       const address = await ethereumClient.getEnsAddress({
//         name: normalize(ensName),
//       });
      
//       if (address) {
//         logger.info('ENS resolved via Ethereum mainnet', { ensName, address });
//       }
      
//       return address;
      
//     } catch (error) {
//       logger.error('ENS resolution error:', error);
//       return null;
//     }
//   }

//   async estimateGas(amount?: string, recipient?: string): Promise<string> {
//     try {
//       if (amount && recipient && isValidAddress(recipient)) {
//         logger.debug('Estimating gas', { amount, recipient });
        
//         const gasPrice = await publicClient.getGasPrice();
//         const estimatedGasUnits = 150000n;
//         const gasCost = gasPrice * estimatedGasUnits;
//         const gasCostInCUSD = Number(gasCost) / 1e18;
        
//         return `${gasCostInCUSD.toFixed(6)} cUSD`;
//       }
      
//       return '0.002 cUSD';
      
//     } catch (error) {
//       logger.error('Gas estimation failed, using default', error);
//       return '0.002 cUSD';
//     }
//   }

//   async prepareIntent(intent: ParsedIntent): Promise<ParsedIntent> {
//     logger.info('Preparing intent', { intent });
    
//     const resolvedRecipient = await this.resolveRecipient(intent.recipient);
    
//     const preparedIntent: ParsedIntent = {
//       ...intent,
//       recipient: resolvedRecipient,
//     };
    
//     logger.info('✅ Intent prepared:', preparedIntent);
//     return preparedIntent;
//   }
// }

// export const aiAgent = new AIAgentService();