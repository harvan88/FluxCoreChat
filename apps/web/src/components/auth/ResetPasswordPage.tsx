import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, Check, Lock } from 'lucide-react';
import { api } from '../../services/api';
import { Button, Input, Card } from '../ui';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect to login if no token
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-error/10 rounded-full">
              <Lock className="w-6 h-6 text-error" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-primary mb-2">Token inválido</h2>
          <p className="text-secondary mb-6">
            El enlace para restablecer la contraseña no es válido o ha expirado.
          </p>
          <Button variant="primary" onClick={() => navigate('/login')} className="w-full">
            Volver al inicio de sesión
          </Button>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.resetPassword(token, password);
      
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.error || 'Error al restablecer la contraseña');
      }
    } catch (err: any) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-success/10 rounded-full">
              <Check className="w-6 h-6 text-success" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-primary mb-2">¡Contraseña restablecida!</h2>
          <p className="text-secondary mb-6">
            Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
          <Button variant="primary" onClick={() => navigate('/login')} className="w-full">
            Iniciar sesión
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Nueva contraseña</h1>
          <p className="text-secondary mt-2">Introduce tu nueva contraseña</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Contraseña</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pr-10"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">Confirmar contraseña</label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              className="w-full"
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Restablecer contraseña'
            )}
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-secondary hover:text-primary flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft size={14} />
              Volver al inicio de sesión
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
