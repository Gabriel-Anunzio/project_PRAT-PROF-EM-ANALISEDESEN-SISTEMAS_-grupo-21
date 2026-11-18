# NexoStock

**Sistema de Gestão de Estoque e Pedidos para Operações de E-commerce Multicanal**

Universidade Presbiteriana Mackenzie · Análise e Desenvolvimento de Sistemas · Grupo 21 · 2026

## Visão geral

O NexoStock é uma aplicação web desenvolvida para centralizar o catálogo de produtos e variantes, o controle de estoque multidepósito e o ciclo operacional de pedidos de venda em operações multicanal. O sistema mantém distinção estrita entre saldo físico, saldo reservado e saldo disponível, preservando trilha de auditoria e extrato de movimentações (Kardex) em transações atômicas.

## Endereços do projeto

| Recurso | Endereço |
| --- | --- |
| Aplicação publicada | https://nexostock-qbwn.onrender.com/ |
| Repositório de código-fonte | https://github.com/Gabriel-Anunzio/project_PRAT-PROF-EM-ANALISEDESEN-SISTEMAS_-grupo-21 |
| Quadro de acompanhamento (Kanban) | https://trello.com/b/LTKQv7CX |

## Acesso ao ambiente publicado

1. Acesse **https://nexostock-qbwn.onrender.com/** em um navegador atualizado.
2. Informe o **E-mail** e a **Senha** da credencial de avaliação disponibilizada no relatório de testes e no guia do usuário.
3. Clique em **Entrar** para abrir o painel **Visão geral**.
4. Utilize o menu lateral para navegar pelos módulos operacionais. Os documentos **Guia do usuário** (`/guia`) e **Diagrama de implantação** (`/diagrama`) também podem ser abertos diretamente pela barra lateral da aplicação.

As operações são controladas por três perfis de acesso validados no servidor:
- **Administrador**: acesso integral a todos os módulos, exportações e administração de usuários.
- **Gestor**: gestão de produtos, importação CSV, estoque, depósitos, pedidos, expedição, canais demonstrativos, documentos fiscais demonstrativos e relatórios.
- **Operador**: consulta da visão geral e execução das rotinas de estoque, pedidos e expedição.

## Documentação técnica no repositório

| Documento | Descrição |
| --- | --- |
| [Especificação e Modelagem de Projeto (PDF)](docs/especificacao-sistema.pdf) | Requisitos funcionais e não funcionais, casos de uso, rastreabilidade, wireframes, modelo de domínio, diagramas de classes e de sequência. |
| [Guia do Usuário (PDF)](docs/guia-do-usuario.pdf) | Manual passo a passo de acesso, navegação e execução de todas as operações do sistema. |
| [Guia do Usuário (Markdown)](docs/guia-do-usuario.md) | Versão em texto do manual para leitura direta no repositório. |
| [Diagrama de Implantação (PDF)](docs/diagrama-de-implantacao.pdf) | Arquitetura física do ambiente hospedado, nós, artefatos e protocolos de comunicação. |
| [Diagrama de Implantação (PlantUML)](docs/diagrama-de-implantacao.puml) | Código-fonte estruturado do diagrama de implantação. |
| [Plano e Relatório de Testes (PDF)](docs/plano-e-relatorio-de-testes.pdf) | Casos de teste dos casos de uso UC01 a UC10, resultados da execução, métricas apuradas e dados de autenticação. |
| [Modelo de Importação CSV](docs/modelo-importacao-produtos.csv) | Planilha modelo em UTF-8 para cadastro de produtos em lote. |

## Escopo funcional implementado

