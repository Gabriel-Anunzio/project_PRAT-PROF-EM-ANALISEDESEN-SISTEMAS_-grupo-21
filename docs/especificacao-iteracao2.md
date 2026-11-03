# NexoStock — Documento de Especificação Revisado e Atualizado

**Projeto:** Sistema de Gestão de Estoque e Pedidos para Operações de E-commerce Multicanal  
**Versão:** 2.0 — Iteração 2 da fase de construção  
**Data:** 03/11/2026  
**Disciplina:** Práticas Profissionais em Análise e Desenvolvimento de Sistemas  
**Instituição:** Universidade Presbiteriana Mackenzie  
**Grupo:** 21 — Adriano Brüning Gutierres; Gabriel Anunzio Araujo; Gabriel Henrique Golgheto Souza; Gabriel Marcelino da Silva; João Victor de Amorim.

## 1. Objetivo e bases da revisão

Este documento consolida a especificação executável do NexoStock na Iteração 2, com base no código da primeira iteração, no registro da construção (30/09/2026), no guia do usuário, no diagrama de implantação e nos planos de testes UC01 a UC10 (14/10/2026). **O documento original completo de requisitos/modelagem citado nesses planos não foi fornecido neste conjunto de arquivos; portanto, este texto é uma especificação consolidada e revisada para a entrega, não uma edição rastreada do arquivo original.**

A Iteração 2 aprofunda o **UC01 — Gerenciar cadastro de produtos e variantes**, corrigindo a falta de validação de código de barras duplicado e habilitando importação controlada de produtos em CSV com rastreabilidade das linhas aceitas e rejeitadas. As operações já implementadas da Iteração 1 permanecem disponíveis.

## 2. Contexto do sistema e usuários

O NexoStock é uma aplicação web para controle de produtos, depósitos, saldos, pedidos, expedição e indicadores de e-commerce multicanal. Sua persistência mantém um agregado de estado operacional em JSONB no PostgreSQL (Neon na implantação de referência), com transações no servidor Node.js. No uso local demonstrativo, pode-se utilizar arquivo JSON em disco, isolado dos dados hospedados.

**Perfis:** (a) Administrador: todos os módulos e gestão de usuários; (b) Gestor: produtos, estoque, pedidos, expedição, canais, demonstrações fiscais e relatórios; (c) Operador: visão geral, estoque, pedidos e expedição. **Importação CSV e cadastro/edição de produtos exigem Gestor ou Administrador**, com verificação no servidor.

## 3. Escopo funcional e rastreabilidade

| Caso de uso | Situação na Iteração 2 | Observações |
|---|---|---|
| UC01 — Produtos e variantes | **Evoluído na v2** | SKU único, edição, ativação, código de barras único quando informado e importação CSV de novos produtos. |
| UC02 — Saldos de estoque | Mantido da v1 | Físico, reservado, disponível, Kardex, ajustes e alertas. |
| UC03 — Depósitos e transferências | Mantido da v1 | Transferência em trânsito e recebimento confirmado. |
| UC04 — Entrada de mercadorias | Mantido da v1 | Entrada manual, documento único e custo médio. |
| UC05 — Pedidos de venda | Mantido da v1 | Reserva integral, cancelamento pré-envio, estados. |
| UC06 — Canais de venda | Demonstração | Sem APIs externas de marketplaces. |
| UC07 — Expedição e etiquetas | Parcial/demonstração | Conferência e envio reais na aplicação; etiqueta sem validade logística. |
| UC08 — Documentos fiscais | Demonstração | Não emite NF-e/NFC-e; sem comunicação SEFAZ. |
| UC09 — Relatórios | Mantido da v1 | Indicadores e exportação de estoque CSV/dados JSON. |
| UC10 — Usuários e permissões | Mantido da v1 | Login, perfis e desativação de usuários. |

## 4. Requisitos de produto revisados

