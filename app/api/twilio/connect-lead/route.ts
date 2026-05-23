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
    const agentCallSid = searchParams.get('agentCallSid'); // This would come from the initial call

    if (!leadPhone || !leadName) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Get form data (what key was pressed)
    const formData = await request.formData();
    const digits = formData.get('Digits'); // The key pressed by the agent

    if (!digits) {
      // If no digits were pressed, we could redirect back or end the call
      const twiml = `
        <Response>
          <Say>No input received. Goodbye.</Say>
          <Hangup/>
        </Response>
      `;
      return new NextResponse(twiml, {
        headers: {
          'Content-Type': 'text/xml',
        },
      });
    }

    // Get Twilio client
    const twilioConfig: TwilioConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
    };
    const twilio = getTwilioClient(twilioConfig);

    // Create a call to the lead
    const leadCall = await twilio.calls.create({
      to: leadPhone, // This should already be formatted
      from: twilioConfig.phoneNumber,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/lead-answer?agentCallSid=${agentCallSid || ''}&leadName=${encodeURIComponent(leadName)}&leadSource=${encodeURIComponent(leadSource || '')}`,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });

    // Create TwiML to say we're connecting and then redirect to hold music or conference
    const twiml = `
      <Response>
        <Say>Connecting you with ${leadName}...</Say>
        <Dial>
          <Number>${leadPhone}</Number>
        </Dial>
      </Response>
    `;

    return new NextResponse(twiml, {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error: any) {
    console.error('Error in connect-lead webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}