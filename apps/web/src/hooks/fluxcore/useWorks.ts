import { useState, useCallback, useEffect } from 'react';
import { api } from '../../services/api';

export function useWorks(accountId: string) {
    const [proposed, setProposed] = useState<any[]>([]);
    const [active, setActive] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadWorks = useCallback(async () => {
        if (!accountId) return;
        setLoading(true);
        setError(null);
        try {
            const [proposedRes, activeRes, historyRes] = await Promise.all([
                api.getProposedWorks(accountId),
                api.getActiveWorks(accountId),
                api.getWorkHistory(accountId)
            ]);

            if (proposedRes.success) setProposed(proposedRes.data || []);
            else console.error('Error loading proposed works:', proposedRes.error);

            if (activeRes.success) setActive(activeRes.data || []);
            else console.error('Error loading active works:', activeRes.error);

            if (historyRes.success) setHistory(historyRes.data || []);
            else console.error('Error loading history works:', historyRes.error);

        } catch (err) {
            console.error('Error loading works:', err);
            setError('Error de conexión al cargar trabajos');
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        loadWorks();
    }, [loadWorks]);

    return {
        proposed,
        active,
        history,
        loading,
        error,
        refresh: loadWorks
    };
}
