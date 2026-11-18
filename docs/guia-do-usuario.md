# Guia do Usuário - NexoStock

**Sistema de Gestão de Estoque e Pedidos para Operações de E-commerce Multicanal**  
Universidade Presbiteriana Mackenzie · Grupo 21 · Versão 2.1 · 2026

Este guia descreve os procedimentos de acesso, navegação e operação de todos os módulos disponíveis na aplicação web NexoStock.

---

## 1. Acesso ao sistema e perfis

### 1.1 Entrar no ambiente publicado

1. Abra o navegador e acesse **https://nexostock-qbwn.onrender.com/**.
2. Informe uma das credenciais de avaliação abaixo (ambas configuradas com perfil **Administrador**):

| Avaliador | E-mail | Perfil | Senha |
| --- | --- | --- | --- |
| Cristiano Morais de Sousa | `cristiano.sousa@nexostock.local` | Administrador | `cristiano.sousa` |
| Joaquim Pessoa Filho | `joaquim.pessoa@nexostock.local` | Administrador | `joaquim.pessoa` |

3. Clique em **Entrar**. O sistema apresentará o painel **Visão geral**.

Não é necessária nenhuma instalação no computador do usuário. Após 30 minutos de inatividade, a sessão é encerrada automaticamente por segurança, bastando autenticar-se novamente.

### 1.2 Perfis de permissão

| Perfil | Módulos e operações habilitados |
| --- | --- |
| Administrador | Acesso completo a todos os módulos, exportações de dados e administração de contas de usuário. |
| Gestor | Produtos (cadastro, edição e importação CSV), estoque, depósitos, transferências, pedidos, expedição, canais demonstrativos, documentos fiscais demonstrativos e relatórios. |
| Operador | Visão geral, posição de estoque, entradas, transferências, ajustes, pedidos e expedição. |

### 1.3 Navegação geral

Utilize o menu lateral esquerdo para alternar entre os módulos. Em telas reduzidas, acione o botão de menu no canto superior esquerdo. Na parte inferior da barra lateral estão disponíveis os atalhos diretos para abrir este **Guia do usuário** e o **Diagrama de implantação** em PDF. Para encerrar o acesso com segurança, clique em **Sair** no cabeçalho superior direito.

---

## 2. Catálogo de produtos e importação CSV (`UC01`)

### 2.1 Cadastrar ou editar um produto individualmente

1. Acesse **Produtos** no menu lateral e clique em **Cadastrar produto**.
2. Preencha nome, **SKU único da variante**, categoria, variante (cor, tamanho ou padrão), preço de venda, custo unitário, estoque mínimo, unidade e peso.
3. O campo **Código de barras** é opcional (até 30 caracteres), mas, quando preenchido, deve ser exclusivo em todo o catálogo. O sistema recusa códigos ou SKUs já atribuídos a outro item.
4. Clique em **Salvar**. Para modificar dados ou inativar um item sem perder seu histórico, utilize o botão **Editar** na listagem e ajuste a opção **Produto ativo**.

O cadastro cria o item no catálogo com saldo inicial zero. Para disponibilizar unidades físicas para venda, registre uma entrada de mercadorias no módulo **Estoque**.

### 2.2 Importar produtos em lote por arquivo CSV

A funcionalidade permite aos perfis **Gestor** e **Administrador** cadastrar até 100 novas variantes por arquivo (limite de 100 KB):

1. Em **Produtos**, clique em **Importar CSV**.
2. Se desejar, clique em **Baixar modelo CSV** para obter a planilha padrão codificada em UTF-8 com ponto e vírgula (`;`).
3. Preencha as colunas obrigatórias: `sku;name;category;variant;price;cost;min;unit;barcode;weight;active`.
4. Selecione o arquivo `.csv` e clique em **Validar e importar**.
5. Confira o **Resultado da importação**, que apresenta o total de itens aceitos, o total de rejeições e o motivo detalhado por número de linha (como SKU repetido, código de barras duplicado ou campo obrigatório vazio).

Linhas inválidas não interrompem o cadastro das linhas válidas do mesmo lote. A importação cadastra apenas produtos novos (não sobrescreve produtos existentes) e não cria saldo físico automaticamente.

---

## 3. Controle de estoque, depósitos e movimentações (`UC02`, `UC03`, `UC04`)

### 3.1 Compreender os indicadores de saldo

| Indicador | Significado operacional |
| --- | --- |
| Físico | Quantidade total presente fisicamente no depósito. |
| Reservado | Unidades comprometidas com pedidos em aberto (`Reservado`, `Separação` ou `Pronto`). |
| Disponível | Saldo físico menos saldo reservado; quantidade efetivamente livre para novos pedidos e transferências. |
| Em trânsito | Unidades que já saíram do depósito de origem em uma transferência e aguardam confirmação no destino. |

