// import { Router } from 'express';
// import { scheduler } from '../services/scheduler';
// import { Intent } from '../models/Intent';
// import { Schedule } from '../models/Schedule';
// import { User } from '../models/User';
// import { validate, createScheduleSchema } from '../middleware/validation';
// import { authenticate, verifyAddressOwnership } from '../middleware/auth';
// import { logger } from '../utils/logger';

// const router = Router();

// /**
//  * POST /api/schedule/create
//  * Create a recurring transfer schedule
//  */
// router.post('/create',
//     authenticate,
//     verifyAddressOwnership,
//     validate(createScheduleSchema),
//     async (req, res, next) => {
//   try {
//     const { intentId, signature, userAddress } = req.body;
    
//     logger.info('Creating schedule', { intentId, userAddress });
    
//     // Get intent
//     const intent = await Intent.findById(intentId);
//     if (!intent) {
//       return res.status(404).json({ error: 'Intent not found' });
//     }
    
//     if (intent.parsedIntent.action !== 'recurring_transfer') {
//       return res.status(400).json({ error: 'Intent is not a recurring transfer' });
//     }
    
//     if (!intent.parsedIntent.frequency) {
//       return res.status(400).json({ error: 'Frequency not specified' });
//     }
    
//     // Get user
//     const user = await User.findOne({ address: userAddress.toLowerCase() });
//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }
    
//     // Create schedule
//     const schedule = await scheduler.createSchedule(
//       user._id.toString(),
//       intent._id.toString(),
//       intent.parsedIntent.frequency,
//       intent.parsedIntent.amount,
//       intent.parsedIntent.recipient,
//       signature
//     );
    
//     // Update intent
//     intent.status = 'scheduled';
//     await intent.save();
    
//     res.json({
//       scheduleId: schedule._id,
//       frequency: schedule.frequency,
//       nextRun: schedule.nextRun,
//       status: 'active',
//     });
    
//   } catch (error) {
//     next(error);
//   }
// });

// /**
//  * GET /api/schedule/:scheduleId
//  * Get schedule details
//  */
// router.get('/:scheduleId', async (req, res, next) => {
//   try {
//     const { scheduleId } = req.params;
    
//     const schedule = await Schedule.findById(scheduleId)
//       .populate('userId', 'address')
//       .populate('intentId');
    
//     if (!schedule) {
//       return res.status(404).json({ error: 'Schedule not found' });
//     }
    
//     res.json({
//       scheduleId: schedule._id,
//       frequency: schedule.frequency,
//       amount: schedule.amount,
//       recipient: schedule.recipient,
//       nextRun: schedule.nextRun,
//       lastRun: schedule.lastRun,
//       isActive: schedule.isActive,
//       createdAt: schedule.createdAt,
//     });
    
//   } catch (error) {
//     next(error);
//   }
// });

// /**
//  * DELETE /api/schedule/:scheduleId
//  * Cancel a schedule
//  */
// router.delete('/:scheduleId', authenticate, async (req, res, next) => {
//   try {
//     const { scheduleId } = req.params;
    
//     // const schedule = await scheduler.cancelSchedule(scheduleId);
//       const schedule = await Schedule.findById(req.params.scheduleId).populate('userId');

//       if (!schedule) {
//           return res.status(404).json({ error: 'Schedule not found' });
//       }

//       if (schedule.userId.address !== req.user?.address.toLowerCase()) {
//           return res.status(403).json({ error: 'Not authorized to cancel this schedule' });
//       }
    
//     res.json({
//       message: 'Schedule cancelled',
//       scheduleId: schedule._id,
//       isActive: schedule.isActive,
//     });
    
//   } catch (error) {
//     next(error);
//   }
// });

// /**
//  * GET /api/schedule/user/:userAddress
//  * Get all schedules for a user
//  */
// router.get('/user/:userAddress', async (req, res, next) => {
//   try {
//     const { userAddress } = req.params;
    
//     const user = await User.findOne({ address: userAddress.toLowerCase() });
//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }
    
//     const schedules = await Schedule.find({ userId: user._id })
//       .sort({ createdAt: -1 })
//       .populate('intentId');
    
