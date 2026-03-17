# 🎯 FLUJO COMPLETO DE AUDIO - ANÁLISIS DIRECTO

## 📋 1. FRONTEND - AudioRecorderPanel.tsx (handleSend)
```typescript
const handleSend = () => {
  // 🚨 ALERTA: Debug de audio
  console.log('🎵 AUDIO DEBUG: Enviando audio...');
  alert('🎵 AUDIO DEBUG: Enviando audio - Revisa la consola del servidor');

  const finalize = () => {
    // Crear archivo
    const rawMime = r.mimeType || 'audio/webm';
    const normalizedMime = normalizeMimeType(rawMime);  // video/webm → audio/webm
    const blob = new Blob(chunksRef.current, { type: normalizedMime });
    const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: normalizedMime });

    // Llamar a props.onSend(file)
    Promise.resolve(props.onSend(file))
      .then(() => {
        console.log('🎵 AUDIO DEBUG: Audio enviado exitosamente');
        alert('✅ AUDIO DEBUG: Audio enviado');
        props.onDiscard();
      });
  };
};
```

## 📋 2. FRONTEND - FluxCoreComposer.tsx (onSend)
```typescript
onSend={async (file) => {
  // Llama a uploadAudio
  const result = await props.uploadAudio({ file });
  if (!result.success || !result.asset) return;
  
  // Envía el mensaje con el asset
  await props.onSend({
    text: '',
    media: [{
      type: 'audio',
      assetId: result.asset.assetId,
      name: result.asset.name,
      mimeType: result.asset.mimeType,
      sizeBytes: result.asset.sizeBytes,
      waveformData: result.waveformData,
    }],
  });
}}
```

## 📋 3. FRONTEND - UnifiedChatView.tsx (uploadAudioForComposer)
```typescript
const uploadAudioForComposer = useCallback(async ({ file }: { file: File }) => {
  console.log('🎵 AUDIO DEBUG: uploadAudioForComposer llamado con file:', file.name);
  
  if (!currentUserId || !accountId) {
    return { success: false, error: 'No hay sesión activa' };
  }

  console.log('🎵 AUDIO DEBUG: Llamando a performAssetUpload...');
  const asset = await performAssetUpload({ file });
  console.log('🎵 AUDIO DEBUG: performAssetUpload devolvió:', asset);
  
  return {
    success: !!asset,
    asset: asset ?? undefined,
  };
}, [accountId, currentUserId, performAssetUpload]);

const performAssetUpload = useCallback(async ({ file }: { file: File }) => {
  return await uploadAssetRequest(file);  // ← useAssetUpload.upload()
}, [uploadAssetRequest]);
```

## 📋 4. FRONTEND - useAssetUpload.ts (upload)
```typescript
const upload = useCallback(async (file: File): Promise<UploadedAsset | null> => {
  console.log('🎵 AUDIO DEBUG: upload() llamado con file:', file.name);
  
  // Validar tipo MIME
  if (allowedMimeTypes && allowedMimeTypes.length > 0) {
    console.log('🎵 AUDIO DEBUG: Validando MIME type:', file.type);
    console.log('🎵 AUDIO DEBUG: MIME types permitidos:', allowedMimeTypes);
    
    const isAllowed = allowedMimeTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    console.log('🎵 AUDIO DEBUG: MIME type permitido?', isAllowed);
    if (!isAllowed) return null;
  }

  try {
    // 1. Crear sesión
    const sessionData = await createSession(file);
    if (!sessionData) return null;

    // 2. Subir archivo
    const uploaded = await uploadFile(file, sessionData.sessionId);
    if (!uploaded) return null;

    // 3. Confirmar upload
    const asset = await commitUpload(sessionData.sessionId);
    return asset;
  } catch (err) {
    return null;
  }
}, [createSession, uploadFile, commitUpload, maxSizeBytes, allowedMimeTypes, onError]);
```

## 📋 5. FRONTEND - useAssetUpload.ts (commitUpload)
```typescript
const commitUpload = useCallback(async (sessionId: string): Promise<UploadedAsset | null> => {
  console.log('🎵 AUDIO DEBUG: commitUpload llamado con sessionId:', sessionId);
  setStatus('committing');

  try {
    if (!accountId) {
      throw new Error('Account ID is required to commit uploads');
    }
    console.log('🎵 AUDIO DEBUG: Llamando a api.commitAssetUpload...');
    const response = await api.commitAssetUpload(sessionId, accountId, { scope });
    console.log('🎵 AUDIO DEBUG: Respuesta de commitAssetUpload:', response);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to commit upload');
    }

    const asset: UploadedAsset = {
      assetId: response.data.assetId,
      name: response.data.name,
      mimeType: response.data.mimeType,
      sizeBytes: response.data.sizeBytes,
      status: response.data.status,
    };

    setUploadedAsset(asset);
    setStatus('completed');
    onSuccess?.(asset);

    return asset;
  } catch (err) {
    console.error('🎵 AUDIO DEBUG: Error en commitUpload:', err);
    return null;
  }
}, [accountId, onSuccess, onError, scope]);
```

