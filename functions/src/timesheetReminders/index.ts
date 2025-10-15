import { app, InvocationContext, Timer } from '@azure/functions';

/**
 * Timesheet Reminders Function
 * Runs daily at 6:00 AM
 * Sends reminder emails to employees who haven't submitted timesheets
 */
export async function timesheetReminders(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log('Timesheet reminders function triggered at', new Date().toISOString());

  try {
    // TODO: Implement logic
    // 1. Query database for employees with unsubmitted timesheets
    // 2. Filter employees who are 2 days before due date
    // 3. Send reminder emails via Azure Communication Services
    // 4. Log results

    context.log('Timesheet reminders sent successfully');
  } catch (error) {
    context.error('Error sending timesheet reminders:', error);
    throw error;
  }
}

app.timer('timesheetReminders', {
  schedule: '0 0 6 * * *', // Daily at 6:00 AM
  handler: timesheetReminders,
});
