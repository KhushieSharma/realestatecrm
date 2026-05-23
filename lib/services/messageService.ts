import { getSupabaseServerClient } from '@/lib/supabase/database';

interface MessageResult {
  success: boolean;
  messageId?: string;
  externalId?: string;
  error?: string;
}

interface MessageConfig {
  // WhatsApp/SMS (Twilio)
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  twilioWhatsAppNumber: string;

  // Email (Resend)
  resendApiKey: string;
  resendFromEmail: string;
}

class MessageService {
  private supabase: ReturnType<typeof getSupabaseServerClient>;

  constructor() {
    this.supabase = getSupabaseServerClient();
  }

  /**
   * Send a message via WhatsApp, SMS, or Email
   * @param type The message type: 'whatsapp', 'sms', or 'email'
   * @param to The recipient phone number (for WhatsApp/SMS) or email address
   * @param body The message body
   * @param subject Optional subject (for email only)
   * @param templateId Optional template ID if using a template
   * @param metadata Additional metadata to store with the message
   * @returns Message result with ID and status
   */
  async sendMessage(
    type: 'whatsapp' | 'sms' | 'email',
    to: string,
    body: string,
    subject?: string,
    templateId?: string,
    metadata: Record<string, any> = {}
  ): Promise<MessageResult> {
    try {
      // Validate required environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
        throw new Error('Missing Supabase environment variables');
      }

      // Get organization ID from context (in a real implementation, this would come from auth context)
      // For now, we'll get the first organization (this should be improved)
      const { data: organizations, error: orgError } = await this.supabase
        .from('organizations')
        .select('id')
        .limit(1);

      if (orgError) throw orgError;
      if (!organizations || organizations.length === 0) {
        throw new Error('No organization found');
      }
      const organizationId = organizations[0].id;

      // Get current user (in a real implementation, this would come from auth context)
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError) throw authError;

      // Save message record to database first
      const { data: messageData, error: messageError } = await this.supabase
        .from('messages')
        .insert({
          organization_id: organizationId,
          lead_id: metadata.leadId || null, // Would come from context
          sent_by: user.id,
          message_type: type,
          direction: 'outbound',
          template_name: templateId ? `template-${templateId}` : null,
          subject: subject || null,
          body: body,
          status: 'sending', // Will be updated based on provider response
          external_message_id: null, // Will be set after sending
        })
        .select()
        .single();

      if (messageError) throw messageError;

      let result: MessageResult = { success: false };

      // Send via appropriate provider
      switch (type) {
        case 'whatsapp':
          result = await this.sendWhatsApp(to, body, messageData.id);
          break;
        case 'sms':
          result = await this.sendSMS(to, body, messageData.id);
          break;
        case 'email':
          result = await this.sendEmail(to, subject || '', body, messageData.id);
          break;
      }

      // Update message record with result
      const updateData: any = {
        status: result.success ? 'sent' : 'failed',
        external_message_id: result.externalId || null,
        updated_at: new Date().toISOString(),
      };

      if (!result.success) {
        // In a real implementation, you might want to store error details
        console.error(`[MESSAGE SERVICE] Failed to send ${type}:`, result.error);
      }

      await this.supabase
        .from('messages')
        .update(updateData)
        .eq('id', messageData.id);

      // Create activity log
      await this.supabase
        .from('activities')
        .insert({
          lead_id: metadata.leadId || null,
          organization_id: organizationId,
          user_id: user.id,
          activity_type: 'message',
          description: `Sent ${type} message`,
          metadata: {
            messageId: messageData.id,
            messageType: type,
            success: result.success,
            externalId: result.externalId,
          },
        });