## 📋 6. FRONTEND - api.ts (commitAssetUpload)
```typescript
async commitAssetUpload(
  sessionId: string,
  accountId: string,
  options?: { scope?: string }
): Promise<ApiResponse<{ assetId: string; name: string; mimeType: string; sizeBytes: number; status: string }>> {
  return this.request(`/api/assets/upload/${sessionId}/commit?accountId=${accountId}`, {
    method: 'POST',
    body: JSON.stringify({
      accountId,
      scope: options?.scope || 'message_attachment',
      uploadedBy: this.currentUserId || null,
    }),
    headers: {
      'x-account-id': accountId,
      'x-user-id': this.currentUserId || '',
    },
  });
}
```

## 📋 7. BACKEND - assets.routes.ts (POST /api/assets/upload/:sessionId/commit)
```typescript
console.log(`${DEBUG_PREFIX} 🔥🔥🔥 COMMIT ENDPOINT CALLED: sessionId=${params.sessionId}, accountId=${accountId}`);
console.log(`${DEBUG_PREFIX} Creating asset from upload for account: ${accountId}`);

const result = await assetRegistryService.createFromUpload({
  sessionId: params.sessionId,
  accountId,
  workspaceId: body?.workspaceId,
  name: body?.name,
  scope: body?.scope as any,
  dedupPolicy: body?.dedupPolicy as any,
  uploadedBy,
  metadata: body?.metadata,
});

if (!result.success || !result.asset) {
  console.log(`${DEBUG_PREFIX} ERROR:`, result.error);
  set.status = 400;
  return { success: false, error: result.error };
}

console.log(`${DEBUG_PREFIX} Asset created: ${result.asset.id}`);
```

## 📋 8. BACKEND - asset-registry.service.ts (createFromUpload)
```typescript
async createFromUpload(params: CreateAssetFromUploadParams): Promise<{ success: boolean; asset?: Asset; error?: string }> {
  console.log(`${DEBUG_PREFIX} 🔥🔥🔥 createFromUpload CALLED: sessionId=${params.sessionId}, accountId=${params.accountId}`);
  
  const { sessionId, accountId, workspaceId, name, scope, dedupPolicy, uploadedBy, metadata } = params;

  // ... validaciones ...

  // Crear asset
  const [asset] = await db.insert(assets).values({
    accountId: params.accountId,
    workspaceId: workspaceId || null,
    name: name || fileName,
    mimeType: mimeType,
    sizeBytes: fileSize,
    status: 'pending',
    scope: scope || 'message_attachment',
    dedupPolicy: dedupPolicy || 'session',
    uploadedBy: uploadedBy || null,
    metadata: metadata || {},
    storageKey: finalStorageKey,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  console.log(`${DEBUG_PREFIX} 🎯 ASSET CREATED: ${asset.id}, status=pending, name=${fileName}, mimeType=${mimeType}, uploadedBy=${uploadedBy}`);

  // Mover a ubicación final
  await this.moveToFinalStorage(tempStorageKey, finalStorageKey);
  console.log(`${DEBUG_PREFIX} 📦 Asset moved to final location: ${finalStorageKey}`);

  // Marcar como ready
  console.log(`${DEBUG_PREFIX} ⏳ MARKING ASSET AS READY: ${asset.id}`);
  await this.updateStatus(asset.id, 'ready');

  return { success: true, asset };
}
```

## 📋 9. BACKEND - asset-registry.service.ts (updateStatus)
```typescript
async updateStatus(assetId: string, status: AssetStatus): Promise<void> {
  console.log(`${DEBUG_PREFIX} 🔥🔥🔥 updateStatus() CALLED: assetId=${assetId}, status=${status}`);
  
  const asset = await this.getById(assetId);
  const previousStatus = asset?.status;

  if (!asset) {
    throw new Error(`${DEBUG_PREFIX} Asset ${assetId} not found`);
  }

  if (previousStatus === status) {
    console.log(`${DEBUG_PREFIX} Asset ${assetId} already in status ${status}`);
    return;
  }

  // Actualizar en BD
  const [updated] = await db
    .update(assets)
    .set({ status, updatedAt: new Date() })
    .where(eq(assets.id, assetId))
    .returning();

  if (updated) {
    console.log(`${DEBUG_PREFIX} Asset updated: ${assetId}`);
  }

  // 🎯 EMITIR EVENTO SI EL ESTADO ES READY
  if (status === 'ready') {
    console.log(`${DEBUG_PREFIX} 🔍 ABOUT TO EMIT asset:ready event`);
    coreEventBus.emit('asset:ready', {
      assetId,
      accountId: asset.accountId,
      mimeType: asset.mimeType,
    });
    console.log(`${DEBUG_PREFIX} 📢 EMITTED asset:ready event for ${assetId}`);
  }
}
```

