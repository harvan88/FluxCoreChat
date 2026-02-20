import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { Textarea } from '../../ui/Input';
import { Switch } from '../../ui/Switch';
import { Bot } from 'lucide-react';

interface FluxCoreTemplateConfigProps {
    authorizeForAI: boolean;
    onAuthorizeChange: (authorized: boolean) => void;
    allowAutomatedUse: boolean;
    onAllowAutomatedUseChange: (allowed: boolean) => void;
    aiUsageInstructions: string;
    onInstructionsChange: (instructions: string) => void;
}

export function FluxCoreTemplateConfig({
    authorizeForAI,
    onAuthorizeChange,
    allowAutomatedUse,
    onAllowAutomatedUseChange,
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
                    Active esta opción para que FluxCore pueda utilizar esta plantilla automáticamente.
                </p>

                <div className="flex items-center justify-between p-3 bg-surface border border-subtle rounded-lg">
                    <div className="text-sm font-medium text-primary">Habilitar delegación</div>
                    <Switch
                        checked={allowAutomatedUse}
                        onCheckedChange={onAllowAutomatedUseChange}
                    />
                </div>

                <Textarea
                    label="Instrucciones de Uso"
                    value={aiUsageInstructions}
                    onChange={(e) => onInstructionsChange(e.target.value)}
                    placeholder="Ej: Usar esta plantilla solo cuando el cliente pregunte precios mayoristas."
                    rows={4}
                    helperText="Estas instrucciones guían a la IA sobre cuándo invocar esta plantilla."
                    className="bg-surface"
                />
            </div>
        </CollapsibleSection>
    );
}
