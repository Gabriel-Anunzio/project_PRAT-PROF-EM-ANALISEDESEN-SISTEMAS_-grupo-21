# 1ª iteração da fase de construção
## NexoStock
Sistema de Gestão de Estoque e Pedidos para Operações de E-commerce Multicanal.

**Grupo 21 · Aplicação 1.1 · Documentação revisada em 30/09/2026**

### Identificação
**Instituição:** Universidade Presbiteriana Mackenzie.  
**Curso:** Análise e Desenvolvimento de Sistemas.  
**Componente:** Práticas Profissionais em Análise e Desenvolvimento de Sistemas.  
**Professores:** Joaquim Pessoa Filho e Cristiano Morais de Souza.

**Integrantes:** Adriano Brüning Gutierres; Gabriel Anunzio Araujo; Gabriel Henrique Golgheto Souza; Gabriel Marcelino da Silva; João Victor de Amorim.

### Objetivo da iteração
Disponibilizar uma versão executável do NexoStock que permita percorrer o fluxo de entrada de mercadorias, reserva de estoque, separação, conferência, envio e entrega de pedidos, com autenticação, controle por perfil e persistência dos registros.

### Resultado entregue
A aplicação web permite executar o ciclo operacional no navegador. O guia do usuário orienta o acesso e as tarefas; o diagrama de implantação identifica os componentes do ambiente hospedado. O código-fonte e os testes acompanham a documentação no repositório.

A primeira iteração concretiza uma parte do projeto de requisitos e modelagem. Os recursos de canais de venda, etiquetas e documentos fiscais são demonstrativos, com indicação explícita na interface. Eles não representam integrações externas concluídas.

### Regras centrais implementadas
- Cada variante de produto possui um SKU exclusivo.
- O saldo disponível corresponde ao físico menos o reservado.
- Um pedido só é criado se todos os itens tiverem saldo; a falha não mantém reservas parciais.
- O envio exige conferência completa, baixa o físico e libera a reserva uma única vez.
- O cancelamento anterior ao envio libera a reserva. Não há devolução após envio nesta iteração.
- Transferências só acrescentam saldo ao destino após a confirmação do recebimento.
- Operações registram referências e histórico; documentos de entrada e referências de pedido e transferência evitam duplicidade no respectivo fluxo.

<!-- page -->
## Escopo e rastreabilidade
Referência: casos de uso do Documento de Requisitos e Modelagem de Projeto do NexoStock.

| Caso de uso | Implementado nesta iteração | Delimitação |
| --- | --- | --- |
| UC01 - Produtos e variantes | Cadastro, edição, ativação e identificação por SKU. | Sem fotos, kits e dimensões de embalagem. |
| UC02 - Saldo de estoque | Físico, reservado, disponível, ajuste de inventário, Kardex e alertas. | Sem inventário cíclico agendado. |
| UC03 - Depósitos e transferências | Cadastro de depósito, envio e recebimento de transferências. | Recebimento confirmado manualmente. |
| UC04 - Entrada de mercadorias | Entrada manual, referência única e cálculo de custo médio. | Sem importação de XML e fluxo completo de compras/devoluções. |
| UC05 - Pedidos de venda | Múltiplos itens, reserva, cancelamento anterior ao envio e estados do pedido. | Sem devolução após envio. |
| UC06 - Canais de venda | Importação simulada de um pedido por canal/dia, sem duplicação. | Sem conexão com APIs, envio real de saldo ou sincronização agendada. |
| UC07 - Expedição e etiquetas | Separação, conferência, baixa, rastreamento manual e etiqueta de teste. | Sem cotação de frete nem etiqueta válida de transportadora. |
| UC08 - Documentos fiscais | Documento demonstrativo vinculado ao pedido. | Sem SEFAZ, certificado digital ou emissão real de NF-e/NFC-e. |
| UC09 - Relatórios | Indicadores, resultados por canal, auditoria e exportação CSV/JSON. | Sem filtros por período nem restauração por importação. |
| UC10 - Usuários e permissões | Login, perfis, cadastro, edição e desativação de usuários. | Sem autenticação multifator ou recuperação automática de senha. |

### Fluxo principal do pedido
**Reservado → Separação → Pronto → Enviado → Entregue.** O cancelamento é permitido antes do envio. As transições são validadas pelo servidor.

<!-- page -->
## Arquitetura, verificação e evolução

### Implantação e persistência
O navegador executa HTML, CSS e JavaScript e se comunica por HTTPS com a aplicação Node.js no Render. O servidor autentica o usuário, verifica permissões e executa as regras operacionais. O PostgreSQL no Neon armazena o estado na tabela **nexostock_state**, como um agregado JSONB.

As alterações são realizadas em transações com bloqueio de linha e confirmação ou reversão integral. As sessões ficam em memória e a implantação utiliza uma instância. O GitHub mantém o código-fonte e a configuração de implantação. O detalhamento visual consta no **Diagrama de implantação**.

### Verificação automatizada
Os testes utilizam dados temporários isolados. A suíte inclui os seguintes cenários:

| Área | Cenários verificados |
| --- | --- |
| Acesso | Autenticação obrigatória, restrições do operador e ausência de hashes de senha na resposta. |
| Pedidos | Recusa sem reserva parcial, referência duplicada, sequência de conferência e baixa única. |
| Concorrência | Duas tentativas de consumir o mesmo saldo; apenas uma reserva aceita. |
| Estoque | Entrada não duplicada, inventário abaixo da reserva recusado e transferência recebida uma única vez. |
| Simulações | Repetição da sincronização sem duplicar o pedido de exemplo. |
| Persistência | Conservação dos registros após reiniciar; reversão de transação PostgreSQL. |
| Ambiente online | Configuração HTTPS, cookie seguro, conta inicial privada e rejeição de host/origem não autorizados. |

**Resultado da execução:** a suíte existente reportou 15 testes aprovados e nenhuma falha em 30/09/2026. A verificação PostgreSQL utiliza PGlite; não constitui teste de carga, de disponibilidade nem homologação da infraestrutura externa. O percurso do guia permite conferir manualmente o fluxo principal na aplicação.

### Próximas evoluções
Integrações reais com canais de venda e serviços fiscais/logísticos; normalização das entidades no banco; sessões compartilhadas; recuperação de senha; rotinas de backup e restauração; e validação de carga e disponibilidade. Esses itens permanecem fora do escopo concluído desta iteração.
