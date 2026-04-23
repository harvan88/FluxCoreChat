import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { Textarea } from '../../ui/Input';
import { Bot } from 'lucide-react';

interface FluxCoreTemplateConfigProps {
    authorizeForAI: boolean;
    onAuthorizeChange: (authorized: boolean) => void;
    aiUsageInstructions: string;
    onInstructionsChange: (instructions: string) => void;
}

export function FluxCoreTemplateConfig({
    authorizeForAI,
    onAuthorizeChange,
    aiUsageInstructions,
    onInstructionsChange
}: FluxCoreTemplateConfigProps) {
    return (
        <CollapsibleSection
            title="Inteligencia Artificial"
            icon={<Bot size={16} />}
            isCustomized={authorizeForAI}
            onToggleCustomized={onAuthorizeChange}
            showToggle={true}
        >
            <div className="space-y-4">
                <p className="text-xs text-muted">
                    Habilite esta opción para que FluxCore pueda indexar y utilizar esta plantilla automáticamente mediante búsqueda semántica y delegación operativa.
                </p>

                <Textarea
                    label="Instrucciones de Uso"
                    value={aiUsageInstructions}
                    onChange={(e) => onInstructionsChange(e.target.value)}
                    placeholder="Ej: Usar esta plantilla solo cuando el cliente pregunte precios mayoristas."
                    rows={4}
                    helperText="Indique a la IA en qué contextos debe proponer o enviar esta plantilla."
                    className="bg-surface"
                />
            </div>
        </CollapsibleSection>
    );
}
