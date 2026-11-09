import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { api, ApiAuditLog } from '../lib/api-client.ts';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getAuditLogs(50);
      setLogs(res.logs);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar registos de auditoria.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Segurança</span>
            <span aria-hidden="true">·</span>
            <span>Histórico Forense</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-blue-400">Triggers de Imutabilidade Ativos</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Auditoria e Segurança da Conta
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registos imutáveis de ações e eventos sensíveis da sua conta. Nenhuma palavra-passe ou token é gravada.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Atualizar Registos</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Tabela de Auditoria com Números Tabulares */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-medium uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Data e Hora (UTC)</th>
                <th className="py-3 px-4">Ação / Evento</th>
                <th className="py-3 px-4">Recurso</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Endereço IP</th>
                <th className="py-3 px-4">Detalhes Sanitizados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {logs.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    Nenhum registo de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  let formattedDetails = '';
                  try {
                    if (log.details_json) {
                      const parsed = JSON.parse(log.details_json);
                      formattedDetails = Object.entries(parsed)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ');
                    }
                  } catch {
                    formattedDetails = log.details_json || '';
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 tabular-nums text-slate-400 whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19) : '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {log.resource_type}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.status === 'success' ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-sans">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Sucesso
                          </span>
                        ) : (
                          <span className="text-red-400 flex items-center gap-1 font-sans">
                            <XCircle className="h-3.5 w-3.5" /> Falha
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-slate-400 whitespace-nowrap">
                        {log.ip_address || 'local'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate font-sans text-xs">
                        {formattedDetails || 'Nenhum detalhe adicional'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Garantias de Segurança */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 pt-2">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 flex items-start gap-3">
          <Lock className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-slate-200 mb-1">Proteção Contra Vazamentos</div>
            <p className="text-[11px] leading-relaxed">
              O serviço de auditoria executa um filtro profundo que expurga preventivamente chaves sensíveis como palavras-passe, segredos ou tokens de sessão.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 flex items-start gap-3">
          <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-slate-200 mb-1">Imutabilidade em Nível de Base de Dados</div>
            <p className="text-[11px] leading-relaxed">
              Dois triggers SQL na tabela <code className="text-blue-300 font-mono">audit_logs</code> abortam qualquer tentativa de <code className="text-blue-300 font-mono">UPDATE</code> ou <code className="text-blue-300 font-mono">DELETE</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
