import React, { useState } from 'react';
import { X, Lock, Mail, User, AlertCircle, Loader2 } from 'lucide-react';
import { api, ApiUser, ApiProfile, ApiWorkspace } from '../lib/api-client.ts';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (data: { user: ApiUser; profile: ApiProfile; workspace: ApiWorkspace }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!displayName.trim() || displayName.trim().length < 2) {
          throw new Error('O nome de exibição deve ter pelo menos 2 caracteres.');
        }
        if (password.length < 8) {
          throw new Error('A palavra-passe deve conter pelo menos 8 caracteres.');
        }

        const data = await api.register({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
        });
        onSuccess(data);
        onClose();
      } else {
        const data = await api.login({
          email: email.trim(),
          password,
        });
        onSuccess(data);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Falha na autenticação. Verifique os dados inseridos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Fechar modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Alternador de Modo */}
        <div className="flex border-b border-slate-800 pb-3 mb-6">
          <button
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`pb-2 text-sm font-semibold transition-colors mr-6 border-b-2 ${
              mode === 'login'
                ? 'text-blue-400 border-blue-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Iniciar Sessão
          </button>
          <button
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${
              mode === 'register'
                ? 'text-blue-400 border-blue-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Criar Nova Conta
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nome de Exibição
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu Nome ou Pseudónimo"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Endereço de E-mail
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@dominio.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Palavra-passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-500"
              />
            </div>
            {mode === 'register' && (
              <p className="mt-1 text-[11px] text-slate-500">
                Protegido por scrypt assíncrono (N=16384, r=8, p=1). Tokens de sessão com hash SHA-256.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processando...</span>
              </>
            ) : mode === 'register' ? (
              'Criar Conta Segura'
            ) : (
              'Entrar no OnlyOne'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