**RF-V2-01 — Unicidade do SKU.** O sistema deve rejeitar cadastro ou alteração que resulte em SKU já utilizado por outro produto, considerando os SKUs normalizados em maiúsculas. O SKU é obrigatório e identifica uma única variante. **Critério de aceitação:** tentativa duplicada responde com conflito HTTP 409, sem gravar novo produto.

**RF-V2-02 — Unicidade do código de barras.** O código de barras permanece opcional, mas, quando preenchido, deve ser único entre produtos. Espaços nas extremidades são removidos; o valor pode conter no máximo 30 caracteres. **Critério de aceitação:** código já atribuído a outro produto responde HTTP 409; manter o mesmo código ao editar o próprio produto deve funcionar; código vazio é permitido.

**RF-V2-03 — Importação de produtos em CSV.** Gestor ou Administrador pode selecionar um arquivo CSV com até 100 linhas de dados e até 100 KB; o cabeçalho é obrigatório e contém `sku`, `name`, `category`, `variant`, `price`, `cost`, `min`, `unit`, `barcode`, `weight`, `active`. A interface fornece modelo para download. **Critério de aceitação:** o arquivo é interpretado no navegador e submetido à API para validação por linha; apenas os registros válidos são criados.

**RF-V2-04 — Relatório de importação.** A aplicação deve mostrar a quantidade de registros aceitos e rejeitados e, para rejeições, o número da linha e o motivo. **Critério de aceitação:** um arquivo com uma linha válida, uma duplicada e outra sem nome deve salvar apenas a válida e apresentar os dois erros.

**RF-V2-05 — Segurança e integridade.** A API deve validar as regras, independentemente da interface, bloquear importação por Operador, não modificar produtos existentes pela importação e realizar a gravação dos aceitos na mesma transação. **Critério de aceitação:** tentativa sem permissão retorna HTTP 403; linhas rejeitadas não são gravadas; o saldo dos produtos importados começa em zero, sem criação de movimentações de entrada.

**RF-V2-06 — Execução local documentada.** O `README.md` deve conter pré-requisitos, comandos de clone/instalação/inicialização, URL local, credenciais exclusivas do ambiente demonstrativo, testes, limpeza da base local e orientação de variáveis para PostgreSQL e publicação. **Critério de aceitação:** um desenvolvedor com Node.js 20+ e npm consegue seguir as instruções sem utilizar credenciais de produção.

## 5. Fluxos da Iteração 2

### 5.1 Cadastro individual

1. Usuário autorizado abre Produtos > Cadastrar produto ou Editar.
2. Informa nome, SKU, categoria, variante, valores, mínimo, unidade, peso, situação e código de barras opcional.
3. Servidor valida campos, SKU e código de barras contra o catálogo persistido.
4. Se válido, salva o cadastro e registra auditoria. Se inválido, retorna erro e preserva o estado.
5. O cadastro **não altera o estoque físico**; para possuir saldo, exige uma entrada de mercadorias.

### 5.2 Importação CSV

1. Em Produtos, o usuário autorizado escolhe **Importar CSV** e pode baixar o modelo.
2. Seleciona CSV (UTF-8, separador `;` ou `,`), com até 100 linhas e até 100 KB.
3. A interface lê o cabeçalho e envia os objetos de produtos à API `/api/products-import`.
4. O servidor valida cada linha contra os registros anteriores e os itens aceitos no mesmo lote, dentro de transação.
5. Os produtos válidos são adicionados; os inválidos são rejeitados, sem interromper os demais.
6. A interface apresenta totais e motivos por linha; nenhum registro cria saldo automaticamente.

**Exceções:** arquivo sem cabeçalho obrigatório, quantidade acima do limite ou arquivo malformado são recusados; SKU/código repetidos, nome vazio e valores inválidos geram rejeição individual. A operação não atualiza registros preexistentes.

## 6. Modelo lógico e dados

