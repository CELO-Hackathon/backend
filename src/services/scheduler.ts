import cron from 'node-cron';
import { Schedule } from '../models/Schedule';
import { Transfer } from '../models/Transfer';
import { blockchain } from './blockchain';
import { logger } from '../utils/logger';
import { calculateNextRun, usdToWei } from '../utils/helpers';
import { Address, Hex } from 'viem';

export class SchedulerService {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the cron job scheduler
   */
  start() {
    // Run every hour
    this.cronJob = cron.schedule('0 * * * *', async () => {
      logger.info('Running scheduled transfers check...');
      await this.processScheduledTransfers();
    });
    
    logger.info('✅ Scheduler started - checking every hour');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Scheduler stopped');
    }
  }

  /**
   * Process all due scheduled transfers
   */
  async processScheduledTransfers() {
    try {
      const now = new Date();
      
      // Find all active schedules that are due
      const dueSchedules = await Schedule.find({
        isActive: true,
        nextRun: { $lte: now },
      }).populate('userId');
      
      logger.info(`Found ${dueSchedules.length} due schedules`);
      
      for (const schedule of dueSchedules) {
        try {
          await this.executeScheduledTransfer(schedule);
        } catch (error) {
          logger.error(`Failed to execute schedule ${schedule._id}:`, error);
          // Continue with other schedules
        }
      }
      
    } catch (error) {
      logger.error('Failed to process scheduled transfers:', error);
    }
  }

  /**
   * Execute a single scheduled transfer
   */
  private async executeScheduledTransfer(schedule: any) {
    try {
      logger.info(`Executing scheduled transfer ${schedule._id}`);
      
      const request = {
        recipient: schedule.recipient as Address,
        amount: BigInt(schedule.amount),
        nonce: await blockchain.getNonce(schedule.userId.address),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
      };
      
      const signature = schedule.signature as Hex;
      
      // Execute transfer
      const result = await blockchain.executeTransfer(request, signature);
      
      // Create transfer record
      await Transfer.create({
        intentId: schedule.intentId,
        userId: schedule.userId._id,
        agentId: parseInt(process.env.PLATFORM_AGENT_ID!),
        txHash: result.txHash,
        recipient: schedule.recipient,
        amount: schedule.amount,
        status: result.status,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
        reputationRecorded: true,
        confirmedAt: new Date(),
      });
      
      // Update schedule
      schedule.lastRun = new Date();
      schedule.nextRun = calculateNextRun(schedule.frequency);
      await schedule.save();
      
      logger.info(`Scheduled transfer executed successfully`, {
        txHash: result.txHash,
        nextRun: schedule.nextRun,
      });
      
    } catch (error) {
      logger.error(`Failed to execute scheduled transfer:`, error);
      throw error;
    }
  }

  /**
   * Create a new schedule
   */
  async createSchedule(
    userId: string,
    intentId: string,
    frequency: 'daily' | 'weekly' | 'monthly',
    amount: string,
    recipient: string,
    signature: string,
  ) {
    const schedule = await Schedule.create({
      userId,
      intentId,
      frequency,
      amount: usdToWei(amount).toString(),
      recipient,
      nextRun: calculateNextRun(frequency),
      isActive: true,
      signature,
    });
    
    logger.info('Schedule created', {
      scheduleId: schedule._id,
      frequency,
      nextRun: schedule.nextRun,
    });
    
    return schedule;
  }

  /**
   * Cancel a schedule
   */
  async cancelSchedule(scheduleId: string) {
    const schedule = await Schedule.findByIdAndUpdate(
      scheduleId,
      { isActive: false },
      { new: true }
    );
    
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    
    logger.info('Schedule cancelled', { scheduleId });
    return schedule;
  }
}

export const scheduler = new SchedulerService();