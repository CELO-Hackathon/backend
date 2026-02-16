// import { z } from 'zod';

// export const IntentSchema = z.object({
//   action: z.enum(['single_transfer', 'recurring_transfer']),
//   amount: z.string(),
//   currency: z.enum(['USD', 'cUSD']),
//   recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
//   frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
// });

// export type ParsedIntent = z.infer<typeof IntentSchema>;

// export interface ExecutionPlan {
//   route: 'celo';
//   gasEstimate: string;
//   requiresApproval: boolean;
//   estimatedTime: string;
// }

// export interface IntentResponse {
//   intent: ParsedIntent;
//   executionPlan: ExecutionPlan;
// }

import { z } from 'zod';

export const IntentSchema = z.object({
  action: z.enum(['single_transfer', 'recurring_transfer']),
  amount: z.string(),
  currency: z.enum(['USD', 'cUSD']),
  // ✅ Accept both 0x addresses AND .eth names
  recipient: z.string().refine(
    (val) => {
      // Valid if it's a proper Ethereum address
      if (/^0x[a-fA-F0-9]{40}$/.test(val)) return true;
      // Valid if it's an ENS name
      if (val.endsWith('.eth')) return true;
      // Valid if it's a Celo name
      if (val.endsWith('.celo')) return true;
      return false;
    },
    {
      message: 'Recipient must be a valid 0x address, .eth name, or .celo name',
    }
  ),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
});

export type ParsedIntent = z.infer<typeof IntentSchema>;

export interface ExecutionPlan {
  route: 'celo';
  gasEstimate: string;
  requiresApproval: boolean;
  estimatedTime: string;
}

export interface IntentResponse {
  intent: ParsedIntent;
  executionPlan: ExecutionPlan;
}