A tabela persistente existente, `nexostock_state`, mantém o JSONB do domínio e não exige migração para esta evolução. Cada produto contém `id`, `sku`, `name`, `category`, `variant`, `price`, `cost`, `min`, `unit`, `barcode`, `weight` e `active`. A API evita colisões por SKU ou por código de barras preenchido. `balances` é independente de `products`; importar não implica lançar estoque. As alterações são registradas em trilha de auditoria por operação autorizada. O banco remoto permanece sob transações com `SELECT FOR UPDATE` durante gravações.

## 7. Arquitetura e ambiente

- **Cliente:** HTML, CSS e JavaScript em navegador atualizado. A leitura CSV é feita no navegador; não há upload de arquivos binários ao servidor.
- **Servidor:** Node.js 20+; API HTTP JSON; autorização por perfil, autenticação por sessão, regras de validação e armazenamento.
- **Persistência local:** arquivo `data/nexostock.json` no modo de demonstração, sem `DATABASE_URL`.
- **Persistência hospedada:** PostgreSQL/Neon via `DATABASE_URL`; deploy de referência no Render, com HTTPS.
- **Versionamento:** GitHub; `v1` marca a primeira iteração, `v2` marca o estado completo da segunda iteração.

## 8. Estratégia de verificação e resultados

A suíte da Iteração 1 é preservada. A Iteração 2 adiciona testes de API em `tests/iteracao2.test.js`, cobrindo: código de barras duplicado; edição do próprio código; colisão durante edição; importação mista com aceites/rejeições; colisão no lote; limites de volume; restrição do perfil Operador; ausência de estoque criado durante importação.

**Verificação local realizada em 03/11/2026:** `node --test tests/fluxos.test.js tests/iteracao2.test.js` — 14 verificações aprovadas, zero falhas. **Limitação:** a suíte adicional de infraestrutura PostgreSQL simulada (`tests/online.test.js`) necessita da dependência de desenvolvimento `@electric-sql/pglite`; sua execução completa deverá ser confirmada em ambiente com `npm ci` concluído.

| Requisito | Verificação | Situação |
|---|---|---|
| RF-V2-01 | Teste integrado de conflito de SKU e registros do fluxo | Implementado; casos de regressão existentes |
| RF-V2-02 | Teste de conflito de código de barras e edição | Verificado localmente |
| RF-V2-03 | Teste de aceitação/rejeição de linhas da API | Verificado localmente |
| RF-V2-04 | Verificação de `accepted`, `rejected`, número de linha e motivo | Verificado localmente |
| RF-V2-05 | Teste Operador HTTP 403 e ausência de saldo criado | Verificado localmente |
| RF-V2-06 | README com instalação e execução local | Documentado; verificar em ambiente do avaliador |

## 9. Restrições e pendências

Continuam **fora do escopo entregue**: geração automática de combinações cor/tamanho; kits; importação de XML de notas fiscais; integrações reais com marketplaces, transportadoras ou SEFAZ; imagens/dimensões/NCM; estoque máximo por depósito; filtros avançados e Curva ABC; inventário cíclico agendado; devoluções pós-envio; autenticação multifator; recuperação automática de senha; normalização integral do banco, sessões distribuídas e homologação de carga/disponibilidade. A importação CSV cadastra somente produtos novos e não realiza atualização em massa.

## 10. Histórico e fontes

- **30/09/2026 — Iteração 1 (v1):** fluxo operacional, persistência, perfis e testes da primeira construção.
- **14/10/2026 — Planos de testes v1.1:** identificação de lacunas funcionais e cenários UC01–UC10.
- **03/11/2026 — Iteração 2 (v2):** validação de código de barras, importação CSV com relatório de linhas, novos testes, documentação de instalação e revisão da especificação.

**Fontes internas utilizadas:** `docs/primeira-iteracao.md`, `docs/guia-do-usuario.md`, `docs/diagrama-de-implantacao.puml`, `README.md`, código-fonte do servidor e interface, e planos de testes UC01–UC10 fornecidos pelo grupo. **Esta especificação consolidada não substitui uma eventual revisão documental do arquivo original de requisitos se ele vier a ser localizado.**