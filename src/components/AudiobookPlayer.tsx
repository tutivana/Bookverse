import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Volume1,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  Gauge,
  Sparkle,
  AlertCircle
} from "lucide-react";
import { Book, ReadingProgress } from "../types";
import { saveAudioListeningTime, saveReadingProgress, generateGeminiTTS } from "../lib/api";

interface AudiobookPlayerProps {
  book: Book;
  userId: string;
  onBackToLibrary: () => void;
  onOpenReader: () => void;
  progress: ReadingProgress | null;
  onProgressSync: (updatedProgress: ReadingProgress) => void;
}

export default function AudiobookPlayer({
  book,
  userId,
  onBackToLibrary,
  onOpenReader,
  progress,
  onProgressSync,
}: AudiobookPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(progress?.audioPositionSeconds || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [readAloudEnabled, setReadAloudEnabled] = useState(true); // Toggle Gemini Narrator
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [isUsingLocalFallback, setIsUsingLocalFallback] = useState(false);
  const [quotaError, setQuotaError] = useState(false);

  // Gemini TTS states
  const [geminiVoice, setGeminiVoice] = useState<string>("Kore");
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [ttsFeedback, setTtsFeedback] = useState<string>("");

  // Gemini Audio nodes refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioStartedTimeRef = useRef<number>(0);
  const audioPauseOffsetRef = useRef<number>(0);
  const currentTextRef = useRef<string>("");
  const isLocalSpeakingRef = useRef<boolean>(false);

  // Audiobook chapters estimation
  const chapters = book.audioChapters || [
    { title: "Capítulo I - Introdução", startPage: 0, durationSeconds: 300 },
    { title: "Capítulo II - Desenvolvimento", startPage: 1, durationSeconds: 450 },
    { title: "Capítulo III - Conclusão", startPage: 2, durationSeconds: 400 },
  ];

  const totalDuration = chapters.reduce((acc, curr) => acc + curr.durationSeconds, 0);

  // Sync active chapter based on current audio time
  useEffect(() => {
    let accumulated = 0;
    for (let i = 0; i < chapters.length; i++) {
      accumulated += chapters[i].durationSeconds;
      if (currentTime < accumulated) {
        setActiveChapterIndex(i);
        break;
      }
    }
  }, [currentTime, chapters]);

  // Handle active audio timer ticker
  useEffect(() => {
    let interval: any;
    if (isPlaying && !isTtsLoading) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          const nextVal = prev + 1 * playbackSpeed;
          
          // Periodically save listening stats (e.g. every 10 seconds of play)
          if (Math.round(nextVal) % 10 === 0) {
            saveAudioListeningTime(userId, 10).catch(console.error);
            saveReadingProgress(userId, book.id, chapters[activeChapterIndex]?.startPage || 0, Math.round(nextVal))
              .then(onProgressSync)
              .catch(console.error);
          }
          return nextVal;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isTtsLoading, playbackSpeed, totalDuration, activeChapterIndex]);

  // Clean up Web Audio when component unmounts
  useEffect(() => {
    return () => {
      stopGeminiAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(console.error);
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Hot-reload Gemini TTS when speed or voice is updated during active playback
  useEffect(() => {
    if (isPlaying && audioBufferRef.current) {
      const activeText = book.pdfContent[chapters[activeChapterIndex]?.startPage || 0] || "";
      playGeminiTTS(activeText, true);
    }
  }, [playbackSpeed, geminiVoice]);



  const stopGeminiAudio = () => {
    isLocalSpeakingRef.current = false;
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
      audioSourceRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const playGeminiBuffer = (buffer: AudioBuffer, offset: number) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioCtxRef.current;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    stopGeminiAudio();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackSpeed;

    const gainNode = ctx.createGain();
    gainNode.gain.value = isMuted ? 0 : volume;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    const startOffset = offset < buffer.duration ? offset : 0;
    source.start(0, startOffset);

    audioSourceRef.current = source;
    audioStartedTimeRef.current = ctx.currentTime;
    audioPauseOffsetRef.current = startOffset;
    setIsPlaying(true);

    source.onended = () => {
      if (audioSourceRef.current === source) {
        const elapsed = (ctx.currentTime - audioStartedTimeRef.current) * playbackSpeed;
        const currentTotal = startOffset + elapsed;
        
        if (currentTotal >= buffer.duration - 0.2) {
          setIsPlaying(false);
          audioPauseOffsetRef.current = 0;
          
          // Auto advance to next chapter page
          if (activeChapterIndex < chapters.length - 1) {
            const nextChapterSeconds = chapters.slice(0, activeChapterIndex + 1).reduce((acc, c) => acc + c.durationSeconds, 0);
            setCurrentTime(nextChapterSeconds + 1);
            setActiveChapterIndex((prev) => prev + 1);
            
            // Auto play next page
            setTimeout(() => {
              const nextText = book.pdfContent[chapters[activeChapterIndex + 1]?.startPage || 0] || "";
              if (nextText) {
                setIsPlaying(true);
                playGeminiTTS(nextText, true);
              }
            }, 600);
          }
        }
      }
    };
  };

  const playBrowserFallbackTTS = (text: string) => {
    if (!("speechSynthesis" in window)) {
      setTtsFeedback("A síntese de voz local não é suportada neste navegador.");
      return;
    }

    isLocalSpeakingRef.current = false;
    window.speechSynthesis.cancel(); // Reset previous speeches

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = playbackSpeed;
    utterance.volume = isMuted ? 0 : volume;

    utterance.onend = () => {
      if (!isLocalSpeakingRef.current) return;
      isLocalSpeakingRef.current = false;
      
      // Auto advance to next chapter page
      if (activeChapterIndex < chapters.length - 1) {
        const nextChapterSeconds = chapters.slice(0, activeChapterIndex + 1).reduce((acc, c) => acc + c.durationSeconds, 0);
        setCurrentTime(nextChapterSeconds + 1);
        setActiveChapterIndex((prev) => prev + 1);
        
        // Auto play next page text
        setTimeout(() => {
          const nextText = book.pdfContent[chapters[activeChapterIndex + 1]?.startPage || 0] || "";
          if (nextText) {
            playBrowserFallbackTTS(nextText);
          }
        }, 600);
      } else {
        setIsPlaying(false);
      }
    };

    utterance.onerror = (e) => {
      isLocalSpeakingRef.current = false;
      if (e.error === "interrupted" || e.error === "canceled") {
        return;
      }
      console.warn("Speech utterance error:", e.error, e);
    };

    isLocalSpeakingRef.current = true;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const playGeminiTTS = async (text: string, forceReload: boolean = false) => {
    if (!text) return;
    
    // If already loaded, just play/resume
    if (!forceReload && audioBufferRef.current && currentTextRef.current === text) {
      setIsUsingLocalFallback(false);
      playGeminiBuffer(audioBufferRef.current, audioPauseOffsetRef.current);
      return;
    }

    setIsTtsLoading(true);
    setTtsFeedback("");
    stopGeminiAudio();
    audioBufferRef.current = null;
    audioPauseOffsetRef.current = 0;
    currentTextRef.current = text;

    try {
      const data = await generateGeminiTTS(text, geminiVoice);
      if (data.quotaExceeded) {
        setTtsFeedback("⚠️ Quota do Narrador IA Gemini excedida.");
        setQuotaError(true);
        setIsTtsLoading(false);
        setIsPlaying(false);
        return;
      }

      if (data.mock) {
        setTtsFeedback("⚠️ Modo Demo Offline (Chave de API não configurada). Narração indisponível.");
        setIsTtsLoading(false);
        setIsPlaying(false);
        return;
      }

      if (data.audio) {
        const binary = atob(data.audio);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768;
        }

        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioCtxRef.current;
        const buffer = ctx.createBuffer(1, float32Array.length, 24000);
        buffer.getChannelData(0).set(float32Array);
        
        audioBufferRef.current = buffer;
        setIsTtsLoading(false);
        setIsUsingLocalFallback(false);
        playGeminiBuffer(buffer, 0);
      } else {
        throw new Error("Vazio");
      }
    } catch (err: any) {
      console.warn("TTS fetch error:", err);
      if (err.message === "QUOTA_EXCEEDED") {
        setTtsFeedback("⚠️ Quota do Narrador IA Gemini excedida.");
        setQuotaError(true);
      } else {
        setTtsFeedback("⚠️ Narrador IA Gemini temporariamente indisponível.");
      }
      setIsTtsLoading(false);
      setIsPlaying(false);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopGeminiAudio();
      if (audioCtxRef.current) {
        const elapsed = (audioCtxRef.current.currentTime - audioStartedTimeRef.current) * playbackSpeed;
        audioPauseOffsetRef.current = Math.min(
          (audioBufferRef.current?.duration || 0),
          audioPauseOffsetRef.current + elapsed
        );
      }
    } else {
      setIsPlaying(true);
      if (readAloudEnabled) {
        const activeText = book.pdfContent[chapters[activeChapterIndex]?.startPage || 0] || "";
        // ALWAYS try generating Gemini AI TTS when the user actively clicks Play/Resume
        playGeminiTTS(activeText, false);
      }
    }
  };

  // Skip time helpers
  const handleSkipForward = () => {
    setCurrentTime((prev) => Math.min(totalDuration, prev + 15));
    stopGeminiAudio();
    audioPauseOffsetRef.current = Math.min(
      (audioBufferRef.current?.duration || 0),
      audioPauseOffsetRef.current + 15
    );
    if (isPlaying && audioBufferRef.current) {
      playGeminiBuffer(audioBufferRef.current, audioPauseOffsetRef.current);
    }
  };

  const handleSkipBackward = () => {
    setCurrentTime((prev) => Math.max(0, prev - 15));
    stopGeminiAudio();
    audioPauseOffsetRef.current = Math.max(0, audioPauseOffsetRef.current - 15);
    if (isPlaying && audioBufferRef.current) {
      playGeminiBuffer(audioBufferRef.current, audioPauseOffsetRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans selection:bg-[#e2b874]/30">
      {/* Upper Book info layout */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center bg-[#121214] border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/40">
        {/* Audiobook Cover Frame */}
        <div className="md:col-span-2 aspect-[3/4] max-w-[240px] mx-auto w-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative shadow-md">
          <img
            src={book.coverUrl}
            alt={book.title}
            className={`w-full h-full object-cover transition duration-500 ${isPlaying ? "scale-102 filter brightness-95" : ""}`}
            referrerPolicy="no-referrer"
          />

          {/* Glowing visualization nodes during playback */}
          {isPlaying && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-end justify-center gap-1 h-20">
              <span className="w-1.5 h-6 bg-zinc-700 rounded-full animate-[bounce_0.6s_infinite_100ms]" />
              <span className="w-1.5 h-10 bg-[#e2b874] rounded-full animate-[bounce_0.6s_infinite_200ms]" />
              <span className="w-1.5 h-14 bg-white rounded-full animate-[bounce_0.6s_infinite_300ms]" />
              <span className="w-1.5 h-10 bg-[#e2b874] rounded-full animate-[bounce_0.6s_infinite_400ms]" />
              <span className="w-1.5 h-6 bg-zinc-700 rounded-full animate-[bounce_0.6s_infinite_500ms]" />
            </div>
          )}
        </div>

        {/* Detailed audiobook details */}
        <div className="md:col-span-3 flex flex-col justify-between h-full space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="bg-[#e2b874]/10 text-[#e2b874] font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Audiobook Premium
              </span>
              <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2.5 py-1 rounded-full">
                {book.language}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-serif font-bold text-zinc-100 tracking-tight">{book.title}</h1>
            <p className="text-sm text-zinc-400 mt-1">por <span className="font-semibold text-zinc-200">{book.author}</span></p>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-sans">{book.description}</p>
          </div>

          {/* Sync active text highlighting box */}
          {readAloudEnabled && isPlaying && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-[#e2b874] uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#e2b874]" />
                  Texto em Reprodução
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">Página {chapters[activeChapterIndex]?.startPage + 1}</span>
              </div>
              <p className="text-xs font-serif leading-relaxed text-zinc-300 italic">
                {book.pdfContent[chapters[activeChapterIndex]?.startPage || 0] ? (
                  book.pdfContent[chapters[activeChapterIndex].startPage].length > 300 ? (
                    book.pdfContent[chapters[activeChapterIndex].startPage].substring(0, 300) + "..."
                  ) : (
                    book.pdfContent[chapters[activeChapterIndex].startPage]
                  )
                ) : (
                  "Sem texto cadastrado para este capítulo."
                )}
              </p>
            </div>
          )}

          {/* Downloader & Alternator button blocks */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={onOpenReader}
              className="bg-[#e2b874] hover:bg-[#c59e5f] text-zinc-950 rounded-xl py-3.5 px-5 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-[0.98] cursor-pointer"
            >
              <BookOpen className="w-4.5 h-4.5" />
              Alternar para Leitura PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Playback HUD Controls Board */}
      <div className="mt-8 bg-[#121214] border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/40 space-y-6">
        {/* Scrubber progress slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-400 font-medium">
            <span>{formatTime(currentTime)}</span>
            <span className="text-zinc-500 font-semibold">{chapters[activeChapterIndex]?.title}</span>
            <span>-{formatTime(Math.max(0, totalDuration - currentTime))}</span>
          </div>

          <div className="relative">
            <input
              type="range"
              min="0"
              max={totalDuration}
              value={currentTime}
              onChange={(e) => {
                const targetVal = Number(e.target.value);
                setCurrentTime(targetVal);
                
                stopGeminiAudio();
                const startSeconds = chapters.slice(0, activeChapterIndex).reduce((acc, c) => acc + c.durationSeconds, 0);
                const elapsedInChapter = targetVal - startSeconds;
                const chapterDuration = chapters[activeChapterIndex]?.durationSeconds || 1;
                const fraction = Math.max(0, Math.min(1, elapsedInChapter / chapterDuration));
                
                if (audioBufferRef.current) {
                  audioPauseOffsetRef.current = fraction * audioBufferRef.current.duration;
                  if (isPlaying) {
                    playGeminiBuffer(audioBufferRef.current, audioPauseOffsetRef.current);
                  }
                } else if (isPlaying) {
                  const activeText = book.pdfContent[chapters[activeChapterIndex]?.startPage || 0] || "";
                  playGeminiTTS(activeText, true);
                }
              }}
              className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#e2b874]"
            />
          </div>
        </div>

        {/* Action Controls HUD buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Left Block: Speed controls */}
          <div className="flex items-center gap-2">
            <Gauge className="w-4.5 h-4.5 text-[#e2b874]" />
            <span className="text-xs font-semibold text-zinc-400">Velocidade:</span>
            <div className="flex border border-zinc-800 rounded-xl overflow-hidden text-xs font-bold bg-zinc-900">
              {[0.75, 1.0, 1.25, 1.5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    setPlaybackSpeed(speed);
                  }}
                  className={`px-3 py-1.5 transition cursor-pointer ${
                    playbackSpeed === speed ? "bg-[#e2b874] text-zinc-950" : "text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Central Block: SKIP & PLAY buttons */}
          <div className="flex items-center gap-5">
            <button
              onClick={handleSkipBackward}
              className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition cursor-pointer text-zinc-400 shadow-sm border border-zinc-800"
              title="Voltar 15s"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={handlePlayPause}
              disabled={isTtsLoading}
              className="w-16 h-16 bg-[#e2b874] hover:bg-[#c59e5f] disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer relative"
            >
              {isTtsLoading ? (
                <span className="w-6 h-6 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-7 h-7 fill-zinc-950" />
              ) : (
                <Play className="w-7 h-7 fill-zinc-950 ml-1" />
              )}
            </button>

            <button
              onClick={handleSkipForward}
              className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full transition cursor-pointer text-zinc-400 shadow-sm border border-zinc-800"
              title="Avançar 15s"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Right Block: Volume Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-[#e2b874] hover:text-[#c59e5f] p-1 cursor-pointer transition"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4.5 h-4.5" />
              ) : volume < 0.4 ? (
                <Volume1 className="w-4.5 h-4.5" />
              ) : (
                <Volume2 className="w-4.5 h-4.5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = Number(e.target.value);
                setVolume(val);
                setIsMuted(false);
              }}
              className="w-20 h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-[#e2b874]"
            />
          </div>
        </div>

        {/* Toggle Button for Voice settings */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className="text-xs text-zinc-400 hover:text-[#e2b874] flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 transition cursor-pointer border border-zinc-800"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e2b874]" />
            {showVoiceSettings ? "Ocultar Ajustes de Narração IA" : "Ajustes de Narração IA e Vozes"}
          </button>
        </div>

        {/* Dynamic Voice Synthesis Settings HUD */}
        {showVoiceSettings && (
          <div className="pt-5 border-t border-zinc-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="speechSynth"
                  checked={readAloudEnabled}
                  onChange={(e) => {
                    setReadAloudEnabled(e.target.checked);
                    if (!e.target.checked) {
                      setIsPlaying(false);
                      stopGeminiAudio();
                    }
                  }}
                  className="rounded text-[#e2b874] focus:ring-[#e2b874] bg-zinc-900 border-zinc-800 cursor-pointer"
                />
                <div>
                  <label htmlFor="speechSynth" className="font-bold text-xs text-zinc-300 cursor-pointer flex items-center gap-1.5">
                    <Sparkle className="w-3.5 h-3.5 text-[#e2b874] fill-[#e2b874]" />
                    Ativar Narração de Texto por Voz
                  </label>
                  <p className="text-[10px] text-zinc-500">Gera a leitura em tempo real a partir do conteúdo escrito do livro.</p>
                </div>
              </div>

              {readAloudEnabled && (
                <div className="flex border border-zinc-800 rounded-xl overflow-hidden p-1 bg-zinc-950 text-[11px] font-bold text-[#e2b874] items-center gap-1.5 px-3">
                  <Sparkles className="w-3 h-3 text-[#e2b874]" />
                  Narrador IA Gemini 3.1 Ativo
                </div>
              )}
            </div>

            {/* Expanded Gemini voice profiles selector */}
            {readAloudEnabled && (
              <div className="bg-zinc-950 rounded-2xl p-4 border border-zinc-900 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">Voz do Narrador Premium</span>
                  {isTtsLoading && (
                    <span className="text-[10px] text-[#e2b874] flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e2b874] animate-ping" />
                      Gerando áudio via IA...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { name: "Kore", label: "Kore", desc: "Equilibrada" },
                    { name: "Puck", label: "Puck", desc: "Teatral" },
                    { name: "Charon", label: "Charon", desc: "Profunda" },
                    { name: "Fenrir", label: "Fenrir", desc: "Enérgica" },
                    { name: "Zephyr", label: "Zephyr", desc: "Suave" }
                  ].map((voice) => (
                    <button
                      key={voice.name}
                      type="button"
                      onClick={() => {
                        setGeminiVoice(voice.name);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition relative cursor-pointer group ${
                        geminiVoice === voice.name
                          ? "bg-[#e2b874]/5 border-[#e2b874] text-[#e2b874]"
                          : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400"
                      }`}
                    >
                      <span className="text-[11px] font-bold block">{voice.label}</span>
                      <span className="text-[9px] text-zinc-500 block leading-tight">{voice.desc}</span>
                      {geminiVoice === voice.name && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#e2b874] shadow-[0_0_8px_#e2b874]" />
                      )}
                    </button>
                  ))}
                </div>

                {quotaError && (
                  <div className="flex items-start gap-3 p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-red-300 text-[11px] mb-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5 animate-pulse" />
                    <div className="flex-1">
                      <h4 className="font-bold text-red-200 text-xs">Quota do Narrador IA Gemini Excedida</h4>
                      <p className="mt-1 text-[10px] leading-relaxed text-red-300/80">
                        O limite diário de processamento de voz inteligente foi atingido para este livro. Por favor, tente novamente mais tarde ou atualize seu plano. O sintetizador local automático foi removido por completo para manter a excelência da experiência.
                      </p>
                      <button 
                        onClick={() => setQuotaError(false)}
                        className="mt-1.5 text-[9px] font-bold text-red-400 hover:text-red-200 underline cursor-pointer"
                      >
                        Fechar aviso
                      </button>
                    </div>
                  </div>
                )}

                {ttsFeedback && (
                  <div className="text-[10px] text-zinc-500 bg-zinc-900/60 py-1.5 px-3 rounded-lg border border-zinc-900 text-center italic">
                    {ttsFeedback}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-2 text-[11px] text-zinc-500 border-t border-zinc-900">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-zinc-400" />
                Sintetiza o texto em som realista palavra-por-palavra.
              </span>
              <div className="flex items-center gap-1 font-bold text-[#e2b874]">
                <Clock className="w-3.5 h-3.5" />
                <span>Tempo total do audiobook: {book.audioDuration || "1h"}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chapters list explorer shelf */}
      <div className="mt-6 bg-[#121214] border border-zinc-800 rounded-3xl p-6 shadow-2xl shadow-black/40">
        <h3 className="text-base font-serif font-bold text-zinc-100 mb-4 pb-2 border-b border-zinc-800">
          Capítulos do Audiobook ({chapters.length})
        </h3>
        <div className="space-y-1.5">
          {chapters.map((ch, idx) => (
            <div
              key={idx}
              className={`w-full p-2.5 rounded-xl transition text-xs flex items-center justify-between border ${
                activeChapterIndex === idx
                  ? "bg-[#e2b874]/5 border-[#e2b874]/30 text-[#e2b874]"
                  : "hover:bg-zinc-900/40 text-zinc-400 border-transparent bg-zinc-950/20"
              }`}
            >
              {/* Clickable Area to switch chapter */}
              <button
                onClick={() => {
                  const startSeconds = chapters.slice(0, idx).reduce((acc, c) => acc + c.durationSeconds, 0);
                  setCurrentTime(startSeconds);
                  setActiveChapterIndex(idx);
                  
                  audioPauseOffsetRef.current = 0;
                  stopGeminiAudio();
                  audioBufferRef.current = null;
                  
                  if (isPlaying && readAloudEnabled) {
                    const activeText = book.pdfContent[ch.startPage || 0] || "";
                    setTimeout(() => playGeminiTTS(activeText, true), 100);
                  }
                }}
                className="flex-1 text-left flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10px] text-zinc-500">#0{idx + 1}</span>
                  <span className={activeChapterIndex === idx ? "font-bold text-[#e2b874]" : "text-zinc-200 hover:text-[#e2b874] transition"}>
                    {ch.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-[10px] text-zinc-500 font-medium hidden sm:inline">Pág: {ch.startPage + 1}</span>
                  <span className="text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold px-2 py-0.5 rounded-full font-mono">
                    {formatTime(ch.durationSeconds)}
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
