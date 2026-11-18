# Implantação e Acesso - NexoStock

## Ambiente publicado

A aplicação encontra-se publicada no serviço Render com banco de dados PostgreSQL gerenciado no Neon:

- **URL de acesso:** https://nexostock-qbwn.onrender.com/
- **Verificação de integridade:** https://nexostock-qbwn.onrender.com/api/health

## Documentação de referência

| Finalidade | Arquivo |
| --- | --- |
| Instruções completas de execução local e arquitetura | [README.md](README.md) |
| Requisitos, casos de uso e modelagem de projeto | [docs/especificacao-sistema.pdf](docs/especificacao-sistema.pdf) |
| Manual operacional passo a passo | [docs/guia-do-usuario.pdf](docs/guia-do-usuario.pdf) |
| Arquitetura física e componentes de nuvem | [docs/diagrama-de-implantacao.pdf](docs/diagrama-de-implantacao.pdf) |
| Plano de testes, resultados de execução e métricas | [docs/plano-e-relatorio-de-testes.pdf](docs/plano-e-relatorio-de-testes.pdf) |

## Procedimento de publicação no Render

1. Conecte o repositório GitHub ao painel do Render utilizando a especificação declarativa `render.yaml` (runtime Node.js 24, comando de construção `npm ci --omit=dev` e inicialização `npm start`).
2. Configure no painel seguro do serviço as variáveis obrigatórias não versionadas:
   - `DATABASE_URL`: string de conexão PostgreSQL com TLS fornecida pelo Neon.
   - `ADMIN_EMAIL`: endereço de e-mail institucional ou administrativo inicial.
   - `ADMIN_PASSWORD`: senha de 12 a 128 caracteres exclusiva do ambiente publicado.
3. Após a subida do serviço, confirme o retorno HTTP 200 na rota `/api/health` e cadastre as contas de avaliação no módulo **Usuários**.
