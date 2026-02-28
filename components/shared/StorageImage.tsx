// components/shared/StorageImage.tsx
import React, { useState, useEffect } from 'react';
import { storage } from '../../lib/storage';
import { User, Loader2 } from 'lucide-react';

interface StorageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    path: string | null;
    fallback?: React.ReactNode;
}

/**
 * Componente para exibir imagens armazenadas no B2.
 * Resolve caminhos (ex: people-photos/...) em URLs assinadas.
 */
export const StorageImage: React.FC<StorageImageProps> = ({ path, fallback, ...props }) => {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!path) {
            setUrl(null);
            return;
        }

        // Se já for uma URL completa (ex: Supabase antiga), usa direto
        if (path.startsWith('http')) {
            setUrl(path);
            return;
        }

        let isMounted = true;
        const loadUrl = async () => {
            setLoading(true);
            const { url: signedUrl } = await storage.getSignedUrl(path);
            if (isMounted && signedUrl) {
                setUrl(signedUrl);
            }
            if (isMounted) setLoading(false);
        };

        loadUrl();
        return () => {
            isMounted = false;
        };
    }, [path]);

    if (loading && !url) {
        return (
            <div className={`${props.className} flex items-center justify-center bg-ai-surface2 animate-pulse`}>
                <Loader2 className="w-4 h-4 animate-spin text-ai-subtext" />
            </div>
        );
    }

    if (!url) {
        return (
            <div className={`${props.className} flex items-center justify-center bg-ai-surface2`}>
                {fallback || <User className="text-ai-subtext" />}
            </div>
        );
    }

    return <img src={url} alt={props.alt || ''} {...props} />;
};
