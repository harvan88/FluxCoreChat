import { useRef, type KeyboardEvent } from 'react';
import { MoveUp, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface PublicProfileComposerProps {
    value: string;
    onChange: (value: string) => void;
    onSend: (overrideContent?: { text: string; media?: any[] }) => Promise<void>;
    disabled: boolean;
    isSending: boolean;
    placeholder?: string;
}

export function PublicProfileComposer({
    value,
    onChange,
    onSend,
    disabled,
    isSending,
    placeholder = "Escribe un mensaje...",
}: PublicProfileComposerProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const hasText = value.trim().length > 0;
    const canSend = !disabled && !isSending && hasText;

    console.log('[PublicProfileComposer] Render:', { value, hasText, canSend, isSending, disabled });

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    const handleSend = async () => {
        if (!canSend) {
            console.log('[PublicProfileComposer] handleSend bloqueado:', { canSend, value, isSending, disabled });
            return;
        }
        console.log('[PublicProfileComposer] handleSend ejecutándose con:', { value, canSend, isSending });
        await onSend({ text: value });
    };


    return (
        <div className="w-full bg-surface/80 backdrop-blur-3xl border-t border-white/5">
            <div className="flex items-stretch min-h-[72px]">
                <div className="flex-1 px-6 py-5 flex items-center">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={disabled}
                        className="w-full bg-transparent resize-none focus:outline-none text-base text-primary placeholder:text-muted/40 max-h-32"
                        rows={1}
                        style={{ height: 'auto' }}
                    />
                </div>
                <button
                    onPointerDown={(e) => {
                        console.log('[PublicProfileComposer] Pointer down. canSend:', canSend);
                        if (canSend) {
                            e.preventDefault();
                            void handleSend();
                        }
                    }}
                    onClick={() => {
                        console.log('[PublicProfileComposer] Click. canSend:', canSend);
                        if (canSend) {
                            void handleSend();
                        }
                    }}
                    disabled={!canSend || isSending}
                    className={clsx(
                        "w-20 flex items-center justify-center transition-all duration-300 border-l border-white/5 cursor-pointer",
                        canSend
                            ? "bg-accent text-white hover:bg-accent/80 active:bg-green-500 active:scale-90"
                            : "bg-surface/50 text-muted/20 cursor-not-allowed"
                    )}
                >
                    {isSending ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <MoveUp size={24} className={clsx(canSend && "animate-bounce")} />
                    )}
                </button>
            </div>
        </div>
    );
}