//     res.json({
//       schedules: schedules.map(s => ({
//         scheduleId: s._id,
//         frequency: s.frequency,
//         amount: s.amount,
//         recipient: s.recipient,
//         nextRun: s.nextRun,
//         lastRun: s.lastRun,
//         isActive: s.isActive,
//       })),
//     });
    
//   } catch (error) {
//     next(error);
//   }
// });

// export default router;

import { Router } from 'express';
import { authenticate, verifyAddressOwnership } from '../middleware/auth';
import { scheduler } from '../services/scheduler';
import { Intent } from '../models/Intent';
import { Schedule } from '../models/Schedule';
import { User, IUser } from '../models/User'; // ✅ Import IUser
import { validate, createScheduleSchema } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/schedule/create
 * Create a recurring transfer schedule
 */
router.post('/create', authenticate, verifyAddressOwnership, validate(createScheduleSchema), async (req, res, next) => {
  try {
    const { intentId, signature, userAddress } = req.body;
    
    logger.info('Creating schedule', { intentId, userAddress });
    
    // Get intent
    const intent = await Intent.findById(intentId);
    if (!intent) {
      return res.status(404).json({ error: 'Intent not found' });
    }
    
    if (intent.parsedIntent.action !== 'recurring_transfer') {
      return res.status(400).json({ error: 'Intent is not a recurring transfer' });
    }
    
    if (!intent.parsedIntent.frequency) {
      return res.status(400).json({ error: 'Frequency not specified' });
    }
    
    // Get user
    const user = await User.findOne({ address: userAddress.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create schedule
    const schedule = await scheduler.createSchedule(
      user._id.toString(),
      intent._id.toString(),
      intent.parsedIntent.frequency,
      intent.parsedIntent.amount,
      intent.parsedIntent.recipient,
      signature
    );
    
    // Update intent
    intent.status = 'scheduled';
    await intent.save();
    
    res.json({
      scheduleId: schedule._id,
      frequency: schedule.frequency,
      nextRun: schedule.nextRun,
      status: 'active',
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/schedule/:scheduleId
 * Get schedule details
 */
router.get('/:scheduleId', authenticate, async (req, res, next) => {
  try {
    const { scheduleId } = req.params;
    
    const schedule = await Schedule.findById(scheduleId)
      .populate('userId', 'address')
      .populate('intentId');
    
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    res.json({
      scheduleId: schedule._id,
      frequency: schedule.frequency,
      amount: schedule.amount,
      recipient: schedule.recipient,
      nextRun: schedule.nextRun,
      lastRun: schedule.lastRun,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt,
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/schedule/:scheduleId
 * Cancel a schedule
 */
router.delete('/:scheduleId', authenticate, async (req, res, next) => {
  try {
    const { scheduleId } = req.params;
    
    // ✅ Fixed: Properly type the populated user
    const schedule = await Schedule.findById(scheduleId).populate<{ userId: IUser }>('userId');

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Now TypeScript knows userId is IUser
    if (schedule.userId.address !== req.user?.address.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to cancel this schedule' });
    }

    // Cancel the schedule
    const cancelledSchedule = await scheduler.cancelSchedule(scheduleId);
    
    res.json({
      message: 'Schedule cancelled',
      scheduleId: cancelledSchedule._id,
      isActive: cancelledSchedule.isActive,
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/schedule/user/:userAddress
 * Get all schedules for a user
 */
router.get('/user/:userAddress', authenticate, async (req, res, next) => {
  try {
    const { userAddress } = req.params;
    
    // Verify user can only access their own schedules
    if (userAddress.toLowerCase() !== req.user?.address.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to view these schedules' });
    }
    
    const user = await User.findOne({ address: userAddress.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const schedules = await Schedule.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .populate('intentId');
    
    res.json({
      schedules: schedules.map(s => ({
        scheduleId: s._id,
        frequency: s.frequency,
        amount: s.amount,
        recipient: s.recipient,
        nextRun: s.nextRun,
        lastRun: s.lastRun,
        isActive: s.isActive,
      })),
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;