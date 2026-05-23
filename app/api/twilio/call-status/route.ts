import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/database';

export async function POST(request: Request) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData();

    const callSid = formData.get('CallSid');
    const callStatus = formData.get('CallStatus');
    const callDuration = formData.get('CallDuration');
    const recordingUrl = formData.get('RecordingUrl');
    const conferenceSid = formData.get('ConferenceSid'); // If using conferences

    // Log the incoming webhook for debugging
    console.log('[TWILIO WEBHOOK] Call status update:', {
      callSid,
      callStatus,
      callDuration: callDuration ? parseInt(callDuration as string, 10) : null,
      recordingUrl,
      conferenceSid
    });

    // Basic validation
    if (!callSid || !callStatus) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Update call record in database using our call service
    const { callService } = await import('@/lib/services/callService');
    const result = await callService.handleCallStatusUpdate(
      callSid as string,
      callStatus as string,
      callDuration ? parseInt(callDuration as string, 10) : null,
      recordingUrl as string || null,
      conferenceSid as string || null
    );

    if (!result.success) {
      console.error('[TWILIO WEBHOOK] Failed to handle call status:', result.error);
      // We still return 200 to Twilio to prevent retries, but log the error
      return new NextResponse('Internal Server Error', { status: 200 });
    }

    // Return success to Twilio
    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('[TWILIO WEBHOOK] Error processing call status webhook:', error);
    // Return 200 to prevent Twilio from retrying, but log the error
    return new NextResponse('Internal Server Error', { status: 200 });
  }
}