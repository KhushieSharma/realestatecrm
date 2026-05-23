import { getSupabaseServerClient } from '@/lib/supabase/database';

// Interface for call result
interface CallResult {
  success: boolean;
  callSid?: string;
  conferenceSid?: string;
  error?: string;
  recordingUrl?: string;
  duration?: number;
  status?: string;
}

// Interface for Twilio configuration
interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

// In a real implementation, we would use the Twilio Node.js helper library
// For this implementation, we'll create a mock/service that can work in both
// production and dry-run modes

/**
 * Initialize Twilio client
 * In production, this would use the actual Twilio library
 * For dry-run/testing, we'll return a mock
 */
function getTwilioClient(config: TwilioConfig) {
  // Check if we're in dry-run mode (for development)
  const isDryRun = process.env.TWILIO_DRY_RUN === 'true' ||
                   !process.env.TWILIO_ACCOUNT_SID ||
                   !process.env.TWILIO_AUTH_TOKEN;

  if (isDryRun) {
    // Return mock client for development/testing
    return {
      calls: {
        create: async (params: any) => {
          console.log('[TWILIO DRY RUN] Creating call:', params);
          // Simulate a successful call
          return {
            sid: `CA${Math.random().toString(36).substr(2, 9)}`,
            status: params.statusCallback ? 'queued' : 'completed',
            duration: params.statusCallback ? 0 : Math.floor(Math.random() * 300), // 0-5 min random duration
          };
        },
      },
      conferences: {
        create: async (params: any) => {
          console.log('[TWILIO DRY RUN] Creating conference:', params);
          return {
            sid: `CF${Math.random().toString(36).substr(2, 9)}`,
            status: 'in-progress',
          };
        },
      },
    };
  }

  // In production, we would initialize the real Twilio client
  // const twilio = require('twilio');
  // return twilio(config.accountSid, config.authToken);

  // For this implementation, we'll throw an error if not configured properly
  // to make it clear when real credentials are needed
  throw new Error(
    'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN ' +
    'environment variables, or set TWILIO_DRY_RUN=true for development mode.'
  );
}

/**
 * Get Twilio configuration from environment variables
 */
function getTwilioConfig(): TwilioConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error(
      'Missing Twilio configuration. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, ' +
      'and TWILIO_PHONE_NUMBER environment variables.'
    );
  }

  return {
    accountSid,
    authToken,
    phoneNumber,
  };
}

/**
 * Format phone number for Twilio (ensure it has + prefix)
 */
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Initiate the instant agent-to-lead call bridge
 *
 * Flow:
 * 1. Call the assigned agent first
 * 2. When agent answers, play message and ask for confirmation
 * 3. After confirmation, call the lead
 * 4. Bridge both calls into a conference
 * 5. Return call details for logging
 */
export async function initiateCallBridge(
  agentPhone: string,
  leadPhone: string,
  leadName: string,
  leadSource: string
): Promise<CallResult> {
  try {
    const twilioConfig = getTwilioConfig();
    const twilio = getTwilioClient(twilioConfig);

    // Format phone numbers
    const formattedAgentPhone = formatPhoneNumber(agentPhone);
    const formattedLeadPhone = formatPhoneNumber(leadPhone);

    console.log('[CALL BRIDGE] Starting call bridge process');
    console.log('[CALL BRIDGE] Agent:', formattedAgentPhone);
    console.log('[CALL BRIDGE] Lead:', formattedLeadPhone);
    console.log('[CALL BRIDGE] Lead Name:', leadName);
    console.log('[CALL BRIDGE] Lead Source:', leadSource);

    // Step 1: Call the agent first
    const agentCall = await twilio.calls.create({
      to: formattedAgentPhone,
      from: twilioConfig.phoneNumber,
      // In a real implementation, we'd use TwiML or a webhook URL
      // For now, we'll simulate the flow
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/agent-answer?leadPhone=${encodeURIComponent(formattedLeadPhone)}&leadName=${encodeURIComponent(leadName)}&leadSource=${encodeURIComponent(leadSource)}`,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });

    console.log('[CALL BRIDGE] Agent call initiated:', agentCall.sid);

    // In a real implementation, we would wait for the agent to answer
    // via webhook/status callback, then proceed with calling the lead
    // For this mock implementation, we'll simulate the full flow

    // Step 2 & 3: Simulate agent answering and then calling lead
    // In reality, this would be handled by webhook callbacks
    const leadCall = await twilio.calls.create({
      to: formattedLeadPhone,
      from: twilioConfig.phoneNumber,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/lead-answer?agentCallSid=${agentCall.sid}`,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });

    console.log('[CALL BRIDGE] Lead call initiated:', leadCall.sid);

    // Step 4: Create conference and bridge both calls
    const conference = await twilio.conferences.create({
      friendlyName: `EstateFlow-${leadName}-${Date.now()}`,
    });

    console.log('[CALL BRIDGE] Conference created:', conference.sid);

    // In a real implementation, we would now:
    // 1. Connect the agent call to the conference
    // 2. Connect the lead call to the conference
    // 3. Set up recording if desired
    // 4. Monitor the call for completion

    // For this implementation, we'll return the call details
    // In production, the actual bridging would happen via TwiML or API calls
    // to connect both calls to the conference

    return {
      success: true,
      callSid: leadCall.sid, // Primary call SID for logging
      conferenceSid: conference.sid,
      status: 'initiated',
    };
  } catch (error: any) {
    console.error('[CALL BRIDGE] Error initiating call bridge:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate call bridge',
    };
  }
}

