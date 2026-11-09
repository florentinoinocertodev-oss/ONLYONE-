import React, { useState, useEffect } from 'react';
import { User, Mail, Globe, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api, ApiUser, ApiProfile } from '../lib/api-client.ts';

interface ProfileViewProps {
  user: ApiUser;
  profile: ApiProfile;
  onProfileUpdated: (updated: ApiProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  profile,
  onProfileUpdated,
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [locale, setLocale] = useState(profile.locale || 'pt-PT');
  const [timezone, setTimezone] = useState(profile.timezone || 'UTC');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile.displayName || '');
    setBio(profile.bio || '');
    setLocale(profile.locale || 'pt-PT');
    setTimezone(profile.timezone || 'UTC');
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (displayName.trim().length < 2) {
        throw new Error('O nome de exibição deve ter pelo menos 2 caracteres.');
      }

      const res = await api.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        locale,
        timezone,
      });

      onProfileUpdated(res.profile);
      setSuccessMessage('Perfil atualizado com sucesso e auditado.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao atualizar perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      <div className="pb-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Perfil Individual
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Gerencie as suas informações de identidade, preferências regionais e dados de apresentação no OnlyOne.
        </p>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/60 border border-red-800/60 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* E-mail (Apenas Leitura) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Endereço de E-mail (Identificador Primário)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950/60 border border-slate-800/80 rounded-lg text-slate-400 cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Imutável na Fase 0 para garantia de integridade de identidade.
            </p>
          </div>

          {/* Nome de Exibição */}
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
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Idioma / Região */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Região e Idioma (Locale)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Globe className="h-4 w-4" />
              </div>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="pt-PT">Português (Portugal) · pt-PT</option>
                <option value="pt-BR">Português (Brasil) · pt-BR</option>
                <option value="en-US">English (United States) · en-US</option>
                <option value="es-ES">Español (España) · es-ES</option>
              </select>
            </div>
          </div>

          {/* Fuso Horário */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Fuso Horário (Timezone)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Clock className="h-4 w-4" />
              </div>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
              >
                <option value="UTC">UTC (Universal Coordinated Time)</option>
                <option value="Europe/Lisbon">Europe/Lisbon (WET/WEST)</option>
                <option value="America/Sao_Paulo">America/Sao_Paulo (BRT)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Biografia / Descrição */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Biografia Pessoal (Opcional)
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Breve descrição ou notas sobre as suas preferências..."
            className="w-full p-3 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none placeholder-slate-600"
          />
          <div className="flex justify-between text-[11px] text-slate-500 mt-1">
            <span>Máximo 500 caracteres.</span>
            <span className="font-mono">{bio.length} / 500</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Guardar Alterações</span>
          </button>
        </div>
      </form>
    </div>
  );
};
