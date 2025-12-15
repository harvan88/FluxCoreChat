import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, X, RotateCcw, Send, Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export function CameraCaptureModal(props: {
  open: boolean;
  onClose: () => void;
  onSend: (file: File) => Promise<{ ok: boolean; error?: string }>;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [captureFile, setCaptureFile] = useState<File | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const canCapture = useMemo(() => props.open && !!stream && !captureFile, [props.open, stream, captureFile]);
  const canSend = useMemo(() => props.open && !!captureFile && !isSending, [props.open, captureFile, isSending]);

  useEffect(() => {
    if (!props.open) return;

    let cancelled = false;

    const start = async () => {
      setCameraError(null);
      setSendError(null);

      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }

        setStream(media);

        if (videoRef.current) {
          videoRef.current.srcObject = media;
          await videoRef.current.play();
        }
      } catch {
        try {
          const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

          if (cancelled) {
            media.getTracks().forEach((t) => t.stop());
            return;
          }

          setStream(media);

          if (videoRef.current) {
            videoRef.current.srcObject = media;
            await videoRef.current.play();
          }
        } catch (err) {
          setCameraError((err as Error)?.message || 'No se pudo acceder a la cámara');
          setStream(null);
        }
      }
    };

    start();

    return () => {
      cancelled = true;
    };
  }, [props.open]);

  useEffect(() => {
    if (!props.open) {
      if (captureUrl) URL.revokeObjectURL(captureUrl);
      setCaptureUrl(null);
      setCaptureFile(null);
      setSendError(null);
      setCameraError(null);

      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      setStream(null);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [props.open, captureUrl, stream]);

  const handleClose = () => {
    props.onClose();
  };

  const handleRetake = () => {
    if (captureUrl) URL.revokeObjectURL(captureUrl);
    setCaptureUrl(null);
    setCaptureFile(null);
    setSendError(null);
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('No se pudo inicializar el canvas');
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
    });

    if (!blob) {
      setCameraError('No se pudo capturar la imagen');
      return;
    }

    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });

    const url = URL.createObjectURL(blob);
    setCaptureUrl(url);
    setCaptureFile(file);
    setSendError(null);
  };

  const handleSend = async () => {
    if (!captureFile) return;

    setIsSending(true);
    setSendError(null);

    try {
      const res = await props.onSend(captureFile);
      if (res.ok) {
        props.onClose();
        return;
      }

      setSendError(res.error || 'Error al enviar');
    } catch (err) {
      setSendError((err as Error)?.message || 'Error al enviar');
    } finally {
      setIsSending(false);
    }
  };

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 bg-overlay-dark flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-surface border border-subtle rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-accent" />
            <div className="text-sm font-medium text-primary">Cámara</div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-muted hover:text-primary transition-colors"
            aria-label="Cerrar"
            disabled={isSending}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          {(cameraError || sendError) && (
            <div className="mb-3 p-3 bg-error-muted border border-error-muted rounded-lg text-error text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div className="min-w-0">{sendError || cameraError}</div>
            </div>
          )}

          <div className="relative rounded-lg overflow-hidden border border-subtle bg-base">
            {captureUrl ? (
              <img src={captureUrl} alt="Captura" className="w-full h-[360px] object-cover" />
            ) : (
              <video ref={videoRef} className="w-full h-[360px] object-cover" playsInline />
            )}

            {isSending && (
              <div className="absolute inset-0 bg-overlay-dark flex items-center justify-center">
                <Loader2 className="animate-spin text-muted" size={28} />
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={handleRetake}
              disabled={!captureFile || isSending}
              className={clsx(
                'px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2',
                captureFile && !isSending
                  ? 'bg-elevated text-primary hover:bg-hover'
                  : 'bg-elevated text-muted opacity-60 cursor-not-allowed'
              )}
            >
              <RotateCcw size={16} />
              Repetir
            </button>

            {captureFile ? (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={clsx(
                  'px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2',
                  canSend ? 'bg-accent text-inverse hover:bg-accent-hover' : 'bg-elevated text-muted cursor-not-allowed'
                )}
              >
                <Send size={16} />
                Enviar
              </button>
            ) : (
              <button
                onClick={handleCapture}
                disabled={!canCapture || isSending}
                className={clsx(
                  'px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2',
                  canCapture && !isSending
                    ? 'bg-accent text-inverse hover:bg-accent-hover'
                    : 'bg-elevated text-muted cursor-not-allowed'
                )}
              >
                <Camera size={16} />
                Capturar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
