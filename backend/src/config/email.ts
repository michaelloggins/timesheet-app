export const emailConfig = {
  connectionString: process.env.ACS_CONNECTION_STRING || '',
  senderAddress: process.env.ACS_SENDER_ADDRESS || 'noreply@miravistalabs.com',
  replyToAddress: process.env.ACS_REPLY_TO_ADDRESS || 'timesheets@miravistalabs.com',
  companyName: 'MiraVista Diagnostics',
  appName: 'MiraVista Timesheet',
  appUrl: process.env.API_BASE_URL?.replace('/api', '') || 'http://localhost:5173',
};

export const emailTemplates = {
  timesheetSubmitted: 'timesheet-submitted',
  timesheetApproved: 'timesheet-approved',
  timesheetReturned: 'timesheet-returned',
  timesheetReminder: 'timesheet-reminder',
  timesheetOverdue: 'timesheet-overdue',
  managerDigest: 'manager-digest',
  escalationNotice: 'escalation-notice',
};
