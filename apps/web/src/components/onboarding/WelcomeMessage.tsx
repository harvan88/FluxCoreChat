/**
 * FC-840: WelcomeMessage
 * FC-841: FluxiAvatar
 * FC-843: FirstTimeExperience
 * Componentes de experiencia de bienvenida para nuevos usuarios
 */

import { useState, useEffect } from 'react';
import {
  Sparkles,
  MessageSquare,
  Settings,
  Users,
  Puzzle,
  ArrowRight,
  X,
} from 'lucide-react';
import { Button, Card } from '../ui';

// ============================================================================
// FC-841: FluxiAvatar
// ============================================================================

interface FluxiAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-lg',
  lg: 'w-16 h-16 text-2xl',
  xl: 'w-24 h-24 text-4xl',
};

export function FluxiAvatar({ size = 'md', animated = false }: FluxiAvatarProps) {
  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full bg-gradient-to-br from-accent to-purple-600
        flex items-center justify-center text-inverse font-bold
        shadow-lg shadow-accent/20
        ${animated ? 'animate-pulse' : ''}
      `}
    >
      <Sparkles className={size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'} />
    </div>
  );
}

// ============================================================================
// FC-840: WelcomeMessage
// ============================================================================

interface WelcomeMessageProps {
  userName?: string;
  onDismiss?: () => void;
  onAction?: (action: string) => void;
}

export function WelcomeMessage({ userName, onDismiss, onAction }: WelcomeMessageProps) {
  return (
    <div className="flex gap-3 p-4">
      <FluxiAvatar size="md" />
      <div className="flex-1 min-w-0">
        <div className="bg-elevated rounded-2xl rounded-tl-sm p-4 shadow-sm">
          <p className="text-primary">
            ¡Hola{userName ? `, ${userName}` : ''}! 👋
          </p>
          <p className="text-secondary mt-2">
            Soy <strong className="text-accent">Fluxi</strong>, tu asistente virtual de FluxCore. 
            Estoy aquí para ayudarte a sacar el máximo provecho de tu experiencia.
          </p>
          <p className="text-secondary mt-2">
            ¿Qué te gustaría hacer?
          </p>
          
          {/* Quick Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <QuickActionButton
              icon={<Settings size={14} />}
              label="Configurar mi perfil"
              onClick={() => onAction?.('profile')}
            />
            <QuickActionButton
              icon={<Users size={14} />}
              label="Invitar colaboradores"
              onClick={() => onAction?.('invite')}
            />
            <QuickActionButton
              icon={<Puzzle size={14} />}
              label="Ver extensiones"
              onClick={() => onAction?.('extensions')}
            />
          </div>
        </div>
        
        <div className="mt-1 text-xs text-muted flex items-center gap-1">
          <Sparkles size={10} />
          <span>Fluxi • Asistente de FluxCore</span>
        </div>
      </div>
      
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 text-muted hover:text-primary self-start"
          title="Cerrar"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function QuickActionButton({ icon, label, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-default rounded-full text-sm text-secondary hover:text-primary hover:border-accent transition-colors"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// FC-843: FirstTimeExperience
// ============================================================================

interface FirstTimeExperienceProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function FirstTimeExperience({ onComplete, onSkip }: FirstTimeExperienceProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: '¡Bienvenido a FluxCore! 🎉',
      description: 'Tu nuevo centro de comunicaciones inteligente. Vamos a configurar tu espacio de trabajo.',
      icon: <Sparkles className="w-8 h-8" />,
    },
    {
      title: 'Chats unificados',
      description: 'Conecta todos tus canales de comunicación en un solo lugar: WhatsApp, email, y más.',
      icon: <MessageSquare className="w-8 h-8" />,
    },
    {
      title: 'Colabora en equipo',
      description: 'Invita a tu equipo y asigna permisos específicos para cada miembro.',
      icon: <Users className="w-8 h-8" />,
    },
    {
      title: 'Extensiones inteligentes',
      description: 'Potencia tu flujo de trabajo con IA y extensiones personalizadas.',
      icon: <Puzzle className="w-8 h-8" />,
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 text-center">
        {/* Progress */}
        <div className="flex justify-center gap-1.5 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === step ? 'bg-accent' : index < step ? 'bg-accent/50' : 'bg-elevated'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 bg-accent/10 rounded-full flex items-center justify-center text-accent">
          {currentStep.icon}
        </div>

        {/* Content */}
        <h2 className="text-xl font-bold text-primary mb-2">
          {currentStep.title}
        </h2>
        <p className="text-secondary mb-6">
          {currentStep.description}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          {onSkip && step === 0 && (
            <Button variant="ghost" onClick={onSkip} className="flex-1">
              Omitir
            </Button>
          )}
          <Button variant="primary" onClick={handleNext} className="flex-1">
            {isLastStep ? (
              '¡Comenzar!'
            ) : (
              <>
                Siguiente
                <ArrowRight size={16} className="ml-1.5" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// Hook: useFirstTimeExperience
// ============================================================================

const FIRST_TIME_KEY = 'fluxcore_first_time';

export function useFirstTimeExperience() {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(FIRST_TIME_KEY);
    setIsFirstTime(!hasSeenWelcome);
    setIsLoading(false);
  }, []);

  const markAsCompleted = () => {
    localStorage.setItem(FIRST_TIME_KEY, 'true');
    setIsFirstTime(false);
  };

  const reset = () => {
    localStorage.removeItem(FIRST_TIME_KEY);
    setIsFirstTime(true);
  };

  return {
    isFirstTime,
    isLoading,
    markAsCompleted,
    reset,
  };
}
