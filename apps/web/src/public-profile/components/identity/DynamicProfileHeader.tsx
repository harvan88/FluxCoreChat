import React from 'react';
import { Avatar } from '../../../components/ui/Avatar';
import { clsx } from 'clsx';

interface SpotifyHeaderProps {
    profile: {
        displayName: string;
        alias: string;
        avatarUrl: string | null;
        bio: string | null;
    };
    progress: number; // 0 (expanded) to 1 (collapsed)
}

export function SpotifyHeader({ profile, progress }: SpotifyHeaderProps) {
    // Interpolaciones de estilo basadas en el progreso del scroll
    const opacity = 1 - progress;
    const scale = 1 - (progress * 0.2);
    const translateY = progress * -20;

    // El título se adapta al 80% si es largo, o tamaño por defecto
    const isLongTitle = profile.displayName.length > 15;
    const titleFontSize = isLongTitle
        ? 'clamp(1.5rem, 5vw, 4rem)'
        : 'clamp(2rem, 8vw, 5rem)';

    return (
        <div className="relative w-full overflow-hidden transition-all duration-300 ease-out">
            {/* Background Banner con gradiente dinámico */}
            <div
                className="absolute inset-0 bg-gradient-to-b from-accent/20 to-base pointer-events-none"
                style={{ opacity: 0.8 }}
            />

            {/* Header Compacto (Sticky Header) - Solo visible al hacer scroll */}
            <div
                className={clsx(
                    "fixed top-0 left-0 right-0 z-50 h-16 bg-surface/95 backdrop-blur-md border-b border-subtle px-6 flex items-center gap-4 transition-all duration-300",
                    progress > 0.8 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"
                )}
            >
                <Avatar
                    src={profile.avatarUrl || undefined}
                    name={profile.displayName}
                    size="sm"
                />
                <h2 className="text-lg font-bold text-primary truncate max-w-[200px]">
                    {profile.displayName}
                </h2>
            </div>

            {/* Main Hero Header (Spotify Style) */}
            <div
                className="relative pt-20 pb-10 px-6 sm:px-12 flex flex-col md:flex-row items-end gap-6 md:gap-8 max-w-7xl mx-auto"
                style={{
                    opacity,
                    transform: `translateY(${translateY}px) scale(${scale})`,
                    transformOrigin: 'bottom left'
                }}
            >
                {/* Artistic Square Image con sombra profunda a la izquierda */}
                <div className="relative group shrink-0">
                    <div className="absolute -inset-1 bg-gradient-to-r from-accent to-accent/50 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-[ -20px_20px_50px_rgba(0,0,0,0.5)] bg-elevated border border-white/5">
                        <Avatar
                            src={profile.avatarUrl || undefined}
                            name={profile.displayName}
                            className="w-full h-full object-cover"
                            size="full"
                            disableBorder
                        />
                    </div>
                </div>

                {/* Text Content */}
                <div className="flex-1 flex flex-col items-start text-left pb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-accent mb-2">
                        Perfil Público
                    </span>
                    <h1
                        className="font-black text-primary leading-tight tracking-tighter"
                        style={{
                            fontSize: titleFontSize,
                            width: isLongTitle ? '90%' : 'auto'
                        }}
                    >
                        {profile.displayName}
                    </h1>
                    <div className="flex items-center gap-4 mt-4">
                        <span className="text-sm font-semibold text-secondary">@{profile.alias}</span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            <span className="text-xs font-bold text-success uppercase">Disponible</span>
                        </div>
                    </div>
                    {profile.bio && (
                        <p className="mt-4 text-base text-secondary/80 max-w-xl font-medium leading-relaxed italic">
                            "{profile.bio}"
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
