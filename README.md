# NexoStock

**Sistema de Gestão de Estoque e Pedidos para Operações de E-commerce Multicanal**

Entrega da **1ª iteração da fase de construção** · Grupo 21 · 2026

## Apresentação

O NexoStock centraliza o cadastro de produtos, o controle de estoque por depósito e o acompanhamento de pedidos, desde a reserva até a entrega. A primeira iteração implementa esse fluxo operacional com autenticação, perfis de acesso, histórico de movimentações e persistência dos dados.

A aplicação está disponibilizada em ambiente web. Os dados de exemplo são fictícios e permitem explorar as funcionalidades para fins acadêmicos.

## Acesso para avaliação

1. Abra, no navegador, o **link da aplicação encaminhado pelo grupo junto com a entrega**.
2. Preencha **E-mail** e **Senha** com as credenciais de avaliação fornecidas pelo grupo.
3. Clique em **Entrar**. A tela **Visão geral** apresenta os indicadores e a fila de pedidos.
4. Utilize o menu lateral para navegar. O **Guia do usuário** está disponível na tela de acesso e dentro da aplicação.

O acesso é realizado pelo navegador e não exige instalação no computador do avaliador. As funcionalidades exibidas dependem do perfil da conta. Para avaliar também a administração de usuários, é necessária uma conta com perfil **Administrador**. As credenciais são compartilhadas em canal reservado, separado deste repositório.

## Documentação da entrega

| Documento | Conteúdo |
| --- | --- |
| [Guia do usuário (PDF)](docs/guia-do-usuario.pdf) | Acesso, navegação e instruções das operações. |
| [Guia do usuário (Markdown)](docs/guia-do-usuario.md) | Versão consultável diretamente no GitHub. |
| [1ª iteração da construção (PDF)](docs/primeira-iteracao.pdf) | Objetivo, escopo implementado, regras, verificação e limitações. |
| [1ª iteração da construção (Markdown)](docs/primeira-iteracao.md) | Versão consultável diretamente no GitHub. |
| [Diagrama de implantação (PDF)](docs/diagrama-de-implantacao.pdf) | Componentes da aplicação hospedada e comunicação entre eles. |
| [Diagrama editável (PlantUML)](docs/diagrama-de-implantacao.puml) | Fonte do diagrama de implantação. |

## Funcionalidades da primeira iteração

- Produtos e variantes identificados por SKU, com preço, custo e estoque mínimo.
- Estoque físico, reservado e disponível por depósito; entradas e ajustes de inventário.
- Transferências com saída da origem, situação em trânsito e confirmação de recebimento.
- Pedidos com múltiplos itens, reserva de saldo e cancelamento antes do envio.
- Separação, conferência dos itens, registro de envio e confirmação de entrega.
- Indicadores, histórico de movimentações, auditoria e exportação de dados.
- Autenticação e perfis **Administrador**, **Gestor** e **Operador**.
- Simulação de importação de pedidos de canais de venda, etiquetas e documentos fiscais.

As integrações com marketplaces, transportadoras e SEFAZ são **simulações acadêmicas**. Não há emissão real de NF-e/NFC-e, contratação de frete ou comunicação com contas reais de marketplace nesta iteração.

## Percurso sugerido de avaliação

1. Entrar com a conta fornecida pelo grupo e consultar **Visão geral**.
2. Cadastrar um produto com SKU exclusivo e registrar uma entrada no estoque.
3. Criar um pedido e observar a diferença entre saldo físico, reservado e disponível.
4. Separar e conferir todos os itens; registrar o envio e confirmar a entrega.
5. Consultar o **Kardex** do produto e os indicadores em **Relatórios**.
6. Explorar transferências e simulações de canais e documentos.

O guia apresenta os passos detalhados. As ações de avaliação gravam registros na mesma base compartilhada; utilize nomes e referências de teste exclusivos.

## Arquitetura

| Camada | Implementação |
| --- | --- |
| Interface | HTML, CSS e JavaScript no navegador. |
| Aplicação | Node.js no Render, com autenticação, regras de negócio e API JSON. |
| Persistência | PostgreSQL no Neon; estado operacional na tabela `nexostock_state`, em JSONB. |
| Versionamento | GitHub, com configuração de implantação em `render.yaml`. |

O navegador acessa a aplicação por HTTPS. O servidor mantém os dados no PostgreSQL e usa transações para atualizar o estado operacional. As sessões de acesso ficam em memória; reiniciar o serviço exige novo login, mas preserva os registros no banco. A implantação desta iteração utiliza uma instância da aplicação.

## Organização do repositório

| Caminho | Finalidade |
| --- | --- |
| `public/` | Interface, estilos, scripts e ícone da aplicação. |
| `docs/` | Guia, registro da iteração e diagrama de implantação. |
| `server.js` | Servidor, API, autenticação e regras operacionais. |
| `storage.js` | Persistência e transações. |
| `config.js` | Configuração de execução. |
| `tests/` | Testes automatizados dos fluxos e da persistência. |
| `render.yaml` | Configuração do serviço hospedado. |
| `package.json` e `package-lock.json` | Dependências e comandos do projeto. |

## Verificação

A suíte disponível em `tests/` verifica autenticação, permissões, reserva sem alterações parciais, conferência e baixa de estoque, concorrência, transferências, prevenção de duplicidade e persistência após reinício. A verificação do armazenamento PostgreSQL utiliza PGlite em ambiente de teste isolado. O comando de execução é `npm test`.

Os resultados e os limites dessa verificação estão descritos no [registro da primeira iteração](docs/primeira-iteracao.md).

## Equipe

- Adriano Brüning Gutierres
- Gabriel Anunzio Araujo
- Gabriel Henrique Golgheto Souza
- Gabriel Marcelino da Silva
- João Victor de Amorim

**Universidade Presbiteriana Mackenzie** · Análise e Desenvolvimento de Sistemas  
**Componente curricular:** Práticas Profissionais em Análise e Desenvolvimento de Sistemas

## A5 – Praticando: exercício de versionamento

A tag `v1` identifica o código-fonte entregue na primeira iteração da construção (30/09/2026). A branch `iteracao2` foi utilizada para o exercício de controle de versões da A5: duas alterações documentais pequenas em `README.md` e `PUBLICAR.md`, posteriormente integradas à branch principal `main` por merge.

Esta alteração é exclusivamente documental: não altera as funcionalidades da aplicação e **não representa a entrega da implementação da Iteração 2**, que pertence à atividade A5 – Aplicando Conhecimento.