- **Catálogo de produtos e variantes (`UC01`)**: cadastro, edição e inativação com unicidade obrigatória de SKU (normalizado em maiúsculas) e validação de unicidade de código de barras opcional (até 30 caracteres), além de importação em lote via arquivo CSV (até 100 registros e 100 KB) com relatório individualizado de linhas aceitas e rejeitadas.
- **Posição de estoque e inventário (`UC02`)**: acompanhamento de saldo físico, reservado e disponível por depósito, alertas de estoque mínimo, extrato Kardex por produto/depósito e ajuste de inventário com justificativa obrigatória e proteção das quantidades reservadas.
- **Múltiplos depósitos e transferências (`UC03`)**: criação de depósitos, envio de mercadorias com baixa na origem, controle de saldo em trânsito e confirmação idempotente de recebimento no destino.
- **Entrada de mercadorias (`UC04`)**: registro manual de recebimentos com validação de documento de origem único e recálculo automático do custo médio ponderado global do produto.
- **Pedidos de venda (`UC05`)**: criação de pedidos com múltiplos itens, reserva atômica integral (recusa sem reservas parciais quando falta saldo), acompanhamento de status e cancelamento antes do envio com estorno automático da reserva.
- **Expedição (`UC07`)**: fila operacional por etapa (`Reservado → Separação → Pronto → Enviado → Entregue`), conferência obrigatória item a item antes da liberação, registro de transportadora e rastreamento com baixa física única e impressão de etiqueta demonstrativa.
- **Relatórios e administração (`UC09`, `UC10`)**: indicadores financeiros e operacionais reconciliáveis, trilha de auditoria, exportação de saldos em CSV e de estado em JSON (sem exposição de hashes de senha), autenticação por sessão com expiração por inatividade e controle de usuários por perfil.
- **Recursos demonstrativos (`UC06`, `UC08`)**: simulação controlada e idempotente de importação de pedidos por canal de venda (`Shopee`, `Mercado Livre` e `Loja virtual`) e emissão de comprovante fiscal demonstrativo sem validade jurídica, operando sem conexão a APIs externas.

## Arquitetura do sistema

| Camada | Tecnologia e responsabilidade |
| --- | --- |
| Cliente | HTML5, CSS3 e JavaScript puro (SPA sem frameworks externos), leitura e pré-validação local de arquivos CSV. |
| Servidor | Node.js (API HTTP/JSON nativa), autenticação `scrypt` com sal aleatório, sessão via cookie `HttpOnly`, controle de permissões por perfil e validação transacional das invariantes de estoque. |
| Persistência em produção | PostgreSQL gerenciado (Neon), armazenando o estado operacional em coluna `JSONB` (`nexostock_state`) sob transações `BEGIN / COMMIT / ROLLBACK` e bloqueio de linha (`SELECT ... FOR UPDATE`). |
| Persistência local | Armazenamento em arquivo JSON atômico (`data/nexostock.json`) com cópias diárias automáticas em `data/backups/` quando `DATABASE_URL` não está configurada. |

## Instruções para execução local (ambiente de desenvolvimento)

**Pré-requisitos:** Git, **Node.js 20 ou superior** (recomendado Node.js 24 LTS), `npm` e um navegador web atualizado. Não é necessário instalar banco PostgreSQL para executar o sistema localmente.

1. **Clonar o repositório e acessar o diretório do projeto:**

   ```bash
   git clone "https://github.com/Gabriel-Anunzio/project_PRAT-PROF-EM-ANALISEDESEN-SISTEMAS_-grupo-21.git"
   cd "project_PRAT-PROF-EM-ANALISEDESEN-SISTEMAS_-grupo-21"
   ```

2. **Instalar as dependências exatamente como especificadas no `package-lock.json`:**

   ```bash
   npm ci
   ```

3. **Iniciar o servidor em modo local:**

   ```bash
   npm start
   ```

4. **Acessar a aplicação no navegador:**
   Abra **http://localhost:3210** e utilize uma das contas locais de demonstração (válidas apenas fora de produção):
   - **Administrador**: `admin@nexostock.local` · Senha: `Nexo@2026!`
   - **Gestor**: `gestor@nexostock.local` · Senha: `Nexo@2026!`
   - **Operador**: `operador@nexostock.local` · Senha: `Nexo@2026!`

