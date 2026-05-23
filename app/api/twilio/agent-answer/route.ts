import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/database';
import { getTwilioClient, TwilioConfig } from '@/lib/services/callService';

export async function POST(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const leadPhone = searchParams.get('leadPhone');
    const leadName = searchParams.get('leadName');
    const leadSource = searchParams.get('leadSource');

    if (!leadPhone || !leadName) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Get Twilio client
    const twilioConfig: TwilioConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
    };
    const twilio = getTwilioClient(twilioConfig);

    // Generate TwiML response that:
    // 1. Plays a message to the agent
    // 2. Asks them to press any key to connect with the lead
    // 3. When they press a key, redirects to connect with the lead
    const twiml = `
      <Response>
        <Say>New real estate lead from ${leadSource || 'unknown source'}. Press any key to connect with ${leadName}.</Say>
        <Gather numDigits="1" action="/api/twilio/connect-lead?leadPhone=${encodeURIComponent(leadPhone)}&leadName=${encodeURIComponent(leadName)}&leadSource=${encodeURIComponent(leadSource || '')}" method="POST">
          <Say>Please press any key to connect with the lead.</Say>
        </Gather>
        <Say>We didn't receive any input. Goodbye.</Say>
      </Response>
    `;

    return new NextResponse(twiml, {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error: any) {
    console.error('Error in agent-answer webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}