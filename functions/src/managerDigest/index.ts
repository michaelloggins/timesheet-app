import { app, InvocationContext, Timer } from '@azure/functions';

/**
 * Manager Digest Function
 * Runs every Monday at 7:00 AM
 * Sends weekly digest emails to managers with pending approvals
 */
export async function managerDigest(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  context.log('Manager digest function triggered at', new Date().toISOString());

  try {
    // TODO: Implement logic
    // 1. Query database for all managers
    // 2. For each manager, get pending approvals
    // 3. Build digest data with RAG indicators
    // 4. Send digest email via Azure Communication Services
    // 5. Log results

    context.log('Manager digest emails sent successfully');
  } catch (error) {
    context.error('Error sending manager digests:', error);
    throw error;
  }
}

app.timer('managerDigest', {
  schedule: '0 0 7 * * MON', // Every Monday at 7:00 AM
  handler: managerDigest,
});
