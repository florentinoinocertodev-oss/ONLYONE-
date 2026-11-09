import React from 'react';
import { Shield, User, LogOut, ArrowRight } from 'lucide-react';
import { ApiUser, ApiProfile } from '../lib/api-client.ts';

interface TopBarProps {
  user: ApiUser | null;
  profile: ApiProfile | null;
  activeTab: 'workspace' | 'profile' | 'audit' | 'foundation';
  setActiveTab: (tab: 'workspace' | 'profile' | 'audit' | 'foundation') => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  profile,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zona 1: Wordmark único */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('workspace')}
            className="flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
              1
            </div>
            <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
              OnlyOne
            </span>
          </button>
        </div>

        {/* Zona 2: Links de navegação em linha única */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeTab === 'workspace'
                ? 'text-white border-blue-500'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Workspace Pessoal
          </button>

          {user && (
            <>
              <button
                onClick={() => setActiveTab('profile')}
                className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
                  activeTab === 'profile'
                    ? 'text-white border-blue-500'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                Perfil
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
                  activeTab === 'audit'
                    ? 'text-white border-blue-500'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                Auditoria & Segurança
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('foundation')}
            className={`transition-colors whitespace-nowrap py-1 border-b-2 ${
              activeTab === 'foundation'
                ? 'text-white border-blue-500'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Fundação Fase 0
          </button>
        </nav>

        {/* Zona 3: Ação primária */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('profile')}
                className="hidden sm:flex items-center gap-2 text-xs text-slate-300 hover:text-white transition-colors bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5"
              >
                <User className="h-3.5 w-3.5 text-blue-400" />
                <span className="max-w-[120px] truncate font-medium">
                  {profile?.displayName || user.email}
                </span>
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                title="Terminar sessão com revogação no servidor"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sair</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-transparent hover:bg-slate-900 rounded-lg transition-colors whitespace-nowrap"
              >
                Entrar
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm whitespace-nowrap"
              >
                <span>Criar Conta</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
