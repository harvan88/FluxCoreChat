import React, { useState, useRef } from 'react';
import { UploadCloud, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button, Card, CardHeader, CardBody, Textarea } from '../ui';
import { useTemplateStore } from './store/templateStore';
import type { CreateTemplateInput } from './types';

interface TemplateBulkImportModalProps {
  accountId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateBulkImportModal({ accountId, isOpen, onClose }: TemplateBulkImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { bulkImportTemplates } = useTemplateStore();

    const [parsedTemplates, setParsedTemplates] = useState<CreateTemplateInput[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [jsonContent, setJsonContent] = useState<string>('');

  if (!isOpen) return null;

  const resetState = () => {
    setParsedTemplates(null);
    setError(null);
    setSuccessCount(null);
    setIsImporting(false);
    setJsonContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validateAndParseJSON = (content: string, source: 'file' | 'textarea') => {
    try {
      const parsed = JSON.parse(content);

      if (!Array.isArray(parsed)) {
        setError('El JSON debe contener un array (lista) de plantillas.');
        return false;
      }

      if (parsed.length === 0) {
        setError('El array no contiene plantillas.');
        return false;
      }

      // Basic validation of keys
      const isValid = parsed.every(t => t && typeof t === 'object' && t.name && t.content);
      if (!isValid) {
        setError('Una o más plantillas tienen un formato inválido. (Deben contener "name" y "content").');
        return false;
      }

      setParsedTemplates(parsed as CreateTemplateInput[]);
      setError(null);
      return true;
    } catch (err) {
      setError(`Error al analizar el ${source === 'file' ? 'archivo' : 'contenido'}. Asegúrate de que sea un JSON válido.`);
      return false;
    }
  };

  const processFile = (file: File) => {
    setError(null);
    setSuccessCount(null);

    if (!file.name.endsWith('.json')) {
      setError('El archivo debe ser un .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonContent(content);
      validateAndParseJSON(content, 'file');
    };
    reader.onerror = () => {
      setError('Error leyendo el archivo.');
    };
    reader.readAsText(file);
  };

  const handleTextareaChange = (value: string) => {
    setJsonContent(value);
    setError(null);
    setSuccessCount(null);
    
    // Solo validar si hay contenido
    if (value.trim()) {
      validateAndParseJSON(value, 'textarea');
    } else {
      setParsedTemplates(null);
    }
  };

  

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!parsedTemplates || parsedTemplates.length === 0) return;
    setIsImporting(true);
    setError(null);

    try {
      const response = await bulkImportTemplates(accountId, parsedTemplates);
      setSuccessCount(response.createdCount);
      // Wait a moment before closing to show success message
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error durante la importación masiva';
      setError(errorMessage);
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card variant="elevated" className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {successCount !== null ? (
          <CardBody className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-2">
              <CheckCircle size={32} />
            </div>
            <h4 className="text-xl font-medium text-primary">¡Importación Exitosa!</h4>
            <p className="text-muted">Se han importado {successCount} plantillas correctamente.</p>
            <Button onClick={handleClose} className="mt-4">
              Cerrar
            </Button>
          </CardBody>
        ) : (
          <>
            <CardHeader 
              title="Importación Masiva de Plantillas"
              subtitle="Pega o arrastra tu JSON para importar"
              actions={
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isImporting}
                >
                  Cancelar
                </Button>
              }
            />
            
            <CardBody className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {/* Textarea principal */}
                <Textarea
                  placeholder={jsonContent ? '' : 'Pega aquí tu JSON o arrastra un archivo...'}
                  value={jsonContent}
                  onChange={(e) => handleTextareaChange(e.target.value)}
                  error={error || undefined}
                  rows={12}
                  fullWidth
                  helperText={jsonContent ? '' : 'Ejemplo: [{"name": "Plantilla 1", "content": "Contenido..."}]'}
                />
                
                {/* Barra de acciones */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      leftIcon={<UploadCloud size={16} />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImporting}
                    >
                      Subir Archivo
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {parsedTemplates && (
                      <span className="text-sm text-accent font-medium">
                        {parsedTemplates.length} plantilla{parsedTemplates.length !== 1 ? 's' : ''} listas
                      </span>
                    )}
                    <Button 
                      onClick={handleImport}
                      disabled={!parsedTemplates || isImporting}
                      loading={isImporting}
                    >
                      {isImporting ? 'Importando...' : 'Importar'}
                    </Button>
                  </div>
                </div>
                
                {/* Error Message */}
                {error && (
                  <div className="flex items-start gap-3 p-3 text-sm text-red-500 bg-red-500/10 rounded-lg border border-red-500/20">
                    <AlertTriangle className="shrink-0 w-5 h-5 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}
              </div>
            </CardBody>
          </>
        )}
        
        {/* Input oculto para archivos */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".json"
          className="hidden"
          disabled={isImporting}
        />
      </Card>
    </div>
  );
}
