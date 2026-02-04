import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Mic, MoveUp, Pause, Play, Trash2 } from 'lucide-react';

const FULL_BAR_COUNT = 40;

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function pickAudioMimeType() {
  const candidates = ['audio/ogg;codecs=opus', 'audio/ogg', 'audio/webm;codecs=opus', 'audio/webm'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return '';
}

function normalizeMimeType(mime: string) {
  const base = mime.split(';')[0];
  if (['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3'].includes(base)) return base;
  if (base === 'video/webm') return 'audio/webm';
  return 'audio/webm';
}

function computeAmplitude(data: Uint8Array) {
  if (data.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / data.length));
}

function downsampleBars(samples: number[], count: number): number[] {
  if (samples.length === 0) return Array(count).fill(0);
  if (samples.length <= count) {
    const result = [...samples];
    while (result.length < count) result.unshift(0);
    return result;
  }
  const step = samples.length / count;
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    let peak = 0;
    for (let j = start; j < end; j++) {
      peak = Math.max(peak, samples[j] ?? 0);
    }
    bars.push(peak);
  }
  return bars;
}

function LiveWaveform(props: { samples: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const samples = props.samples;
    const displayCount = Math.min(samples.length, 60);
    const recentSamples = samples.slice(-displayCount);

    if (recentSamples.length === 0) return;

    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const segmentWidth = width / displayCount;
    const centerY = height / 2;

    for (let i = 0; i < recentSamples.length; i++) {
      const x = i * segmentWidth;
      const amp = Math.min(1, recentSamples[i] * 4);
      const y1 = centerY - amp * centerY * 0.9;
      const y2 = centerY + amp * centerY * 0.9;

      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }

    ctx.stroke();
  }, [props.samples]);

  return <canvas ref={canvasRef} className="h-8 w-40 flex-shrink-0" />;
}

function FullWaveform(props: {
  samples: number[];
  scrubberProgress: number;
  onSeek?: (progress: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const samples = props.samples;
    if (samples.length === 0) return;

    const bars = downsampleBars(samples, FULL_BAR_COUNT);
    const barWidth = width / FULL_BAR_COUNT;
    const centerY = height / 2;
    const progressX = props.scrubberProgress * width;

    for (let i = 0; i < bars.length; i++) {
      const x = i * barWidth + barWidth / 2;
      const amp = Math.min(1, Math.max(0.05, bars[i]) * 4);
      const y1 = centerY - amp * centerY * 0.9;
      const y2 = centerY + amp * centerY * 0.9;

      ctx.strokeStyle = x <= progressX ? '#22c55e' : '#666666';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    }
  }, [props.samples, props.scrubberProgress]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!props.onSeek || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    props.onSeek(progress);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-48 h-8 flex-shrink-0 cursor-pointer"
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="w-full h-full pointer-events-none" />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-success border-2 border-inverse pointer-events-none shadow-sm"
        style={{ left: `calc(${props.scrubberProgress * 100}% - 6px)` }}
      />
    </div>
  );
}

