export interface VectorStoreFile {
    id: string;
    filename: string;
    bytes: number;
    createdAt: number;
    status: string;
}

export interface IVectorStoreDriver {
    readonly name: string;
    createStore(name: string, metadata?: Record<string, any>): Promise<string>;
    deleteStore(storeId: string): Promise<void>;
    uploadFile(storeId: string, fileData: Blob | Buffer, filename: string, mimeType: string): Promise<VectorStoreFile>;
    deleteFile(storeId: string, fileId: string): Promise<void>;
    listFiles(storeId: string): Promise<VectorStoreFile[]>;
    updateStore(storeId: string, data: { expires_after?: any; name?: string }): Promise<void>;
}
