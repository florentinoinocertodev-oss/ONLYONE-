# RELATÓRIO TÉCNICO DE AUDITORIA E PROTECÇÃO — ONLYONE_R0_001

**Projecto:** ONLYONE  
**Fase:** FASE 0 — Fundação Técnica  
**Bloco:** R0 — Segurança e Integridade do Repositório  
**Repositório Remoto:** `https://github.com/florentinoinocertodev-oss/ONLYONE-.git` (Público)  
**Data e Hora de Execução:** 2026-11-09T01:48:00Z  
**Responsável Operacional:** Gemini — Agente Executor  
**Norma de Governação:** ONLYONE_ENGINEERING_STANDARD_001  
**Estado da Tarefa:** **PREPARAÇÃO CORRECTIVA CONCLUÍDA — AGUARDA AUTORIZAÇÃO PARA LIMPEZA DE HISTÓRICO**  

---

## 1. INVENTÁRIO DE FICHEIROS E ANÁLISE DE RASTREIO GIT

Foi inspecionada a totalidade do repositório remoto público e da cópia de trabalho local para identificação de ficheiros de dados SQLite, ficheiros de ambiente, chaves e credenciais.

### 1.1. Ficheiros SQLite Detectados no Tracking Git

| Caminho no Repositório | Tamanho (Bytes) | SHA-256 Actual (Integridade Local) | Blob ID Git (Commit `ff6cd13`) | Classificação de Risco |
| :--- | :--- | :--- | :--- | :--- |
| `data/onlyone.db` | 4,096 bytes (4.0 KiB) | `97e8d54f8a7255106f66cf1b213c4a4d7b558d21310b1c2bfedc3d0d526dddda` | `cc04c103cdf5416b37dcbcd114b399f735eadcdf` | **P0 — Crítico** (Base operacional exposta publicamente) |
| `data/onlyone.db-shm` | 32,768 bytes (32 KiB) | `315029b0a35f04b39bcf02f3407d169171e32724cfd56be8e2f8c1cd64a6738c` | `fe9ac2845eca6fe6da8a63cd096d9cf9e24ece10` | **P0 — Crítico** (Ficheiro de memória partilhada WAL) |
| `data/onlyone.db-wal` | 148,352 bytes (145 KiB) | `abee42bad100a704465a2a187af8d60d8d82848bedc2d1b0280f93ae2dd10b7f` | `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` | **P0 — Crítico** (Write-Ahead Log com transacções de escrita) |
| `data/test-onlyone.db` | 139,264 bytes (136 KiB) | `5cee2659f3b839ace878ef4333c48c1191cc15ff6673247d4c4440c878efef68` | `46ea57bd7249ecfa6ddd3c74b95e3e0abd97395f` | **P0 — Crítico** (Base de testes com dados sintéticos gerados) |

### 1.2. Ficheiros de Configuração e Ambiente
- `.env.example`: Presente e rastreado no Git. Contém apenas chaves e valores modelo genéricos (`default_session_secret...`). Nenhum segredo de produção detectado.
- Ficheiros `.env`, `.env.local`, `.env.production`: **Ausentes**. Confirmado que não existem ficheiros de segredos reais gravados no sistema de ficheiros nem rastreados no Git.
- Ficheiros de chave (`*.pem`, `*.key`, `*.cert`): **Ausentes**.

### 1.3. Ramos e Etiquetas Git Existentes
- **Ramos Remotos:** `refs/heads/main` (único ramo existente no repositório).
- **Etiquetas (Tags):** Nenhuma etiqueta registada.
- **Histórico Linear:** Apenas 2 commits registados desde a génese do repositório:
  1. `0fe2fa21a37a7285f0eab5899f30faf4ee012153` — `Initial commit` (apenas `README.md`).
  2. `ff6cd134f5f4a0309663013b3f1a2fdafb9929df` — `feat: initialize OnlyOne platform foundation` (introduziu os 4 ficheiros de base de dados).