export function AudioRecorderPanel(props: {
  open: boolean;
  disabled?: boolean;
  onDiscard: () => void;
  onSend: (file: File) => Promise<void> | void;
}) {
  const MAX_STORED_SAMPLES = 2400;

  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [liveSamples, setLiveSamples] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const pausedAccumulatedRef = useRef<number>(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const canInteract = useMemo(() => props.open && !props.disabled && !isSending, [props.open, props.disabled, isSending]);

  const cleanupPreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
  }, []);

  const stopEverything = useCallback(async () => {
    cleanupPreview();

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    try {
      recorderRef.current?.stop();
    } catch {
    }

    recorderRef.current = null;

    try {
      analyserRef.current?.disconnect();
    } catch {
    }
    analyserRef.current = null;

    try {
      await audioContextRef.current?.close();
    } catch {
    }
    audioContextRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;

    chunksRef.current = [];
    setIsReady(false);
    setIsRecording(false);
    setIsPaused(false);
    setDurationMs(0);
    setLiveSamples([]);
  }, [cleanupPreview]);

  useEffect(() => {
    if (!props.open) return;

    let cancelled = false;

    const start = async () => {
      setError(null);

      if (!canInteract) {
        setError('No disponible');
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('El navegador no soporta grabación de audio');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 48000,
          },
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyserRef.current = analyser;

        source.connect(analyser);

        const mimeType = pickAudioMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstart = () => {
          startedAtRef.current = Date.now();
          pausedAccumulatedRef.current = 0;
          pausedAtRef.current = null;
          setDurationMs(0);
          setLiveSamples([]);
          setIsRecording(true);
          setIsPaused(false);
          setIsReady(true);
        };

        recorder.onpause = () => {
          pausedAtRef.current = Date.now();
          setIsPaused(true);
        };

        recorder.onresume = () => {
          cleanupPreview();
          if (pausedAtRef.current != null) {
            pausedAccumulatedRef.current += Date.now() - pausedAtRef.current;
          }
          pausedAtRef.current = null;
          setIsPaused(false);
        };

        recorder.onstop = () => {
          setIsRecording(false);
          setIsPaused(false);
        };

        recorder.start(250);

        const buffer = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (!props.open) return;
          const now = Date.now();
          const pausedExtra = pausedAtRef.current != null ? now - pausedAtRef.current : 0;
          const elapsed = now - startedAtRef.current - pausedAccumulatedRef.current - pausedExtra;
          setDurationMs(elapsed);

          const currentRecorder = recorderRef.current;
          const currentAnalyser = analyserRef.current;

          if (currentAnalyser && currentRecorder && currentRecorder.state === 'recording') {
            currentAnalyser.getByteTimeDomainData(buffer);
            const amp = computeAmplitude(buffer);
            setLiveSamples((prev) => {
              const next = [...prev, amp];
              return next.length > MAX_STORED_SAMPLES ? next.slice(next.length - MAX_STORED_SAMPLES) : next;
            });
          }

          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        setError((err as Error)?.message || 'No se pudo acceder al micrófono');
      }
    };

    void start();

    return () => {
      cancelled = true;
    };
  }, [props.open, canInteract, cleanupPreview]);

  useEffect(() => {
    if (props.open) return;
    void stopEverything();
  }, [props.open, stopEverything]);

  if (!props.open) return null;

  const handleDiscard = async () => {
    await stopEverything();
    props.onDiscard();
  };

  const handlePauseResume = () => {
    const r = recorderRef.current;
    if (!r) return;
    if (r.state === 'recording') r.pause();
    else if (r.state === 'paused') r.resume();
  };

  const handlePlayPreview = () => {
    if (isPlaying) {
      previewAudioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (chunksRef.current.length === 0) return;

    const r = recorderRef.current;
    const rawMime = r?.mimeType || 'audio/webm';
    const normalizedMime = normalizeMimeType(rawMime);
    const blob = new Blob(chunksRef.current, { type: normalizedMime });
    const url = URL.createObjectURL(blob);

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;

    const audio = new Audio(url);
    previewAudioRef.current = audio;

    audio.ontimeupdate = () => {
      if (audio.duration > 0) {
        setPlaybackProgress(audio.currentTime / audio.duration);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setPlaybackProgress(0);
    };

    audio.play();
    setIsPlaying(true);
  };

  const handleSeek = (progress: number) => {
    const audio = previewAudioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = progress * audio.duration;
    setPlaybackProgress(progress);
  };

  const handleSend = () => {
    const r = recorderRef.current;
    if (!r) return;

    cleanupPreview();
    setIsSending(true);

    const finalize = () => {
      setIsRecording(false);
      setIsPaused(false);

      const rawMime = r.mimeType || 'audio/webm';
      const normalizedMime = normalizeMimeType(rawMime);
      const blob = new Blob(chunksRef.current, { type: normalizedMime });
      const ext = normalizedMime.includes('ogg') || normalizedMime.includes('opus') ? 'ogg' : 'webm';
      const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: normalizedMime });

      Promise.resolve(props.onSend(file))
        .then(() => {
          props.onDiscard();
        })
        .finally(() => {
          setIsSending(false);
        });
    };

    if (r.state === 'inactive') {
      finalize();
      return;
    }

    r.onstop = finalize;

    try {
      r.stop();
    } catch {
    }
  };

  const recordingActive = isRecording && !isPaused;

  const trashButton = (
    <button
      type="button"
      onClick={() => void handleDiscard()}
      className={clsx(
        'w-9 h-9 rounded-lg transition-colors flex items-center justify-center flex-shrink-0',
        !canInteract ? 'text-muted opacity-60 cursor-not-allowed' : 'text-muted hover:text-secondary'
      )}
      disabled={!canInteract}
      title="Descartar"
    >
      <Trash2 size={20} />
    </button>
  );

  const pauseResumeButton = (size: 'sm' | 'lg') => (
    <button
      type="button"
      onClick={handlePauseResume}
      className={clsx(
        'rounded-full transition-colors flex items-center justify-center flex-shrink-0',
        size === 'lg' ? 'w-12 h-12' : 'w-9 h-9',
        !isReady || !canInteract
          ? 'text-muted opacity-60 cursor-not-allowed'
          : 'text-error hover:text-error/80'
      )}
      disabled={!isReady || !canInteract}
      title={isPaused ? 'Continuar grabando' : 'Pausar'}
    >
      {isPaused ? <Mic size={size === 'lg' ? 28 : 20} /> : <Pause size={size === 'lg' ? 28 : 20} />}
    </button>
  );

  const sendButton = (
    <button
      type="button"
      onClick={handleSend}
      className={clsx(
        'w-9 h-9 rounded-full transition-colors flex items-center justify-center flex-shrink-0',
        !isReady || !canInteract
          ? 'bg-accent/50 text-inverse opacity-60 cursor-not-allowed'
          : 'bg-accent text-inverse hover:bg-accent-hover'
      )}
      disabled={!isReady || !canInteract}
      title="Enviar"
    >
      <MoveUp size={18} />
    </button>
  );

  const playPreviewButton = (
    <button
      type="button"
      onClick={handlePlayPreview}
      className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0',
        isPlaying ? 'text-primary' : 'text-secondary hover:text-primary'
      )}
      title={isPlaying ? 'Pausar' : 'Reproducir'}
    >
      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
    </button>
  );

  const recIndicator = (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
      <span className="text-sm text-primary font-medium tabular-nums">{formatDuration(durationMs)}</span>
    </div>
  );

  const timeDisplay = (
    <span className="text-sm text-secondary tabular-nums flex-shrink-0">{formatDuration(durationMs)}</span>
  );

  return (
    <div className="bg-surface border border-default rounded-2xl p-3">
      {error && <div className="mb-2 text-sm text-error">{error}</div>}

      <div className="hidden md:flex items-center justify-end gap-3">
        {trashButton}
        {recordingActive ? (
          <>
            {recIndicator}
            <LiveWaveform samples={liveSamples} />
            {pauseResumeButton('sm')}
          </>
        ) : (
          <>
            {playPreviewButton}
            <FullWaveform samples={liveSamples} scrubberProgress={playbackProgress} onSeek={handleSeek} />
            {timeDisplay}
            {pauseResumeButton('sm')}
          </>
        )}
        {sendButton}
      </div>

      <div className="md:hidden">
        {recordingActive ? (
          <div className="flex items-center gap-2">
            <div className="text-sm text-primary font-medium tabular-nums">
              {formatDuration(durationMs)}
            </div>
            <LiveWaveform samples={liveSamples} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {playPreviewButton}
            <FullWaveform samples={liveSamples} scrubberProgress={playbackProgress} onSeek={handleSeek} />
            {timeDisplay}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          {trashButton}
          {pauseResumeButton('lg')}
          {sendButton}
        </div>
      </div>
    </div>
  );
}
