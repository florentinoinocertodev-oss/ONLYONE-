import React, { useState } from 'react';
import { LayoutGrid, ShieldCheck, CheckCircle2, Lock, ArrowUpRight, Edit2, Save, X } from 'lucide-react';
import { ApiWorkspace, ApiUser, ApiProfile } from '../lib/api-client.ts';

interface WorkspaceViewProps {
  user: ApiUser | null;
  profile: ApiProfile | null;
  workspace: ApiWorkspace | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onRefreshWorkspace: () => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  user,
  profile,
  workspace,
  onOpenAuth,
  onRefreshWorkspace,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveName = async () => {
    if (!workspace) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/v1/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-onlyone-csrf': document.cookie
            .split('; ')
            .find(row => row.startsWith('onlyone_csrf='))
            ?.split('=')[1] || '',
        },
        credentials: 'include',
        body: JSON.stringify({ name: workspaceName }),
      });

      if (res.ok) {
        setIsEditing(false);
        setSaveSuccess(true);
        onRefreshWorkspace();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || !workspace) {
    return (
      <div className="py-12 px-4 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="inline-flex p-3 rounded-xl bg-blue-950/60 border border-blue-800/40 text-blue-400 mb-6">
            <LayoutGrid className="h-8 w-8" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
            Workspace Pessoal e Seguro
          </h2>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 mb-8 leading-relaxed">
            No OnlyOne, cada utilizador detém um ambiente pessoal isolado por desenho. Os seus dados e workspaces são protegidos por autorização estrita na camada de domínio e base de dados persistente.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onOpenAuth('register')}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
            >
              Criar Conta e Ativar Workspace
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="px-6 py-2.5 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
            >
              Já possuo conta
            </button>
          </div>

          {/* Destaques Técnicos da Fundação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left pt-8 border-t border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-1">
                <ShieldCheck className="h-4 w-4" />
                <span>Isolamento Comprovado</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Verificação de propriedade no serviço de domínio. Impossível consultar ou manipular workspaces de terceiros (prevenção de IDOR).
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span>Sessões Hasheadas</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Os tokens de sessão são mantidos apenas em hash SHA-256 na base de dados SQLite persistente, transportados por cookies HttpOnly.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-1">
                <Lock className="h-4 w-4" />
                <span>Auditoria Imutável</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Registo de acessos sanitizado com triggers SQL que impedem modificação ou eliminação posterior do histórico forense.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho do Workspace */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>OnlyOne</span>
            <span aria-hidden="true">·</span>
            <span>Ambiente Pessoal</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-emerald-400">Ativo</span>
          </div>

          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="px-3 py-1.5 text-lg font-bold bg-slate-950 border border-blue-500 rounded-lg text-white focus:outline-none"
              />
              <button
                onClick={handleSaveName}
                disabled={isSaving}
                className="p-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setWorkspaceName(workspace.name);
                }}
                className="p-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {workspace.name}
              </h1>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Editar nome do workspace"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-1">
            Proprietário: <span className="text-slate-200">{profile?.displayName || user.email}</span> · Papel:{' '}
            <span className="font-mono text-blue-400 uppercase">{workspace.role}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Guardado
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 font-mono">
            slug: {workspace.slug}
          </span>
        </div>
      </div>

      {/* Grid de Estado do Workspace e Isolamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Identificador Único</span>
            <Lock className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="text-sm font-mono text-white truncate" title={workspace.id}>
            {workspace.id}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            UUID v4 persistido na tabela workspaces.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Isolamento e Permissões</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-emerald-300">
            Propriedade Exclusiva (100%)
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Verificado por membership relacional com role owner.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Motor de Persistência</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-mono text-white">
            SQLite WAL Mode
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Transações ACID com chave estrangeira ativada.
          </p>
        </div>
      </div>

      {/* Card de Informação sobre Fases do Produto */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Estado da Fundação Técnica (Fase 0 Concluída)
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            PRD-001 / MVP-001
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          O seu workspace pessoal está totalmente ativo e isolado. As rotas de manipulação de dados validam a titularidade e rejeitam categoricamente qualquer acesso não autorizado. Conectores externos (como Google Drive) serão integrados na Fase 2 com autorização OAuth dedicada.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
            <span className="text-xs text-slate-400 block mb-1">Autenticação</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Cookies HttpOnly Ativos
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
            <span className="text-xs text-slate-400 block mb-1">Proteção CSRF</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Cabeçalho X-OnlyOne-CSRF
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
            <span className="text-xs text-slate-400 block mb-1">Criptografia</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Scrypt Assíncrono + SHA-256
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
            <span className="text-xs text-slate-400 block mb-1">Auditoria Forense</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Sanitizada e Imutável
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
