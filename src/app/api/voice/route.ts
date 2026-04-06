import { NextRequest, NextResponse } from 'next/server';
import { createClaudeMessage, type Message } from '@/lib/claude';
import { speechToText, textToSpeech } from '@/lib/elevenlabs';

const CONCIERGE_SYSTEM_PROMPT = `Tu es Morokeys, le concierge vocal de MorokeysRiad — une maison d'hôtes de charme à Beni Mellal, Maroc.

PERSONNALITÉ:
- Chaleureux, accueillant, professionnel avec une touche marocaine authentique
- Tu parles français couramment, avec quelques expressions marocaines quand c'est naturel
- Tu connais tout sur le riad et la région de Beni Mellal

SUR LE RIAD:
- MorokeysRiad est une maison d'hôtes traditionnelle marocaine avec cour intérieure, piscine et terrasse
- Chambres climatisées avec décoration marocaine authentique
- Petit-déjeuner inclus, dîner sur demande (cuisine marocaine traditionnelle)
- Situé à Beni Mellal, près de l'oasis et du lac

SERVICES:
- Check-in: à partir de 14h00
- Check-out: avant 11h00
- Transfert aéroport disponible sur demande
- Excursions dans la région (lac, oasis, kasbahs)
- Location de voiture possible

INFOS RÉGION:
- Beni Mellal: ville au pied du Moyen Atlas
- Lac: à 15 minutes, spot de pêche et promenade
- Ouarzazate et les kasbahs: excursions d'une journée
- Marrakech: à 2h30 de route

RÈGLES:
- Réponses BRÈVES et CONVERSATIONNELLES — tu es parlé à voix haute
- Maximum 2-3 phrases en général
- Si tu ne sais pas quelque chose, dis-le simplement
- Toujours poli et chaleureux
- Guide vers les services du riad si pertinent`;

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