---

## 2. RISCOS IDENTIFICADOS

1. **Exposição em Repositório Público no GitHub:**
   - O repositório `florentinoinocertodev-oss/ONLYONE-` encontra-se configurado como público.
   - Qualquer utilizador da Internet com acesso ao repositório pode descarregar o commit `ff6cd13` e inspecionar a estrutura binária da base de dados `test-onlyone.db`.
2. **Dados Presentes na Base de Testes (`test-onlyone.db`):**
   - Embora os dados tenham sido gerados automaticamente pelo executor de testes do Gemini na Fase 0 (não contendo utilizadores reais ou senhas de pessoas físicas), a permanência de registos de sessões, perfis e auditoria num repositório público constitui uma violação de boas práticas de segurança, telemetria indevida e precedente de risco.
3. **Persistência nos Servidores do GitHub:**
   - Remover os ficheiros com um simples novo commit (`git rm --cached`) limpa o estado actual da branch `main`, mas **mantém os ficheiros permanentemente acessíveis no histórico do commit anterior (`ff6cd13`)** através da interface web do GitHub, API e clones que descarreguem os objectos compactados (packfiles).
   - A eliminação definitiva exige a reescrita do histórico do Git e actualização forçada controlada.

---

## 3. EVIDÊNCIAS DA PRESERVAÇÃO LOCAL

Em estrito cumprimento da Etapa B, foi criada uma cópia de segurança dedicada fora do directório de trabalho da aplicação, preservando integralmente os artefactos para efeitos de evidência forense e auditoria técnica.

- **Directório Seguro de Preservação:** `/tmp/onlyone_investigation_backup_20261108`
- **Permissões do Directório:** `0700` (`drwx------` restrito ao utilizador de execução).
- **Permissões dos Ficheiros:** `0600` (`-rw-------` leitura/escrita restrita).
- **Isolamento:** Ficheiros localizados fora da raiz do projecto, sem qualquer índice Git associado e sem ligação a serviços externos.

### 3.1. Prova Criptográfica de Correspondência Integral (Hashes SHA-256)

```text
========================================================================================================
FICHEIRO ORIGINAL (LOCAL)                      HASH SHA-256
========================================================================================================
/app/applet/data/onlyone.db                    97e8d54f8a7255106f66cf1b213c4a4d7b558d21310b1c2bfedc3d0d526dddda
/app/applet/data/onlyone.db-shm                315029b0a35f04b39bcf02f3407d169171e32724cfd56be8e2f8c1cd64a6738c
/app/applet/data/onlyone.db-wal                abee42bad100a704465a2a187af8d60d8d82848bedc2d1b0280f93ae2dd10b7f
/app/applet/data/test-onlyone.db               5cee2659f3b839ace878ef4333c48c1191cc15ff6673247d4c4440c878efef68

========================================================================================================
CÓPIA DE PRESERVAÇÃO (BACKUP)                  HASH SHA-256
========================================================================================================
/tmp/.../onlyone.db                            97e8d54f8a7255106f66cf1b213c4a4d7b558d21310b1c2bfedc3d0d526dddda
/tmp/.../onlyone.db-shm                        315029b0a35f04b39bcf02f3407d169171e32724cfd56be8e2f8c1cd64a6738c
/tmp/.../onlyone.db-wal                        abee42bad100a704465a2a187af8d60d8d82848bedc2d1b0280f93ae2dd10b7f
/tmp/.../test-onlyone.db                       5cee2659f3b839ace878ef4333c48c1191cc15ff6673247d4c4440c878efef68
========================================================================================================
RESULTADO DA VERIFICAÇÃO: 100% IDENTIDADE BINÁRIA COMPROVADA. ZERO DADOS ALTERADOS.
```

---

## 4. FICHEIROS ALTERADOS NO WORKSPACE

Para cessar o rastreio automático e assegurar que novos comandos Git não voltem a incluir bases de dados, foram executadas cirurgicamente as seguintes operações locais:

