import React from 'react';
import { Database, ShieldCheck, Key, Lock, Layers, Cpu, Server, Check } from 'lucide-react';

export const FoundationInfo: React.FC = () => {
  const pillars = [
    {
      title: '1. Registo Transacional Atómico',
      desc: 'Criação transacional de utilizador, perfil, workspace pessoal e sessão num único bloco db.transaction() com rollback integral.',
      icon: Layers,
    },
    {
      title: '2. Autenticação e Hashing Scrypt',
      desc: 'crypto.scrypt assíncrono (N=16384, r=8, p=1) com salt criptográfico de 16 bytes e comparação por crypto.timingSafeEqual.',
      icon: Key,
    },
    {
      title: '3. Sessões com Hashes SHA-256',
      desc: 'O cliente recebe um token de 256 bits via cookie HttpOnly (SameSite=Strict; Secure). A base de dados persiste apenas o hash SHA-256.',
      icon: Lock,
    },
    {
      title: '4. Proteção CSRF Ativa',
      desc: 'Cabeçalho customizado obrigatório X-OnlyOne-CSRF para todas as mutações, com validação de tokens e origens confiáveis.',
      icon: ShieldCheck,
    },
    {
      title: '5. Isolamento Estrito de Recursos',
      desc: 'Validação no serviço de domínio. Impossível para o utilizador A consultar, alterar ou eliminar workspaces do utilizador B (Zero IDOR).',
      icon: Server,
    },
    {
      title: '6. Base de Dados SQLite WAL Mode',
      desc: 'better-sqlite3 configurado com WAL mode, chaves estrangeiras ativadas (PRAGMA foreign_keys = ON) e busy_timeout = 5000.',
      icon: Database,
    },
    {
      title: '7. Migrações Versionadas com Checksum',
      desc: 'Runner transacional com tabela _migrations, cálculo de hash SHA-256 por ficheiro SQL e integridade estrita.',
      icon: Cpu,
    },
    {
      title: '8. Auditoria Sanitizada e Imutável',
      desc: 'Filtro que expurga senhas e segredos com triggers SQL que bloqueiam UPDATE e DELETE na tabela audit_logs.',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div className="pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <span>OnlyOne</span>
          <span aria-hidden="true">·</span>
          <span>Arquitetura</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-emerald-400">FASE 0 CONCLUÍDA</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Fundação Técnica de Engenharia
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-3xl leading-relaxed">
          O OnlyOne não simula funcionalidades. Esta Fundação da Fase 0 constrói o monólito modular robusto em Node.js, Express e TypeScript com base relacional persistente, garantias de concorrência e conformidade rigorosa com o documento ARCH-005.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div
              key={idx}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex items-start gap-4 hover:border-slate-700 transition-colors"
            >
              <div className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-800/40 text-blue-400 shrink-0 mt-0.5">
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  {pillar.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Limites de Escopo Claros */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">
          Limites Explícitos de Escopo (Fase 0)
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Para garantir rigor e estabilidade, os seguintes componentes pertencem a fases posteriores do roadmap:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <Check className="h-3.5 w-3.5 text-slate-500" />
            <span>Google Drive (FASE 2)</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <Check className="h-3.5 w-3.5 text-slate-500" />
            <span>OAuth 3rd-Party (Fases Seguintes)</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <Check className="h-3.5 w-3.5 text-slate-500" />
            <span>Assistente Only & Voz (FASE 3)</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <Check className="h-3.5 w-3.5 text-slate-500" />
            <span>Pesquisa Universal (FASE 3)</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <Check className="h-3.5 w-3.5 text-slate-500" />
            <span>Organizações e Equipas (Futuro)</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <Check className="h-3.5 w-3.5 text-slate-500" />
            <span>Billing & Pagamentos (Futuro)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
