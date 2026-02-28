// lib/storage.ts
import { logger } from './logger';

const log = logger.withContext({ component: 'storage' });

/**
 * Utilitário centralizado para operações no Backblaze B2 (substituindo Supabase Storage)
 */
export const storage = {
    /**
     * Faz upload de um arquivo para o B2 usando uma URL pré-assinada
     */
    async uploadFile(file: File, path: string): Promise<{ success: boolean; error?: string }> {
        try {
            log.info(`Iniciando upload para: ${path}`);

            // 1. Obter URL de upload assinada do nosso backend
            const response = await fetch('/api/get-storage-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: path,
                    contentType: file.type,
                    operation: 'upload',
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Erro ao obter URL de upload');
            }

            const { url } = await response.json();

            // 2. EXECUTAR o upload real via PUT diretamente para o B2
            const uploadResp = await fetch(url, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (!uploadResp.ok) {
                throw new Error(`Falha no upload para o B2: ${uploadResp.statusText}`);
            }

            log.info(`Upload concluído com sucesso: ${path}`);
            return { success: true };
        } catch (error: any) {
            log.error('Erro no uploadFile', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Obtém uma URL de visualização/download assinada
     */
    async getSignedUrl(path: string): Promise<{ url?: string; error?: string }> {
        try {
            const response = await fetch('/api/get-storage-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: path,
                    operation: 'download',
                }),
            });

            if (!response.ok) {
                throw new Error('Erro ao obter URL de visualização');
            }

            const { url } = await response.json();
            return { url };
        } catch (error: any) {
            log.error('Erro ao obter URL assinada', error);
            return { error: error.message };
        }
    },
};
