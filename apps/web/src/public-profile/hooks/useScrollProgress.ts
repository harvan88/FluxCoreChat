import { useState, useEffect } from 'react';

export function useScrollProgress(threshold = 200) {
    const [scrollY, setScrollY] = useState(0);
    const [progress, setProgress] = useState(0); // 0 to 1

    useEffect(() => {
        const handleScroll = (e: Event) => {
            const target = e.target as HTMLElement;
            const currentScroll = target.scrollTop;
            setScrollY(currentScroll);

            const newProgress = Math.min(1, currentScroll / threshold);
            setProgress(newProgress);
        };

        const attachListener = () => {
            const scrollContainer = document.getElementById('profile-scroll-container');
            if (scrollContainer) {
                scrollContainer.addEventListener('scroll', handleScroll);
                return true;
            }
            return false;
        };

        // Intenta adjuntar el listener inmediatamente
        if (!attachListener()) {
            // Si falla, intenta durante un breve periodo (por retraso de renderizado de React)
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (attachListener() || attempts > 20) {
                    clearInterval(interval);
                }
            }, 100);

            return () => {
                clearInterval(interval);
                const scrollContainer = document.getElementById('profile-scroll-container');
                if (scrollContainer) {
                    scrollContainer.removeEventListener('scroll', handleScroll);
                }
            };
        }

        return () => {
            const scrollContainer = document.getElementById('profile-scroll-container');
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', handleScroll);
            }
        };
    }, [threshold]);

    return { scrollY, progress };
}
