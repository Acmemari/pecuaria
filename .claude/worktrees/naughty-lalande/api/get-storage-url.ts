// api/get-storage-url.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Endpoint para gerar URLs pré-assinadas para o Backblaze B2
 * POST /api/get-storage-url
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { fileName, contentType, operation = 'upload' } = req.body;

    if (!fileName) {
        return res.status(400).json({ error: 'fileName é obrigatório' });
    }

    // Configurações do B2 (devem estar no .env.local ou Vercel)
    const region = 'us-east-1'; // B2 usa este placeholder freqüentemente ou ignore
    const endpoint = process.env.B2_ENDPOINT || 's3.us-west-004.backblazeb2.com';
    const accessKeyId = process.env.B2_APPLICATION_KEY_ID;
    const secretAccessKey = process.env.B2_APPLICATION_KEY;
    const bucketName = process.env.B2_BUCKET_NAME;

    if (!accessKeyId || !secretAccessKey || !bucketName) {
        console.error('[STORAGE API] Credenciais B2 ausentes');
        return res.status(500).json({ error: 'Configuração de storage incompleta no servidor' });
    }

    try {
        const s3Client = new S3Client({
            region,
            endpoint: `https://${endpoint}`,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            forcePathStyle: true, // Necessário para B2
        });

        if (operation === 'upload') {
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: fileName,
                ContentType: contentType || 'application/octet-stream',
            });

            // URL de upload válida por 15 minutos
            const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
            return res.status(200).json({ url, method: 'PUT' });
        } else {
            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: fileName,
            });

            // URL de download válida por 1 hora
            const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            return res.status(200).json({ url, method: 'GET' });
        }
    } catch (error: any) {
        console.error('[STORAGE API] Erro ao gerar URL:', error.message);
        return res.status(500).json({ error: 'Erro ao gerar URL de acesso ao storage' });
    }
}