### 3.2 Registrar entrada de mercadorias

1. Acesse **Estoque > Registrar entrada**.
2. Escolha o produto e o depósito de destino.
3. Informe a quantidade inteira recebida, o custo unitário da compra, o fornecedor e um **Documento de origem único** (ex.: número da nota ou referência interna).
4. Clique em **Salvar**. O saldo físico do depósito é acrescido e o custo médio ponderado do produto é recalculado considerando o estoque físico total existente. Documentos repetidos são recusados para evitar entradas duplicadas.

### 3.3 Consultar o Kardex e ajustar inventário

- **Extrato Kardex**: na tabela **Posição de estoque**, utilize a busca ou o filtro por depósito e clique em **Kardex** na linha desejada para visualizar data, tipo de movimento, quantidade, saldo resultante, documento de origem e responsável.
- **Ajustar inventário**: clique em **Ajustar inventário**, selecione produto e depósito, informe a **Quantidade física contada** e preencha a **Justificativa obrigatória**. A contagem deve ser inteira e não pode ser inferior à quantidade atualmente reservada por pedidos em andamento.

### 3.4 Criar depósitos e transferir mercadorias

1. Para cadastrar um novo local de armazenagem, clique em **Novo depósito** no módulo **Estoque**, informe nome e localização e salve.
2. Para movimentar unidades entre locais, clique em **Transferir**, selecione o produto, o depósito de origem, o depósito de destino (distinto da origem), a quantidade (limitada ao saldo disponível) e uma referência única.
3. Ao salvar, a quantidade sai imediatamente do depósito de origem e a transferência permanece com situação **Em trânsito**.
4. Quando a mercadoria chegar ao destino, localize o registro no quadro **Transferências** e clique em **Confirmar recebimento**. O saldo físico do destino é creditado uma única vez e a situação passa para **Recebida**.

---

## 4. Pedidos de venda e expedição (`UC05`, `UC07`)

### 4.1 Criar pedido de venda com reserva imediata

1. Acesse **Pedidos > Novo pedido** (ou utilize o atalho no painel **Visão geral**).
2. Informe nome do cliente, canal de venda (`Manual`, `Shopee`, `Mercado Livre` ou `Loja virtual`), depósito de atendimento e uma referência exclusiva.
3. Selecione o produto ativo e a quantidade desejada. Utilize **Adicionar item** para compor pedidos com múltiplos produtos.
4. Clique em **Salvar**. O pedido nasce na situação **Reservado**, comprometendo o saldo disponível sem reduzir ainda o saldo físico. Caso qualquer item não possua saldo disponível suficiente, o pedido inteiro é recusado sem gerar reservas parciais.

### 4.2 Separar, conferir, expedir e entregar

1. No módulo **Expedição** (ou **Pedidos**), abra o pedido clicando em **Detalhes**.
2. Clique em **Iniciar separação** para avançar o status para **Separação**.
3. Marque a caixa **Conferido** em todos os itens do pedido e acione **Concluir conferência**. O sistema bloqueia o avanço caso reste algum item pendente; quando todos estão conferidos, o pedido passa para **Pronto**.
4. Clique em **Registrar envio**, preencha a transportadora e o código de rastreamento e confirme. Nesse instante, o sistema baixa o saldo físico e libera a reserva em uma única transação, mudando a situação para **Enviado**.
5. Após a entrega ao destinatário, abra novamente os detalhes do pedido e clique em **Confirmar entrega** para encerrar o ciclo em **Entregue**.

### 4.3 Cancelamento antes do envio

Enquanto o pedido estiver em **Reservado**, **Separação** ou **Pronto**, é possível abrir **Detalhes > Cancelar pedido**. A confirmação altera a situação para **Cancelado** e devolve integralmente as unidades reservadas ao saldo disponível. Pedidos já enviados, entregues ou cancelados não admitem novo cancelamento.

| Etapa | Saldo Físico | Saldo Reservado | Saldo Disponível |
| --- | ---: | ---: | ---: |
| Posição inicial após entrada | 10 | 0 | 10 |
| Após criação de pedido de 3 unidades (`Reservado`) | 10 | 3 | 7 |
| Após confirmação de envio (`Enviado` / `Entregue`) | 7 | 0 | 7 |

---

## 5. Recursos demonstrativos (`UC06`, `UC07`, `UC08`)

Para fins de avaliação funcional sem dependência de credenciais fiscais ou contratos comerciais externos, três integrações operam de modo simulado e explicitamente identificado na interface:

