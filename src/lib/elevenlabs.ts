import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

export const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

export { SpeechToText } from '@elevenlabs/elevenlabs-js';
export { RealtimeConnection } from '@elevenlabs/elevenlabs-js';

export interface TextToSpeechResult {
  audio: Uint8Array;
  alignment?: unknown;
}

export async function textToSpeech(text: string, voiceId: string = 'EXAVITQaFPG1Mdcwbge3'): Promise<Uint8Array> {
  const response = await elevenlabs.textToSpeech.convert(voiceId, {
    text,
    modelId: 'eleven_multilingual_v2',
  });
  
  // Collect all chunks from the readable stream
  const chunks: Uint8Array[] = [];
  
  // response is a ReadableStream<Uint8Array>
  const reader = response.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  
  // Combine all chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}

export async function speechToText(audioBuffer: Buffer): Promise<string> {
  const transcription = await elevenlabs.speechToText.convert({
    file: audioBuffer,
    modelId: 'scribe_multilingual',
  });
  return transcription.text || '';
}
