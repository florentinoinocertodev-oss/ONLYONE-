import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { WorkspaceView } from './components/WorkspaceView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { AuditView } from './components/AuditView.tsx';
import { FoundationInfo } from './components/FoundationInfo.tsx';
import { api, ApiUser, ApiProfile, ApiWorkspace } from './lib/api-client.ts';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [workspace, setWorkspace] = useState<ApiWorkspace | null>(null);
  const [activeTab, setActiveTab] = useState<'workspace' | 'profile' | 'audit' | 'foundation'>('workspace');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Carregar sessão existente e token CSRF ao iniciar
  const checkSession = async () => {
    try {
      await api.getCsrfToken();
      const meData = await api.getMe();
      if (meData?.userId) {
        setUser({ id: meData.userId, email: meData.email, status: meData.status });
        setProfile(meData.profile);
        try {
          const ws = await api.getPersonalWorkspace();
          setWorkspace(ws);
        } catch {
          setWorkspace(null);
        }
      }
    } catch {
      setUser(null);
      setProfile(null);
      setWorkspace(null);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (data: { user: ApiUser; profile: ApiProfile; workspace: ApiWorkspace }) => {
    setUser(data.user);
    setProfile(data.profile);
    setWorkspace(data.workspace);
    setActiveTab('workspace');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignora falhas de rede no logout
    } finally {
      setUser(null);
      setProfile(null);
      setWorkspace(null);
      setActiveTab('workspace');
    }
  };

  const handleRefreshWorkspace = async () => {
    if (!user) return;
    try {
      const ws = await api.getPersonalWorkspace();
      setWorkspace(ws);
    } catch (err) {
      console.error(err);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-xs font-mono tracking-wider uppercase">Iniciando OnlyOne...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <TopBar
        user={user}
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {activeTab === 'workspace' && (
          <WorkspaceView
            user={user}
            profile={profile}
            workspace={workspace}
            onOpenAuth={handleOpenAuth}
            onRefreshWorkspace={handleRefreshWorkspace}
          />
        )}

        {activeTab === 'profile' && user && profile && (
          <ProfileView
            user={user}
            profile={profile}
            onProfileUpdated={(updated) => setProfile(updated)}
          />
        )}

        {activeTab === 'audit' && user && (
          <AuditView />
        )}

        {activeTab === 'foundation' && (
          <FoundationInfo />
        )}
      </main>

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">OnlyOne</span>
            <span aria-hidden="true">·</span>
            <span>FASE 0 — Fundação Técnica, Identidade, Segurança e Workspace Pessoal</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>SQLite WAL</span>
            <span aria-hidden="true">·</span>
            <span>Scrypt Async</span>
            <span aria-hidden="true">·</span>
            <span>SHA-256 Sessions</span>
            <span aria-hidden="true">·</span>
            <span>CSRF Guard</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