1. **`.gitignore` (Modificado):** Adicionadas regras formais e abrangentes de exclusão para SQLite (`*.db`, `*.sqlite`, `*-wal`, `*-shm`, `*-journal`), backups e ficheiros de segredos.
2. **`data/.gitkeep` (Criado):** Adicionado para preservar a estrutura de pastas `data/` em clones limpos, permitindo que a aplicação encontre o directório sem rastrear bases de dados.
3. **`data/*` (Retirados do Índice Git Staging):** Os 4 ficheiros foram desindexados com `git rm --cached`, mantendo-se **intactos e funcionais no sistema de ficheiros local**.

---

## 5. DIFF DAS ALTERAÇÕES NÃO SENSÍVEIS

Abaixo apresenta-se o `git diff --cached` exato preparado no staging local:

```diff
diff --git a/.gitignore b/.gitignore
index 5a86d2a..276e421 100644
--- a/.gitignore
+++ b/.gitignore
@@ -4,5 +4,32 @@ dist/
 coverage/
 .DS_Store
 *.log
+
+# Environment files and credentials
 .env*
 !.env.example
+*.pem
+*.key
+*.cert
+
+# SQLite databases, journals, and WAL/SHM artifacts
+data/*.db
+data/*.sqlite
+data/*.sqlite3
+data/*.db-wal
+data/*.db-shm
+data/*.db-journal
+*.db
+*.sqlite
+*.sqlite3
+*-wal
+*-shm
+*-journal
+!data/.gitkeep
+
+# Database backups, dumps, and archives
+backups/
+*.dump
+*.bak
+*.sql.gz
+
diff --git a/data/.gitkeep b/data/.gitkeep
new file mode 100644
index 0000000..e69de29
diff --git a/data/onlyone.db b/data/onlyone.db
deleted file mode 100644
index cc04c10..0000000
Binary files a/data/onlyone.db and /dev/null differ
diff --git a/data/onlyone.db-shm b/data/onlyone.db-shm
deleted file mode 100644
index fe9ac28..0000000
Binary files a/data/onlyone.db-shm and /dev/null differ
diff --git a/data/onlyone.db-wal b/data/onlyone.db-wal
deleted file mode 100644
index e69de29..0000000
diff --git a/data/test-onlyone.db b/data/test-onlyone.db
deleted file mode 100644
index 46ea57b..0000000
Binary files a/data/test-onlyone.db and /dev/null differ
```

---

## 6. ESTADO DO TRACKING GIT (VERIFICAÇÃO ETAPA E)

Execução de `git status --ignored`:

```text
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	modified:   .gitignore
	new file:   data/.gitkeep
	deleted:    data/onlyone.db
	deleted:    data/onlyone.db-shm
	deleted:    data/onlyone.db-wal
	deleted:    data/test-onlyone.db

Ignored files:
  (use "git add -f <file>..." to include in what will be committed)
	data/onlyone.db
	data/onlyone.db-shm
	data/onlyone.db-wal
	data/test-onlyone.db
	dist/
	node_modules/
```

**Resultado:**
- Os 4 ficheiros de base de dados deixaram de estar rastreados para futuros commits.
- O `.gitignore` reconhece-os agora ativamente como **ficheiros ignorados** (`Ignored files`).
- Os ficheiros originais permanecem no disco local com todos os seus dados preservados.

---

## 7. PLANO DE LIMPEZA DEFINITIVA DO HISTÓRICO PÚBLICO

Conforme estabelecido pela Regra 10: *"Não afirmar que o histórico foi limpo se apenas os ficheiros foram retirados do último commit"*. O histórico do commit `ff6cd134f5f4a0309663013b3f1a2fdafb9929df` ainda retém as cópias binárias nos servidores do GitHub.

Apresenta-se o plano formal para expurgação definitiva através da ferramenta recomendada pelo Git (`git-filter-repo`):

### 7.1. Procedimento Técnico Recomendado

