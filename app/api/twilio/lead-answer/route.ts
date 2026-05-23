import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/database';
import { getTwilioClient, TwilioConfig } from '@/lib/services/callService';

export async function POST(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const agentCallSid = searchParams.get('agentCallSid');
    const leadName = searchParams.get('leadName');
    const leadSource = searchParams.get('leadSource');

    // We could also get the leadPhone if needed, but it's not necessary for this TwiML

    // Get Twilio client
    const twilioConfig: TwilioConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
    };
    const twilio = getTwilioClient(twilioConfig);

    // Get the agent call SID from the initial request (we'd need to pass this through)
    // For simplicity in this example, we'll create a conference
    // In a production implementation, we'd want to:
    // 1. Keep track of the agent call SID
    // 2. Create a conference
    // 3. Join both the agent call and lead call to the conference

    // For now, we'll use a simpler approach: just connect the call and say we've connected
    // A more sophisticated implementation would use Twilio's conference feature

    const twiml = `
      <Response>
        <Say>Connected with ${leadName || 'the lead'}. You are now on a call.</Say>
        <Dial>
          <!-- In a real implementation, we would have the lead's phone number here -->
          <!-- For this example, we're just showing the concept -->
          <Number>+1234567890</Number>
        </Dial>
        <Say>The call has ended.</Say>
      </Response>
    `;

    return new NextResponse(twiml, {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error: any) {
    console.error('Error in lead-answer webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}