import { NextRequest, NextResponse } from 'next/server';
import { createClaudeMessage, type Message } from '@/lib/claude';
import { speechToText, textToSpeech } from '@/lib/elevenlabs';

const CONCIERGE_SYSTEM_PROMPT = `You are a helpful voice concierge assistant. You provide friendly, concise, and helpful responses.
Keep your responses brief and conversational since they will be spoken aloud.
Be polite and professional while maintaining a warm tone.
If you don't understand something, ask for clarification briefly.`;

function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const transcription = await speechToText(audioBuffer);

    // Build conversation history for context
    const messages: Message[] = [
      {
        role: 'user',
        content: transcription,
      },
    ];

    // Get Claude's response with system prompt context
    const response = await createClaudeMessage(messages, CONCIERGE_SYSTEM_PROMPT);

    // Generate audio response using ElevenLabs TTS
    const audioData = await textToSpeech(response);
    const audioBase64 = arrayBufferToBase64(audioData);

    return NextResponse.json({
      transcription,
      response,
      audioData: audioBase64,
    });
  } catch (error) {
    console.error('Voice API error:', error);
    return NextResponse.json(
      { error: 'Failed to process voice request' },
      { status: 500 }
    );
  }
}
