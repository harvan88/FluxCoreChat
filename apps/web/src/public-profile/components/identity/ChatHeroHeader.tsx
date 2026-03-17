import { Avatar } from '../../../components/ui';
import { clsx } from 'clsx';
import { GlobeIcon, MapPinIcon, UtensilsCrossedIcon, BadgeCheckIcon } from '../../../lib/icon-library';
import { useEffect, useRef, useState } from 'react';

interface ChatHeroHeaderProps {
    profile: {
        displayName: string;
        alias: string;
        avatarUrl: string | null;
        bio?: string | null;
    };
    progress: number; // 0 (expanded) to 1 (collapsed)
}

export function ChatHeroHeader({ profile, progress }: ChatHeroHeaderProps) {
    // Sistema de cálculo en tiempo real
    const containerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    
    // FUENTE DE VERDAD DINÁMICA: Extraer color dominante del avatar
    const [accentColor, setAccentColor] = useState('#3b82f6'); // Default fallback
    
    const extractDominantColor = (imageUrl: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                    resolve('#3b82f6');
                    return;
                }
                
                // Redimensionar para análisis rápido
                const sampleSize = 50;
                canvas.width = sampleSize;
                canvas.height = sampleSize;
                
                // Dibujar imagen redimensionada
                ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
                
                // Obtener datos de píxeles
                const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
                const data = imageData.data;
                
                // Análisis de color dominante
                const colorMap = new Map<string, number>();
                
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];
                    
                    // Ignorar píxeles transparentes
                    if (a < 128) continue;
                    
                    // Cuantizar colores para agrupar similares
                    const quantizedR = Math.round(r / 32) * 32;
                    const quantizedG = Math.round(g / 32) * 32;
                    const quantizedB = Math.round(b / 32) * 32;
                    
                    const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
                    colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
                }
                
                // Encontrar color más frecuente
                let maxCount = 0;
                let dominantColor = '#3b82f6';
                
                for (const [colorKey, count] of colorMap) {
                    if (count > maxCount) {
                        maxCount = count;
                        const [r, g, b] = colorKey.split(',').map(Number);
                        dominantColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    }
                }
                
                resolve(dominantColor);
            };
            
            img.onerror = () => resolve('#3b82f6');
            img.src = imageUrl;
        });
    };
    
    // Extraer color del avatar cuando cambia
    useEffect(() => {
        if (profile.avatarUrl) {
            extractDominantColor(profile.avatarUrl).then(setAccentColor);
        }
    }, [profile.avatarUrl]);
    
    const [dimensions, setDimensions] = useState({
        containerWidth: 0,
        containerHeight: 0,
        avatarSize: 0,
        textAreaWidth: 0,
        titleFontSize: 0,
        textWidth: 0,           // Ancho exacto del texto
        badgePosition: { x: 0, y: 0 }, // Posición del badge
        badgeSize: 24,          // Tamaño del badge adaptativo
        buttonFontSize: 12,      // Tamaño de fuente de botones
        buttonPadding: 12        // Padding de botones
    });

    // Cálculos complejos en tiempo real
    const calculateDimensions = () => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const isMobile = window.innerWidth < 768; // Breakpoint md

        
                
        // Fuente de verdad: diferente para móvil vs desktop
        
        let avatarSize, textAreaWidth;
        
        // FUENTE DE VERDAD REAL: El contenedor, no el viewport total
        // Esto es crítico para escritorio donde el chat ocupa solo una parte de la pantalla
        const realContentWidth = containerWidth || window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxContentWidth = 1400; 
        
        // Calcular ancho real disponible (restando padding interno del bloque)
        const availableWidth = Math.min(realContentWidth - 64, maxContentWidth);
        
        console.log('[ChatHeroHeader] Available dimensions:', {
            containerWidth,
            availableWidth,
            isMobile
        });
        
        // CRITERIO 1: Avatar = 35% del espacio disponible en Desktop, más en móvil
        const avatarRatio = isMobile ? 0.45 : 0.35;
        avatarSize = Math.min(
            availableWidth * avatarRatio,
            viewportHeight * (isMobile ? 0.35 : 0.25),
            isMobile ? 180 : 240
        );
        
        // CRITERIO 2: Texto = Espacio restante
        textAreaWidth = availableWidth - avatarSize - 32; 
        
        // CRITERIO 3: En móvil, ajustar pero mantener proporción 70/30
        if (isMobile) {
            avatarSize = Math.min(avatarSize, 180); // Máximo 180px en móvil
            textAreaWidth = availableWidth * 0.7; // 70% para compensar
        }
        
        // Cálculo basado en ancho de contenedor (cw) no viewport (vw)
        const cw = (containerWidth || window.innerWidth) * 0.01;
        const textLength = profile.displayName.length;
        
        // SISTEMA ELÁSTICO: A más texto, menos avatar y menos fuente
        let avatarScale = 1;
        let titleFontSize;
        
        if (isMobile) {
            if (textLength <= 10) {
                titleFontSize = Math.min(10 * cw, 42);
                avatarScale = 1;
            } else if (textLength <= 20) {
                titleFontSize = Math.min(7 * cw, 32);
                avatarScale = 0.9;
            } else {
                titleFontSize = Math.min(5 * cw, 24);
                avatarScale = 0.8;
            }
            
            // Móvil: Avatar dominante (65% del ancho)
            avatarSize = Math.min(availableWidth * 0.65, 240) * avatarScale;
        } else {
            if (textLength <= 10) {
                titleFontSize = Math.min(12 * cw, 64);
                avatarScale = 1;
            } else if (textLength <= 22) {
                titleFontSize = Math.min(9 * cw, 48);
                avatarScale = 0.9;
            } else {
                titleFontSize = Math.min(7 * cw, 36);
                avatarScale = 0.75;
            }
            
            // Desktop: Avatar lateral elegante
            avatarSize = Math.min(availableWidth * 0.3, 220) * avatarScale;
        }
        
        console.log('[ChatHeroHeader] Final dimensions:', {
            availableWidth,
            avatarSize,
            textAreaWidth,
            titleFontSize,
            'Avatar width': `${avatarSize}px`,
            'Text area width': `${textAreaWidth}px`,
            'Title font size': `${titleFontSize}px`,
            'Text length': profile.displayName.length
        });
        
        console.log('[ChatHeroHeader] Final dimensions:', {
            avatarSize,
            textAreaWidth,
            titleFontSize,
            'Avatar size in CSS': `${avatarSize}px`
        });

        // Medición precisa del texto con Canvas API
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Configurar fuente igual al título
            const fontWeight = '900'; // font-black
            const fontFamily = 'system-ui, -apple-system, sans-serif';
            ctx.font = `${fontWeight} ${titleFontSize}px ${fontFamily}`;
            
            // Medir ancho exacto del texto
            const textMetrics = ctx.measureText(profile.displayName);
            const textWidth = textMetrics.width;
            
            // ESTILO X/INSTAGRAM: Badge pegado al final del texto
            // Sin cálculos complejos, simplemente después del texto medido
            const badgePosition = {
                x: textWidth + 8, // 8px después del texto real
                y: -4 // 4px arriba (alineado con parte superior del texto)
            };

            // Cálculos adaptativos para badge y botones
            const badgeSize = Math.max(
                titleFontSize * 0.5,   // 50% del tamaño del título
                16,                    // Mínimo 16px
                Math.min(titleFontSize * 0.8, 32) // Máximo 80% del título, 32px max
            );

            const buttonFontSize = Math.max(
                titleFontSize * 0.25,  // 25% del tamaño del título
                10,                    // Mínimo 10px
                Math.min(titleFontSize * 0.4, 16) // Máximo 40% del título, 16px max
            );

            const buttonPadding = Math.max(
                buttonFontSize * 0.8,   // 80% del tamaño de fuente
                6,                     // Mínimo 6px
                Math.min(buttonFontSize * 1.2, 16) // Máximo 120% de fuente, 16px max
            );

            // Debug final - FUENTE DE VERDAD REAL
            console.log('🔍 FUENTE DE VERDAD REAL:', {
                windowWidth: window.innerWidth,
                availableWidth, // Ancho real disponible
                isMobile,
                containerWidth, // Lo que mide el contenedor (probablemente incorrecto)
                // Cálculos que HACEMOS:
                calculatedAvatarSize: avatarSize,
                calculatedTextWidth: textAreaWidth,
                titleFontSize,
                // ¿Qué se aplica realmente en el DOM?
                avatarStyle: `width: ${avatarSize}px, height: ${avatarSize}px`,
                textStyle: `width: ${textAreaWidth}px`,
                // Porcentajes REALES del espacio disponible:
                avatarPercent: ((avatarSize / availableWidth) * 100).toFixed(1) + '%',
                textPercent: ((textAreaWidth / availableWidth) * 100).toFixed(1) + '%',
                // Porcentajes del viewport total:
                avatarViewportPercent: ((avatarSize / window.innerWidth) * 100).toFixed(1) + '%',
                textViewportPercent: ((textAreaWidth / window.innerWidth) * 100).toFixed(1) + '%'
            });

            setDimensions({
                containerWidth,
                containerHeight,
                avatarSize,
                textAreaWidth: availableWidth - avatarSize - 40, // Más margen
                titleFontSize,
                textWidth,
                badgePosition,
                badgeSize,
                buttonFontSize,
                buttonPadding
            });
        }
    };

    useEffect(() => {
        calculateDimensions();
        
        const handleResize = () => {
            calculateDimensions();
        };
        
        window.addEventListener('resize', handleResize);
        
        // También escuchar cambios de orientación en móviles
        const handleOrientationChange = () => {
            setTimeout(calculateDimensions, 100); // Pequeño delay para que el DOM se actualice
        };
        
        window.addEventListener('orientationchange', handleOrientationChange);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleOrientationChange);
        };
    }, [profile.displayName]);

    // Interpolaciones de estilo basadas en el progreso del scroll
    const opacity = 1 - Math.min(1, progress * 1.5); // Fades out faster
    const scale = 1 - (progress * 0.1);
    const translateY = progress * -40;

    // Altura dinámica: Ajustada para acomodar un avatar más grande
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const maxHeight = isMobile ? 420 : 300; 
    const minHeight = isMobile ? 110 : 90;  
    const currentHeight = maxHeight - (maxHeight - minHeight) * Math.min(1, progress);

    return (
        <div
            className="relative w-full overflow-hidden transition-all duration-300 ease-out flex flex-col justify-start"
            style={{ height: `${currentHeight}px` }}
        >
            {/* Background Banner con gradiente de opacidad + gradiente superpuesto */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ 
                    opacity: 1 - progress,
                    background: `linear-gradient(to bottom, ${accentColor} 0%, transparent 100%)`
                }}
            />
            {/* Capa de fusión final: Disuelve el header en el color base del chat */}
            <div
                className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-base)] pointer-events-none z-10"
                style={{ opacity: 1 - progress }}
            />

            {/* Header Compacto (Sticky Overlay) - Se sincroniza con el scroll */}
            <div
                className={clsx(
                    "absolute top-0 left-0 right-0 z-50 h-20 border-b border-white/5 px-6 flex items-center gap-4 transition-all duration-500",
                    progress > 0.6 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
                )}
            >
                {/* Background SÓLIDO con fuente de verdad del avatar */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ 
                        opacity: progress > 0.6 ? 1 : 0, // Solo visible cuando el header está activo
                        background: accentColor // Color sólido del avatar
                    }}
                />
                {/* Capa oscura superior - Negro 70% transparente */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ 
                        opacity: progress > 0.6 ? 0.7 : 0, // Solo visible cuando el header está activo
                        background: 'rgba(0, 0, 0, 0.7)' // Negro 70% transparente
                    }}
                />
                <div className="relative z-10">
                    <Avatar
                        src={profile.avatarUrl || undefined}
                        name={profile.displayName}
                        size="sm"
                        className="ring-2 ring-accent/20"
                    />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-surface" />
                </div>
                <div className="flex flex-col relative z-10">
                    <h2 className="text-base font-bold text-primary truncate max-w-[200px] leading-tight">
                        {profile.displayName}
                    </h2>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-widest">En línea</span>
                </div>
            </div>

            {/* Main Hero Header - Distribución 40% avatar, 60% texto */}
            <div
                ref={containerRef}
                className="relative px-8 pt-8 flex flex-col md:flex-row items-center justify-center md:justify-start w-full max-w-7xl mx-auto transition-transform duration-300 flex-shrink-0 gap-5"
                style={{
                    opacity,
                    transform: `translateY(${translateY}px) scale(${scale})`,
                    transformOrigin: 'top center',
                    pointerEvents: progress > 0.5 ? 'none' : 'auto'
                }}
            >
                {/* Avatar - 40% del espacio, siempre cuadrado */}
                <div 
                    className="relative group shrink-0" 
                    style={{ 
                        width: `${dimensions.avatarSize}px`, 
                        height: `${dimensions.avatarSize}px`
                    }}
                >
                    <div className="absolute -inset-2 bg-gradient-to-br from-accent/50 to-transparent rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-[0px_32px_100px_rgba(0,0,0,0.8)] bg-elevated m-1.25">
                        <Avatar
                            src={profile.avatarUrl || undefined}
                            name={profile.displayName}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            size="2xl"
                            shape="square"
                        />
                    </div>
                </div>

                {/* Content Block (Title + Alias) */}
                <div 
                    className="flex flex-col items-center md:items-start text-center md:text-left min-w-0"
                    style={{ 
                        paddingLeft: isMobile ? '0' : '1.5rem'
                    }}
                >
                    {/* Row 1: Title + Badge */}
                    <div className="relative inline-flex items-center gap-2 max-w-full flex-wrap justify-center md:justify-start">
                        <h1
                            ref={titleRef}
                            className="font-black text-primary leading-tight tracking-tighter"
                            style={{
                                fontSize: `${dimensions.titleFontSize}px`,
                                margin: 0
                            }}
                        >
                            {profile.displayName}
                        </h1>
                        <div className="shrink-0 bg-accent rounded-full flex items-center justify-center shadow-md"
                             style={{ width: `${dimensions.badgeSize}px`, height: `${dimensions.badgeSize}px` }}>
                            <BadgeCheckIcon size={dimensions.badgeSize * 0.6} className="text-white" />
                        </div>
                    </div>

                    {/* Row 2: Alias */}
                    <div className="mt-1">
                        <span className="text-sm font-bold text-secondary/60">@{profile.alias}</span>
                    </div>
                </div>
            </div>

            {/* Tags / Actions - Elevados sobre la fusión para mantener legibilidad */}
            <div className="relative z-20 px-8 mt-4 pb-6">
                <div className="flex flex-wrap gap-2 justify-center items-center w-full max-w-2xl mx-auto">
                    <button className="flex items-center gap-1.5 border border-white/20 bg-white/5 backdrop-blur-md rounded-full font-bold text-white hover:bg-white/10 transition-all text-[10px] px-4 py-2 shadow-lg">
                        <GlobeIcon size={12} /> Sitio Web
                    </button>
                    <button className="flex items-center gap-1.5 border border-white/20 bg-white/5 backdrop-blur-md rounded-full font-bold text-white hover:bg-white/10 transition-all text-[10px] px-4 py-2 shadow-lg">
                        <MapPinIcon size={12} /> Ubicación
                    </button>
                    <button className="flex items-center gap-1.5 border border-white/20 bg-white/5 backdrop-blur-md rounded-full font-bold text-white hover:bg-white/10 transition-all text-[10px] px-4 py-2 shadow-lg">
                        <UtensilsCrossedIcon size={12} /> Menú Digital
                    </button>
                </div>
            </div>
        </div>
    );
}
