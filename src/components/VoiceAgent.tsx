'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function VoiceAgent() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const [audioLevel, setAudioLevel] = useState(0);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      mediaRecorderRef.current = new MediaRecorder(stream);
      
      const chunks: Blob[] = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatus('listening');
      
      // Visualize audio levels
      const visualize = () => {
        if (analyserRef.current && isRecording) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(average / 128);
          animationRef.current = requestAnimationFrame(visualize);
        }
      };
      visualize();
    } catch (err) {
      setError('Microphone access denied. Please enable microphone permissions.');
      console.error('Recording error:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('thinking');
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setAudioLevel(0);
    }
  }, [isRecording]);

  const processAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/voice', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process audio');
      }

      const data = await response.json();
      
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: data.transcription || 'Audio message',
        timestamp: new Date(),
      };
      
      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setStatus('speaking');

      // Play audio response if available
      if (data.audioData) {
        const binaryString = atob(data.audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setStatus('idle');
          URL.revokeObjectURL(audioUrl);
        };
        await audio.play();
      } else {
        setStatus('idle');
      }
    } catch (err) {
      setError('Failed to process your message. Please try again.');
      setStatus('idle');
      console.error('Processing error:', err);
    }
  };

  const toggleConnection = async () => {
    if (isConnected) {
      setIsConnected(false);
      setStatus('idle');
    } else {
      setStatus('connecting');
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsConnected(true);
      setStatus('idle');
      
      // Add welcome message
      setMessages([{
        id: '0',
        role: 'assistant',
        content: "Hello! I'm your voice concierge. I'm connected and ready to help. Click the microphone to start speaking.",
        timestamp: new Date(),
      }]);
    }
  };

  const pushToTalk = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main container */}
      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Voice Concierge
          </h1>
          <p className="text-purple-200/80">
            Your AI-powered voice assistant
          </p>
        </div>

        {/* Connection status card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 mb-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-white font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button
              onClick={toggleConnection}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                isConnected 
                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
              }`}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>

        {/* Status indicator */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 mb-6 border border-white/10">
          <div className="flex items-center justify-center gap-4">
            <div className={`w-4 h-4 rounded-full transition-colors duration-300 ${
              status === 'idle' ? 'bg-slate-500' :
              status === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              status === 'listening' ? 'bg-red-500 animate-pulse' :
              status === 'thinking' ? 'bg-purple-500 animate-pulse' :
              'bg-cyan-500 animate-pulse'
            }`} />
            <span className="text-white/80 text-sm uppercase tracking-wider">
              {status}
            </span>
          </div>
        </div>

        {/* Main voice button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={pushToTalk}
            disabled={!isConnected}
            className={`relative w-32 h-32 rounded-full transition-all duration-300 transform ${
              isConnected
                ? isRecording
                  ? 'bg-gradient-to-br from-red-500 to-rose-600 scale-110 shadow-2xl shadow-red-500/50'
                  : 'bg-gradient-to-br from-cyan-500 to-purple-600 hover:scale-105 shadow-2xl shadow-purple-500/30'
                : 'bg-slate-700 cursor-not-allowed'
            }`}
          >
            {/* Pulsing ring when recording */}
            {isRecording && (
              <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping" />
            )}
            
            {/* Audio level indicator */}
            {isRecording && (
              <div 
                className="absolute -inset-4 rounded-full border-4 border-red-400/50"
                style={{ 
                  transform: `scale(${1 + audioLevel * 0.3})`,
                  opacity: 1 - audioLevel * 0.5
                }}
              />
            )}
            
            <div className="absolute inset-0 flex items-center justify-center">
              {isRecording ? (
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              )}
            </div>
          </button>
        </div>

        <p className="text-center text-white/60 text-sm mb-8">
          {isConnected 
            ? isRecording 
              ? 'Release to send' 
              : 'Click and hold to speak'
            : 'Connect to start'}
        </p>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-200 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Conversation history */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 max-h-80 overflow-y-auto">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Conversation
          </h2>
          
          {messages.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-4">
              Your conversation will appear here
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-cyan-500 to-purple-600 text-white'
                        : 'bg-white/10 text-white/90'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Powered by footer */}
        <div className="mt-6 text-center">
          <p className="text-white/40 text-xs">
            Powered by{' '}
            <span className="text-purple-300">ElevenLabs</span> &{' '}
            <span className="text-cyan-300">Claude</span>
          </p>
        </div>
      </div>
    </div>
  );
}