/**
 * Alternative implementation for dry-run mode that simulates the entire flow
 * This is useful for testing without making actual Twilio calls
 */
export async function simulateCallBridge(
  agentPhone: string,
  leadPhone: string,
  leadName: string,
  leadSource: string
): Promise<CallResult> {
  console.log('[CALL BRIDGE SIMULATION] Starting simulated call bridge');
  console.log('[CALL BRIDGE SIMULATION] Agent:', agentPhone);
  console.log('[CALL BRIDGE SIMULATION] Lead:', leadPhone);
  console.log('[CALL BRIDGE SIMULATION] Lead Name:', leadName);
  console.log('[CALL BRIDGE SIMULATION] Lead Source:', leadSource);

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate agent answering (90% success rate)
  const agentAnswers = Math.random() > 0.1;

  if (!agentAnswers) {
    console.log('[CALL BRIDGE SIMULATION] Agent did not answer');
    return {
      success: false,
      error: 'Agent did not answer the call',
    };
  }

  // Simulate lead answering (80% success rate)
  const leadAnswers = Math.random() > 0.2;

  if (!leadAnswers) {
    console.log('[CALL BRIDGE SIMULATION] Lead did not answer');
    return {
      success: false,
      error: 'Lead did not answer the call',
    };
  }

  // Simulate successful call bridge
  const callDuration = Math.floor(Math.random() * 300) + 60; // 1-5 minutes

  console.log('[CALL BRIDGE SIMULATION] Call bridge successful');
  console.log('[CALL BRIDGE SIMULATION] Duration:', callDuration, 'seconds');

  return {
    success: true,
    callSid: `CA${Math.random().toString(36).substr(2, 9)}`,
    conferenceSid: `CF${Math.random().toString(36).substr(2, 9)}`,
    status: 'completed',
    duration: callDuration,
    recordingUrl: `https://recordings.twilio.com/${Math.random().toString(36).substr(2, 9)}.mp3`,
  };
}

/**
 * Main function to initiate call bridge - chooses between real and simulated
 */
export async function initiateAgentLeadCallBridge(
  agentPhone: string,
  leadPhone: string,
  leadName: string,
  leadSource: string
): Promise<CallResult> {
  // Check if we should use simulation/dry-run mode
  const isDryRun = process.env.TWILIO_DRY_RUN === 'true' ||
                   !process.env.TWILIO_ACCOUNT_SID ||
                   !process.env.TWILIO_AUTH_TOKEN;

  if (isDryRun) {
    return await simulateCallBridge(agentPhone, leadPhone, leadName, leadSource);
  } else {
    return await initiateCallBridge(agentPhone, leadPhone, leadName, leadSource);
  }
}

/**
 * Function to handle call status updates from Twilio webhooks
 * This would be implemented in an API route to update call logs in the database
 */
export async function handleCallStatusUpdate(
  callSid: string,
  callStatus: string,
  duration: number | null = null,
  recordingUrl: string | null = null,
  conferenceSid: string | null = null
) {
  try {
    const supabase = getSupabaseServerClient();

    // Update the call record in the database
    const { error } = await supabase
      .from('calls')
      .update({
        status: callStatus,
        duration: duration,
        recording_url: recordingUrl,
        ended_at: callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer'
          ? new Date().toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('call_sid', callSid);

    if (error) {
      console.error('[CALL STATUS] Error updating call status:', error);
      throw error;
    }

    console.log('[CALL STATUS] Updated call status for', callSid, 'to', callStatus);

    // If this was part of a conference, we might want to update related records
    if (conferenceSid) {
      // Additional conference-specific logic could go here
    }

    return { success: true };
  } catch (error: any) {
    console.error('[CALL STATUS] Error handling call status update:', error);
    return {
      success: false,
      error: error.message || 'Failed to update call status'
    };
  }
}