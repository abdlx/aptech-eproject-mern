// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import cron from 'node-cron';
import Reminder from '../models/Reminder.js';
import { notify } from './notificationService.js';

// Finds reminders whose time has passed and that haven't been fired yet, turns
// each into an in-app notification, and marks it completed so it fires once.
export async function fireDueReminders(now = new Date()) {
  const due = await Reminder.find({ time: { $lte: now }, completed: false });
  for (const reminder of due) {
    await notify({
      user: reminder.user,
      message: `Reminder: ${reminder.title}`,
      type: reminder.type === 'nutrition' ? 'nutrition'
        : reminder.type === 'goal' ? 'goal'
        : 'workout',
    });
    reminder.completed = true;
    await reminder.save();
  }
  return due.length;
}

// Starts a cron job that checks for due reminders every minute. Returns the task
// so callers/tests can stop it. Skipped when DISABLE_SCHEDULER=true.
export function startReminderScheduler() {
  if (process.env.DISABLE_SCHEDULER === 'true') {
    console.log('Reminder scheduler disabled (DISABLE_SCHEDULER=true).');
    return null;
  }
  const task = cron.schedule('* * * * *', async () => {
    try {
      const count = await fireDueReminders();
      if (count && process.env.LOG_DELIVERY === 'true') {
        console.log(`[scheduler] fired ${count} reminder(s).`);
      }
    } catch (error) {
      console.error(`[scheduler] error: ${error.message}`);
    }
  });
  console.log('Reminder scheduler started (every minute).');
  return task;
}

export default { startReminderScheduler, fireDueReminders };
