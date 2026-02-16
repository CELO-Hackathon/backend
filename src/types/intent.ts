import { z } from 'zod';

export const IntentSchema = z.object({
  action: z.enum(['single_transfer', 'recurring_transfer']),
  amount: z.string(),
  currency: z.enum(['USD', 'cUSD']),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
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