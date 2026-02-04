/**
 * Hook para implementar rate limiting em operações
 * Previne abuso de APIs e operações custosas
 */

import { useRef, useCallback } from 'react';

export const useRateLimiter = (limitMs: number = 60000) => {
    const lastCallRef = useRef<number>(0);

    const canCall = useCallback(() => {
        const now = Date.now();
        if (now - lastCallRef.current < limitMs) {
            return false;
        }
        lastCallRef.current = now;
        return true;
    }, [limitMs]);

    const getRemainingTime = useCallback(() => {
        const now = Date.now();
        const elapsed = now - lastCallRef.current;
        return Math.max(0, limitMs - elapsed);
    }, [limitMs]);

    const reset = useCallback(() => {
        lastCallRef.current = 0;
    }, []);

    return { canCall, getRemainingTime, reset };
};