5. **Testar a importação de produtos por CSV:**
   No módulo **Produtos**, clique em **Importar CSV** e selecione o arquivo [docs/modelo-importacao-produtos.csv](docs/modelo-importacao-produtos.csv) (ou gere o modelo pelo botão **Baixar modelo CSV**). O arquivo deve estar codificado em UTF-8, conter até 100 linhas e até 100 KB, com o cabeçalho `sku;name;category;variant;price;cost;min;unit;barcode;weight;active`. Produtos importados iniciam com saldo físico zero; utilize **Estoque > Registrar entrada** para lançar unidades.

6. **Executar a suíte de testes automatizados:**

   ```bash
   npm test
   ```

   Para executar diretamente os testes funcionais e de API sem o adaptador PostgreSQL em memória:

   ```bash
   node --test tests/fluxos.test.js tests/iteracao2.test.js tests/plano-testes.test.js
   ```

7. **Reinicializar a massa de dados local (opcional):**
   Encerre o servidor com `Ctrl+C` e remova a pasta `data/`. Na próxima execução de `npm start`, a carga inicial demonstrativa será recriada automaticamente.

### Variáveis de ambiente

| Variável | Uso | Descrição |
| --- | --- | --- |
| `NEXO_PORT` / `PORT` | Opcional local | Porta HTTP do servidor (padrão `3210`). |
| `NEXO_DATA_DIR` | Opcional local | Diretório de gravação do arquivo `nexostock.json` no modo local. |
| `DATABASE_URL` | Produção / opcional local | String de conexão PostgreSQL (`postgresql://...`). Em conexões remotas, TLS com verificação de certificado é exigido. |
| `NODE_ENV` | Produção | Quando definido como `production`, exige HTTPS (`APP_URL` ou `RENDER_EXTERNAL_URL`), `DATABASE_URL`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`. |
| `ADMIN_EMAIL` | Produção | E-mail do administrador inicial criado na primeira carga do banco vazio. |
| `ADMIN_PASSWORD` | Produção | Senha forte (12 a 128 caracteres) do administrador inicial. |

## Organização de diretórios

| Caminho | Finalidade |
| --- | --- |
| `server.js` | Servidor HTTP, rotas da API, autenticação, autorização e regras operacionais. |
| `storage.js` | Camada de persistência transacional (`PostgresStore` e `FileStore`). |
| `config.js` | Leitura e validação das configurações de execução e segurança de cookies/origens. |
| `public/` | Aplicação cliente (`index.html`, `style.css`, `app.js`, `import-csv.js`, `favicon.svg`). |
| `tests/` | Suítes automatizadas de fluxos operacionais, catálogo/CSV, persistência PostgreSQL e plano de testes (`UC01` a `UC10`). |
| `docs/` | Documentação técnica, guia do usuário, diagrama de implantação, relatório de testes e modelo CSV. |
| `render.yaml` | Especificação declarativa de implantação do serviço web no Render. |

## Histórico de versões (tags Git)

- **`v1`**: primeira versão operacional com controle de estoque multidepósito, pedidos, expedição, simulações e persistência PostgreSQL/JSONB.
- **`v2`**: evolução do módulo de produtos com validação de unicidade de código de barras, importação em lote via CSV com relatório por linha e ampliação dos testes de API.
- **`v3`**: consolidação final do sistema, padronização da interface, ampliação da suíte automatizada sobre os casos de teste aplicáveis (`UC01` a `UC10`) e documentação técnica completa revisada.

## Integrantes (Grupo 21)

- Adriano Brüning Gutierres (10739372)
- Gabriel Anunzio Araujo (10721727)
- Gabriel Henrique Golgheto Souza (10722105)
- Gabriel Marcelino da Silva (10722757)
- João Victor de Amorim (10726542)

**Orientação:** Prof. Joaquim Pessoa Filho e Prof. Cristiano Morais de Souza  
**Universidade Presbiteriana Mackenzie** - Práticas Profissionais em Análise e Desenvolvimento de Sistemas
