import { ChevronRight, Shield, CheckCircle } from 'lucide-react';

interface KernelSessionsSectionProps {
  onBack: () => void;
}

export function KernelSessionsSection({ onBack }: KernelSessionsSectionProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <button
        onClick={onBack}
        className="w-full p-4 flex items-center gap-2 border-b border-subtle text-primary hover:bg-hover transition-colors"
      >
        <ChevronRight size={20} className="rotate-180" />
        <span className="font-medium">Estado del Kernel</span>
      </button>

      <div className="p-8 text-center space-y-6">
        <div className="space-y-4">
          <Shield className="mx-auto text-emerald-600" size={48} />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-primary">Kernel FluxCore</h2>
            <p className="text-muted">Sistema operativo en tiempo real</p>
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="text-emerald-600" size={20} />
            <div className="text-left">
              <p className="font-medium text-emerald-900">Estado: Activo</p>
              <p className="text-sm text-emerald-700">Procesando señales correctamente</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-surface border border-subtle rounded-lg">
              <p className="text-muted text-xs uppercase">Señales</p>
              <p className="text-lg font-semibold text-primary">238</p>
            </div>
            <div className="p-3 bg-surface border border-subtle rounded-lg">
              <p className="text-muted text-xs uppercase">Projectors</p>
              <p className="text-lg font-semibold text-primary">4</p>
            </div>
          </div>

          <div className="text-xs text-muted space-y-1">
            <p>• Kernel RFC-0001 funcionando correctamente</p>
            <p>• Projectors procesando señales en tiempo real</p>
            <p>• Outbox certificando mensajes</p>
            <p>• Cognition Queue activa</p>
          </div>
        </div>
      </div>
    </div>
  );
}
