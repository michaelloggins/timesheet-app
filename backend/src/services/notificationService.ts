/**
 * Notification Service
 * Email notifications via Azure Communication Services
 */

import { EmailClient, EmailMessage } from '@azure/communication-email';
import { emailConfig, emailTemplates } from '../config/email';
import { logger } from '../utils/logger';

class NotificationService {
  private emailClient: EmailClient;

  constructor() {
    if (emailConfig.connectionString) {
      this.emailClient = new EmailClient(emailConfig.connectionString);
    } else {
      logger.warn('Email service not configured - ACS_CONNECTION_STRING missing');
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string
  ): Promise<void> {
    if (!this.emailClient) {
      logger.warn('Email service not available');
      return;
    }

    try {
      const message: EmailMessage = {
        senderAddress: emailConfig.senderAddress,
        content: {
          subject,
          html: htmlContent,
        },
        recipients: {
          to: [{ address: to }],
        },
      };

      const poller = await this.emailClient.beginSend(message);
      await poller.pollUntilDone();

      logger.info(`Email sent successfully to ${to}: ${subject}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send timesheet submitted notification to manager
   */
  async sendTimesheetSubmitted(
    managerEmail: string,
    timesheetData: any
  ): Promise<void> {
    const subject = `Timesheet Submitted for Approval - ${timesheetData.employeeName}`;
    const html = `
      <h2>Timesheet Submitted</h2>
      <p><strong>${timesheetData.employeeName}</strong> has submitted their timesheet for the week of ${timesheetData.weekStart}.</p>
      <p><a href="${emailConfig.appUrl}/approvals">Review and Approve</a></p>
    `;

    await this.sendEmail(managerEmail, subject, html);
  }

  /**
   * Send timesheet approved notification to employee
   */
  async sendTimesheetApproved(
    employeeEmail: string,
    timesheetData: any
  ): Promise<void> {
    const subject = 'Timesheet Approved';
    const html = `
      <h2>Timesheet Approved</h2>
      <p>Your timesheet for the week of ${timesheetData.weekStart} has been approved.</p>
      <p>Thank you!</p>
    `;

    await this.sendEmail(employeeEmail, subject, html);
  }

  /**
   * Send timesheet returned notification to employee
   */
  async sendTimesheetReturned(
    employeeEmail: string,
    timesheetData: any,
    returnReason: string
  ): Promise<void> {
    const subject = 'Timesheet Returned - Action Required';
    const html = `
      <h2>Timesheet Returned</h2>
      <p>Your timesheet for the week of ${timesheetData.weekStart} has been returned by your manager.</p>
      <p><strong>Reason:</strong> ${returnReason}</p>
      <p><a href="${emailConfig.appUrl}/timesheets/${timesheetData.id}">View and Resubmit</a></p>
    `;

    await this.sendEmail(employeeEmail, subject, html);
  }

  /**
   * Send overdue timesheet reminder to employee
   */
  async sendTimesheetReminder(
    employeeEmail: string,
    employeeName: string
  ): Promise<void> {
    const subject = 'Reminder: Submit Your Timesheet';
    const html = `
      <h2>Timesheet Reminder</h2>
      <p>Hi ${employeeName},</p>
      <p>This is a friendly reminder to submit your timesheet for this week.</p>
      <p><a href="${emailConfig.appUrl}/timesheets">Submit Timesheet</a></p>
    `;

    await this.sendEmail(employeeEmail, subject, html);
  }

  /**
   * Send manager digest email (weekly)
   */
  async sendManagerDigest(
    managerEmail: string,
    digestData: any
  ): Promise<void> {
    // TODO: Implement with proper template
    const subject = `Weekly Timesheet Digest - ${digestData.weekStart}`;
    const html = `
      <h2>Weekly Timesheet Digest</h2>
      <p>You have ${digestData.pendingCount} timesheets pending approval.</p>
      <p><a href="${emailConfig.appUrl}/approvals">View Pending Approvals</a></p>
    `;

    await this.sendEmail(managerEmail, subject, html);
  }
}

export const notificationService = new NotificationService();