- **Sincronização de canais (`Canais de venda`)**: escolha `Shopee`, `Mercado Livre` ou `Loja virtual` e clique em **Simular sincronização**. Havendo produto ativo com saldo disponível no depósito principal, o sistema importa um pedido demonstrativo diário por canal e reserva o estoque. Acionamentos repetidos no mesmo dia não duplicam o pedido.
- **Etiqueta de envio (`Detalhes do pedido`)**: para pedidos em **Pronto**, **Enviado** ou **Entregue**, clique em **Etiqueta de demonstração** e utilize **Imprimir / salvar PDF** para gerar a etiqueta interna identificada como material de teste.
- **Documentos fiscais (`Documentos fiscais`)**: localize um pedido não cancelado e clique em **Gerar demonstração**. O sistema emite um único comprovante demonstrativo (`DEMO-...`) vinculado ao pedido, identificado como sem validade fiscal, disponível em **Visualizar** para impressão ou salvamento em PDF.

---

## 6. Relatórios, exportações e usuários (`UC09`, `UC10`)

### 6.1 Indicadores, exportação e auditoria

No módulo **Relatórios**, acompanhe em tempo real:
- **Receita expedida** e **Ticket médio** (calculados exclusivamente sobre pedidos nas situações `Enviado` e `Entregue`, sem dupla contagem).
- **Valor do estoque** (soma do saldo físico multiplicado pelo custo médio atual de cada produto) e total de **Movimentações**.
- **Resultados por canal** e **Trilha de auditoria** (exibindo as 40 operações mais recentes com data, autor, tipo de ação e identificador).
- **Exportar estoque CSV**: gera planilha compatível com editores de planilhas contendo SKU, produto, variante, depósito, saldos e custo médio.
- **Exportar dados**: baixa arquivo JSON com a fotografia operacional visível ao perfil autenticado, sem expor hashes de senha.

### 6.2 Administração de contas de acesso

Exclusivo ao perfil **Administrador**, o módulo **Usuários** permite:
1. Clicar em **Novo usuário**, informar nome, e-mail único, perfil (`Administrador`, `Gestor` ou `Operador`) e senha inicial de **10 a 128 caracteres**.
2. Utilizar **Editar** para alterar perfil, redefinir senha (deixando em branco para manter a senha atual) ou desmarcar **Acesso ativo** para revogar imediatamente o login e eventuais sessões abertas do usuário. O sistema impede que um administrador desative ou rebaixe a própria conta.

---

## 7. Roteiro rápido de verificação e solução de dúvidas

### 7.1 Percurso completo sugerido para teste

1. Autentique-se como **Administrador** e revise os indicadores iniciais em **Visão geral**.
2. Em **Produtos**, cadastre um item com SKU e código de barras exclusivos ou importe um lote em **Importar CSV** utilizando o modelo disponível.
3. Em **Estoque > Registrar entrada**, lance **10 unidades** a R$ 10,00 com uma referência exclusiva.
4. Em **Pedidos > Novo pedido**, venda **3 unidades** desse item e confirme na posição de estoque: físico `10`, reservado `3`, disponível `7`.
5. Em **Expedição**, abra o pedido, inicie a separação, marque o item como conferido, conclua a conferência, visualize a etiqueta demonstrativa, registre o envio e confirme a entrega (físico `7`, reservado `0`, disponível `7`).
6. Em **Documentos fiscais**, gere e visualize o documento demonstrativo do pedido; por fim, confira o **Kardex** e os totalizadores em **Relatórios**.

*Nota sobre dados compartilhados:* no ambiente publicado, os registros persistem no banco PostgreSQL compartilhado. Utilize identificadores de SKU e referências exclusivos a cada bateria de testes.

### 7.2 Solução de situações frequentes

| Situação observada | Causa e orientação |
| --- | --- |
| Primeiro carregamento leva cerca de 20 a 30 segundos | Comportamento normal de reativação de instância gratuita em nuvem após período ocioso; as requisições seguintes respondem imediatamente. |
| Mensagem de e-mail ou senha incorretos | Verifique maiúsculas/minúsculas na senha informada ou solicite redefinição a um Administrador. |
| Bloqueio temporário no login (`Aguarde um minuto`) | Proteção automática contra tentativas repetidas; aguarde 60 segundos antes de autenticar novamente. |
| Determinado menu não aparece na barra lateral | A conta conectada possui perfil `Operador` ou `Gestor`; acesse com perfil `Administrador` para visualizar todas as áreas. |
| Pedido recusado por estoque insuficiente | Algum item excede o saldo disponível (`físico − reservado`) no depósito selecionado; lance uma entrada ou ajuste a quantidade. |
| SKU, código de barras ou referência já utilizados | O servidor bloqueia duplicidades (`HTTP 409`); informe um código inédito para concluir o novo registro. |
| Botão de concluir conferência ou enviar bloqueado | Inicie primeiro a separação e marque a caixa **Conferido** em todos os itens do pedido. |
