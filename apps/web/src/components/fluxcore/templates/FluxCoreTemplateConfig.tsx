import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { Textarea } from '../../ui/Input';
import { Sparkles, Bot } from 'lucide-react';

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
                    Al activar esta opción, FluxCore podrá utilizar esta plantilla automáticamente cuando la intención del usuario coincida.
                </p>

                <Textarea
                    label="Instrucciones de Uso (Contexto)"
                    value={aiUsageInstructions}
                    onChange={(e) => onInstructionsChange(e.target.value)}
                    placeholder="Ej: Usar esta plantilla solo cuando el cliente pregunte precios mayoristas. Si es minorista, usar otra."
                    rows={4}
                    helperText="Estas instrucciones se inyectan en el prompt del sistema para guiar a la IA."
                    className="bg-surface"
                />
            </div>
        </CollapsibleSection>
    );
}