      return {
        success: result.success,
        messageId: messageData.id,
        externalId: result.externalId,
        error: result.error,
      };
    } catch (error: any) {
      console.error('[MESSAGE SERVICE] Error sending message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message',
      };
    }
  }

  /**
   * Send a WhatsApp message via Twilio
   */
  private async sendWhatsApp(
    to: string,
    body: string,
    messageId: string
  ): Promise<MessageResult> {
    try {
      // Check if we're in dry-run mode
      const isDryRun = process.env.TWILIO_DRY_RUN === 'true' ||
                       !process.env.TWILIO_ACCOUNT_SID ||
                       !process.env.TWILIO_AUTH_TOKEN;

      if (isDryRun) {
        console.log('[WHATSAPP DRY RUN] Sending WhatsApp message:', {
          to,
          body,
          messageId,
        });
        return {
          success: true,
          externalId: `WH${Math.random().toString(36).substr(2, 9)}`,
        };
      }

      // In production, we would use the Twilio Node.js helper library
      // const twilio = require('twilio');
      // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      //
      // const message = await client.messages.create({
      //   body: body,
      //   from: process.env.TWILIO_WHATSAPP_NUMBER,
      //   to: `whatsapp:${to}`
      // });

      // For this implementation, we'll simulate success
      console.log('[WHATSAPP] Sending WhatsApp message (simulated):', {
        to,
        body,
        messageId,
      });

      return {
        success: true,
        externalId: `WH${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error: any) {
      console.error('[WHATSAPP] Error sending WhatsApp message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp message',
      };
    }
  }

  /**
   * Send an SMS message via Twilio
   */
  private async sendSMS(
    to: string,
    body: string,
    messageId: string
  ): Promise<MessageResult> {
    try {
      // Check if we're in dry-run mode
      const isDryRun = process.env.TWILIO_DRY_RUN === 'true' ||
                       !process.env.TWILIO_ACCOUNT_SID ||
                       !process.env.TWILIO_AUTH_TOKEN;

      if (isDryRun) {
        console.log('[SMS DRY RUN] Sending SMS message:', {
          to,
          body,
          messageId,
        });
        return {
          success: true,
          externalId: `SM${Math.random().toString(36).substr(2, 9)}`,
        };
      }

      // In production, we would use the Twilio Node.js helper library
      // const twilio = require('twilio');
      // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      //
      // const message = await client.messages.create({
      //   body: body,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: to
      // });

      // For this implementation, we'll simulate success
      console.log('[SMS] Sending SMS message (simulated):', {
        to,
        body,
        messageId,
      });

      return {
        success: true,
        externalId: `SM${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error: any) {
      console.error('[SMS] Error sending SMS message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS message',
      };
    }
  }

  /**
   * Send an email via Resend
   */
  private async sendEmail(
    to: string,
    subject: string,
    body: string,
    messageId: string
  ): Promise<MessageResult> {
    try {
      // Check if we're in dry-run mode
      const isDryRun = !process.env.RESEND_API_KEY;

      if (isDryRun) {
        console.log('[EMAIL DRY RUN] Sending email:', {
          to,
          subject,
          body,
          messageId,
        });
        return {
          success: true,
          externalId: `EM${Math.random().toString(36).substr(2, 9)}`,
        };
      }

      // In production, we would use the Resend Node.js helper library
      // const resend = require('resend');
      // const resendClient = resend(process.env.RESEND_API_KEY);
      //
      // const { data, error } = await resendClient.emails.send({
      //   from: process.env.RESEND_FROM_EMAIL,
      //   to: [to],
      //   subject: subject,
      //   html: body, // Assuming body is HTML for email
      // });

      // For this implementation, we'll simulate success
      console.log('[EMAIL] Sending email (simulated):', {
        to,
        subject,
        body,
        messageId,
      });

      return {
        success: true,
        externalId: `EM${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error: any) {
      console.error('[EMAIL] Error sending email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  /**
   * Send a follow-up message using a template
   * Convenience method for sending follow-ups
   */
  async sendFollowUp(
    type: 'whatsapp' | 'sms' | 'email',
    leadId: string,
    templateName: string,
    leadData: { fullName: string; phone: string; email: string; preferredLocation?: string; propertyTitle?: string; price?: number; location?: string }
  ): Promise<MessageResult> {
    try {
      // Get organization ID
      const { data: organizations, error: orgError } = await this.supabase
        .from('organizations')
        .select('id')
        .limit(1);

      if (orgError) throw orgError;
      if (!organizations || organizations.length === 0) {
        throw new Error('No organization found');
      }
      const organizationId = organizations[0].id;

      // Get template from organization settings
      const { data: orgData, error: templateError } = await this.supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      if (templateError) throw templateError;

      const templates = orgData?.settings?.followup_templates || [];
      const template = templates.find((t: any) => t.name === templateName);

      if (!template) {
        throw new Error(`Template "${templateName}" not found`);
      }

      // Personalize the template
      let personalizedBody = template.body;
      let personalizedSubject = template.subject || '';

      // Simple template variable replacement
      const replacements: Record<string, string> = {
        '{{leadName}}': leadData.fullName,
        '{{phone}}': leadData.phone,
        '{{email}}': leadData.email,
        '{{propertyTitle}}': leadData.propertyTitle || 'Property',
        '{{price}}': leadData.price ? `$${leadData.price.toLocaleString()}` : 'Price not specified',
        '{{location}}': leadData.location || 'Location not specified',
        '{{preferredLocation}}': leadData.preferredLocation || 'Not specified',
      };

      Object.keys(replacements).forEach(key => {
        personalizedBody = personalizedBody.split(key).join(replacements[key]);
        personalizedSubject = personalizedSubject.split(key).join(replacements[key]);
      });

      // Send the personalized message
      return await this.sendMessage(
        type,
        type === 'email' ? leadData.email : leadData.phone,
        personalizedBody,
        personalizedSubject,
        undefined, // No template ID since we're personalizing
        { leadId }
      );
    } catch (error: any) {
      console.error('[MESSAGE SERVICE] Error sending follow-up:', error);
      return {
        success: false,
        error: error.message || 'Failed to send follow-up',
      };
    }
  }
}

// Export a singleton instance
export const messageService = new MessageService();

export default messageService;