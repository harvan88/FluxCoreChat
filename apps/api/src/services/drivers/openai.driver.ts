
import { IVectorStoreDriver, VectorStoreFile } from './types';

export class OpenAIDriver implements IVectorStoreDriver {
    readonly name = 'openai';
    private apiKey: string;
    private baseUrl = 'https://api.openai.com/v1';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('OpenAI API Key is required for OpenAIDriver');
        }
    }

    private async request(method: string, path: string, body?: any, isMultipart = false) {
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.apiKey}`,
            'OpenAI-Beta': 'assistants=v2' // Header necesario para Vector Stores
        };

        if (!isMultipart) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: body ? (isMultipart ? body : JSON.stringify(body)) : undefined
        });

        if (!response.ok) {
            let errorDetail = response.statusText;
            try {
                const errJson = await response.json();
                errorDetail = JSON.stringify(errJson);
            } catch (e) {
                // Ignorar error de parseo
            }
            throw new Error(`OpenAI API Error (${response.status} ${path}): ${errorDetail}`);
        }

        return response.json();
    }

    async createStore(name: string, metadata?: Record<string, any>): Promise<string> {
        const payload: any = { name };
        if (metadata) payload.metadata = metadata;

        const data = await this.request('POST', '/vector_stores', payload);
        return data.id;
    }

    async deleteStore(storeId: string): Promise<void> {
        try {
            await this.request('DELETE', `/vector_stores/${storeId}`);
        } catch (error: any) {
            if (error.message.includes('404')) return; // Ya borrado
            throw error;
        }
    }

    async uploadFile(storeId: string, fileData: Blob | Buffer, filename: string, mimeType: string): Promise<VectorStoreFile> {
        // 1. Subir archivo a /files
        const formData = new FormData();
        // Bun.file o construir Blob. Si es Buffer, convertir a Blob
        let blob: Blob;
        if (fileData instanceof Buffer) {
            blob = new Blob([fileData], { type: mimeType });
        } else {
            blob = fileData as Blob;
        }

        formData.append('file', blob, filename);
        formData.append('purpose', 'assistants');

        const fileResult = await this.request('POST', '/files', formData, true);

        // 2. Asociar a Vector Store
        const vsFileResult = await this.request('POST', `/vector_stores/${storeId}/files`, {
            file_id: fileResult.id
        });

        return {
            id: vsFileResult.id,
            filename: filename,
            bytes: fileResult.bytes,
            createdAt: fileResult.created_at,
            status: vsFileResult.status
        };
    }

    async deleteFile(storeId: string, fileId: string): Promise<void> {
        // 1. Desvincular del store
        try {
            await this.request('DELETE', `/vector_stores/${storeId}/files/${fileId}`);
        } catch (e: any) {
            console.warn(`[OpenAIDriver] Unlink failed: ${e.message}`);
        }

        // 2. Borrar archivo físico (El ID del vsFile puede ser diferente al ID del file, pero 
        // en la respuesta de subida vsFile.id suele ser el ID de la ENTIDAD DE ASOCIACION, 
        // mientras que file_id es el archivo.
        // Ojo: DELETE /vector_stores/{vs_id}/files/{file_id} usa el FILE_ID.
        // Y DELETE /files/{file_id} usa el FILE_ID.
        // La interfaz VectorStoreFile retorna `id`. Deberíamos asegurarnos que retornamos el FILE ID.
        // En uploadFile: vsFileResult tiene `id` que es el id del 'vector_store.file'.
        // PERO `fileResult.id` es el id del File.
        // La interfaz debería devolver el ID que sirva para operaciones futuras.
        // Para borrar, necesitamos el File ID.
        // vsFileResult tiene un campo `id` que coincide con `file_id`?
        // Verificando docs: El objeto Vector store file tiene id.
        // "The ID of the vector store file."

        // Si la interfaz es abstracta, deberíamos guardar el ID que permita gestionar el recurso.
        // Si usamos el OPENAI FILE ID como ID canónico, es mejor.

        // CORRECCIÓN en uploadFile: devolver fileResult.id como `id` principal si ese es el identificador universal.
        // Pero espera, `deleteFile` recibe `fileId`.
        // Si mando el `vector_store_file.id` a `/files/{id}`, fallará.

        // Decision: Usar el FILE ID ('file-xyz') como el ID canónico en `VectorStoreFile.id`.

        try {
            await this.request('DELETE', `/files/${fileId}`);
        } catch (e: any) {
            console.warn(`[OpenAIDriver] File delete failed: ${e.message}`);
        }
    }

    async listFiles(storeId: string): Promise<VectorStoreFile[]> {
        const data = await this.request('GET', `/vector_stores/${storeId}/files`);

        return data.data.map((f: any) => ({
            id: f.id, // Esto es el vector_store_file id o el file id? 
            // Docs: "The ID of the vector store file."
            // PERO, tiene `id` y tiene `usage_bytes`.
            // Si usamos este ID para borrar en /files/, fallará.
            // OpenAI API es confusa aquí.
            // DELETE /vector_stores/{vs_id}/files/{file_id} -> "Delete a vector store file". The file_id is the ID of the file to remove.
            // O sea, usa 'file-xyz', NO 'vs_file-xyz'.
            // Entonces f.id ES 'file-xyz'?
            // Docs: `object: "vector_store.file", id: "file-..."`.
            // SI, el id del objeto vector_store.file EMPIEZA con "file-". Es el mismo ID del archivo subyacente.
            // OpenAI reutiliza el ID. Perfecto.

            filename: 'unknown', // No disponible en este endpoint
            bytes: f.usage_bytes || 0,
            createdAt: f.created_at,
            status: f.status
        }));
    }
}