1. **Pré-requisito:** Instalação da ferramenta standard de reescrita:
   ```bash
   pip install git-filter-repo
   ```
2. **Execução de Purga dos Ficheiros de Dados no Histórico:**
   ```bash
   git filter-repo --invert-paths \
     --path data/onlyone.db \
     --path data/onlyone.db-shm \
     --path data/onlyone.db-wal \
     --path data/test-onlyone.db \
     --force
   ```
3. **Efeito Criptográfico:**
   - O commit `ff6cd13` é rescrito na íntegra, gerando um novo SHA-1 de commit isento de quaisquer referências aos ficheiros `data/*`.
   - O commit inicial `0fe2fa2` permanece intacto.
4. **Reassociação de Remoto:** O `git-filter-repo` remove as configurações de `origin` por precaução de segurança. A reassociação deve ser executada:
   ```bash
   git remote add origin https://github.com/florentinoinocertodev-oss/ONLYONE-.git
   ```
5. **Atualização Forçada Autorizada do Repositório Remoto:**
   ```bash
   git push origin main --force-with-lease
   ```

### 7.2. Consequências e Impacto de Reescrita de Histórico
- **Clones Locais Existentes:** Qualquer desenvolvedor que tenha clonado o repositório (`~/Projects/ONLYONE`) ficará com histórico divergente e deverá executar `git fetch origin && git reset --hard origin/main`.
- **Forks no GitHub:** Se existirem forks públicos, os forks manterão o commit antigo até serem sincronizados. Recomenda-se confirmar no GitHub se existem forks ativos (atualmente, tratando-se de projeto próprio recente, o risco é reduzido).
- **Caches de Objetos do GitHub:** Mesmo após `push --force-with-lease`, commits antigos podem permanecer temporariamente em cache interna no GitHub até a coleta de lixo (*garbage collection*) ou até um pedido de purge ao suporte do GitHub para remoção de referências órfãs.

---

## 8. RISCOS RESIDUAIS DECLARADOS

1. **Janela de Acesso Histórico no GitHub:** Até que o plano da Secção 7 seja autorizado e executado com `push --force`, os ficheiros permanecem transferíveis a partir do commit público `ff6cd13`.
2. **Backups e Cópias Não Rastreadas:** O agente confirmou que não existem bases em subpastas ou commits secundários, mas a integridade total do histórico depende da reescrita imediata do commit `ff6cd13`.

---

## 9. TESTES E VALIDAÇÕES REALIZADOS NESTA EXECUÇÃO

Em cumprimento estrito das regras do mandato R0:
- **Testes de Software / Aplicação:** **ZERO testes executados** (conforme Regra 4: *"Não executar testes"*).
- **Validações Criptográficas de Integridade:**
  - `sha256sum` dos 4 ficheiros originais comparado com os 4 ficheiros de backup (100% de correspondência).
  - `git ls-files` inspecionado antes e depois da operação de desindexação.
  - `git status --ignored` validado, confirmando exclusão efetiva.
- **Operações de Rede Git:** **ZERO comandos push ou force push executados** (conforme Regras 6 e 7).

---

## 10. AÇÕES QUE AGUARDAM AUTORIZAÇÃO EXPLÍCITA DO UTILIZADOR

As seguintes ações dependem de ordem formal e aprovação humana:
1. **Autorização para Executar a Limpeza de Histórico (`git-filter-repo`):** Purga física dos blobs das bases de dados no histórico do Git.
2. **Autorização para Efetuar o `git push --force-with-lease`:** Atualização forçada do ramo `main` no GitHub.
3. **Validação Final de Segurança do Repositório Público:** Auditoria pós-limpeza pelo Arquiteto Independente (ChatGPT).

---

*Relatório emitido pelo Agente Executor (Gemini). O repositório local encontra-se protegido contra novas inclusões, as bases de dados locais encontram-se preservadas a 100% e nenhum push foi efetuado.*
