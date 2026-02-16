import { connectDatabase } from '../src/config/database';
import { scheduler } from '../src/services/scheduler';
import { logger } from '../src/utils/logger';

export default async function handler(req: any, res: any) {
  try {
    // Verify this is a cron request
    if (req.headers['x-vercel-cron'] !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await connectDatabase();
    await scheduler.processScheduledTransfers();

    logger.info(' Cron job executed successfully');
    return res.json({ success: true });
  } catch (error) {
    logger.error('Cron job failed:', error);
    return res.status(500).json({ error: 'Cron job failed' });
  }
}