## 📋 10. BACKEND - media-orchestrator.service.ts (setupListeners)
```typescript
private setupListeners() {
  coreEventBus.on('asset:ready', (payload) => {
    console.log('[MediaOrchestrator] 🔔 RECEIVED asset:ready event:', {
      assetId: payload.assetId,
      accountId: payload.accountId,
      mimeType: payload.mimeType,
      isAudio: payload.mimeType?.includes('audio') || payload.mimeType?.includes('webm')
    });
    
    this.handleAssetReady(payload).catch(err =>
      console.error('[MediaOrchestrator] Error handling asset:', err)
    );
  });
  console.log('[MediaOrchestrator] Listening for asset:ready events');
}

public init() {
  console.log('[MediaOrchestrator] Explicit initialization called');
  this.setupListeners();  // ← ¡IMPORTANTE!
}
```

## 📋 11. BACKEND - media-orchestrator.service.ts (handleAssetReady)
```typescript
private async handleAssetReady(payload: Parameters<CoreEventMap['asset:ready']>[0]) {
  const { assetId, accountId, mimeType } = payload;

  console.log(`[MediaOrchestrator] 🔍 Processing asset:ready for ${assetId}`);

  if (!mimeType || !this.isAudioMime(mimeType)) {
    console.log(`[MediaOrchestrator] ⏭️ Asset ${assetId} ignored (mimeType ${mimeType ?? 'unknown'}) - NOT AUDIO`);
    return;
  }

  console.log(`[MediaOrchestrator] 🎧 Asset ${assetId} is AUDIO - starting enrichment`);

  // Buscar mensajes vinculados
  const linkedMessages = await db
    .select()
    .from(messageAssets)
    .where(eq(messageAssets.assetId, assetId));

  for (const link of linkedMessages) {
    const message = await messageService.getMessageById(link.messageId);
    if (!message) continue;

    // Verificar si ya está transcrito
    if (message.content?.__fluxcore?.transcribed) {
      console.log(`[MediaOrchestrator] Message ${link.messageId} already transcribed, skipping`);
      continue;
    }

    try {
      console.log(`[MediaOrchestrator] 🎵 ENRICHING AUDIO: assetId=${assetId}, messageId=${link.messageId}`);
      
      // Llamar a AudioEnrichmentService
      const result = await audioEnrichmentService.enrichAudioMessage({
        messageId: link.messageId,
        accountId: link.accountId || accountId,
        assetId: payload.assetId,
        mimeType: payload.mimeType,
      });

      console.log(`[MediaOrchestrator] ✅ Transcription completed for message ${link.messageId}, asset ${assetId}`);
      
    } catch (error) {
      console.error(`[MediaOrchestrator] ❌ Failed to enrich asset ${assetId} for message ${link.messageId}: ${error}`);
    }
  }
}
```

## 📋 12. BACKEND - audio-enrichment.service.ts (enrichAudioMessage)
```typescript
async enrichAudioMessage(params: {
  messageId: string;
  accountId: string;
  audioUrl?: string;
  assetId?: string;
  mimeType: string;
}): Promise<AudioEnrichmentResult> {
  // Preprocesar audio (convertir a MP3)
  const processedFile = await this.preprocess(audioUrl, assetId, mimeType);
  
  // Transcribir con Whisper
  const transcriptionResult = await this.transcribe(processedFile);
  
  // Guardar enriquecimiento
  await this.saveAssetEnrichment(assetId, 'audio_transcription', {
    text: transcriptionResult.transcription,
    language: transcriptionResult.language,
    model: 'whisper-1',
    processedAt: new Date(),
  });
  
  // Emitir evento
  coreEventBus.emit('media:enriched', {
    messageId,
    accountId,
    type: 'audio',
    enrichment: transcriptionResult,
  });
  
  return {
    ...transcriptionResult,
    wasProcessed: true,
  };
}
```

## 📋 13. BACKEND - audio-enrichment.service.ts (preprocess)
```typescript
private async preprocess(audioUrl?: string, assetId?: string, mimeType?: string): Promise<File> {
  // Convertir video/webm → audio/webm → MP3
  const extension = mimeType?.includes('wav') ? 'wav' :
    mimeType?.includes('ogg') ? 'ogg' :
      mimeType?.includes('mpeg') ? 'mp3' : 'webm';

  const file = new File([blob], `input.${extension}`, { type: mimeType || 'audio/webm' });

  // Convertimos a MP3 para Whisper
  return await audioConverterService.convertToMp3(file);
}
```

## 🔍 ANÁLISIS DEL PROBLEMA

### ✅ El flujo de código ESTÁ completo y correcto:
1. Frontend graba audio → `video/webm`
2. Frontend normaliza → `audio/webm`
3. Frontend valida MIME → `video/webm` está permitido
4. Frontend hace upload → llama a `commitUpload`
5. Backend crea asset → `createFromUpload`
6. Backend actualiza status → `updateStatus('ready')`
7. Backend emite evento → `asset:ready`
8. MediaOrchestrator escucha → `handleAssetReady`
9. AudioEnrichment procesa → convierte a MP3 y transcribe

### ❌ Posibles puntos de falla:
1. **MIME Type validation** - `video/webm` vs `audio/webm`
2. **Event Bus** - listeners no registrados
3. **Asset linking** - asset no vinculado a mensaje
4. **Error silencioso** - try/catch oculta errores

### 🎯 El problema más probable:
**El evento `asset:ready` se emite pero el listener no está registrado correctamente.**
