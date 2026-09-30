# NexoStock - versão online 1.1

Aplicação de estoque e pedidos pronta para um repositório GitHub e implantação no Render, com PostgreSQL persistente no Neon.

**Comece por [PUBLICAR.md](PUBLICAR.md) ou pelo [tutorial em PDF](docs/Como_publicar_GitHub.pdf).** O código no GitHub é conectado à hospedagem; esta aplicação não é compatível com GitHub Pages.

## Publicação em três etapas

1. Envie os arquivos extraídos deste pacote para a raiz de um repositório GitHub.
2. Crie um projeto PostgreSQL no Neon e copie a conexão do botão Connect.
3. No Render, use **New > Blueprint**, selecione o repositório e preencha `DATABASE_URL`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

O arquivo `render.yaml` configura Node.js, instalação, início e plano Free. Ao terminar a implantação, o Render fornece o endereço HTTPS da aplicação. O código cria a estrutura do banco automaticamente; não é necessário executar SQL manualmente.

## Acesso online

O administrador inicial usa o e-mail e a senha definidos no Render. A senha deve ter de 12 a 128 caracteres. Não há contas públicas com senha padrão na publicação. Depois do primeiro acesso, cadastre os integrantes da equipe em **Usuários**.

Os valores `ADMIN_EMAIL` e `ADMIN_PASSWORD` criam apenas a primeira conta de um banco vazio. Alterações posteriores devem ser feitas em **Usuários**. Não são um mecanismo de redefinição de senha.

## Execução local

Requer Node.js 20 ou superior. Para executar com arquivos locais, mantenha `NODE_ENV` diferente de `production` e não configure `DATABASE_URL`.

```bash
npm ci
npm start
```

O endereço local é `http://localhost:3210`. O arquivo `iniciar.cmd` continua funcionando para esse modo. Os dados ficam em `data/nexostock.json` e as contas de demonstração locais são mantidas. Online, os dados são independentes dos arquivos locais.

## Configuração

| Variável | Uso |
| --- | --- |
| `NODE_ENV` | `production` no Render. |
| `DATABASE_URL` | Conexão PostgreSQL privada do Neon. |
| `ADMIN_EMAIL` | E-mail do primeiro administrador. |
| `ADMIN_PASSWORD` | Senha privada para a criação inicial da conta. |
| `RENDER_EXTERNAL_URL` | Fornecida automaticamente pelo Render. |
| `APP_URL` | Opcional: domínio HTTPS exato, caso use domínio próprio ou outro provedor. |
| `PORT` | Fornecida automaticamente pela hospedagem. |

Nunca envie credenciais, `data/`, `node_modules/` ou um arquivo `.env` preenchido ao GitHub. O pacote inclui apenas exemplos de configuração e dados fictícios de demonstração no código.

## Arquitetura

- Navegador: HTML, CSS e JavaScript; chamadas JSON para a API no mesmo domínio.
- Render: terminação HTTPS e um processo Node.js; autenticação, perfis, regras e sessões em memória.
- Neon/PostgreSQL: tabela `nexostock_state`, com o estado operacional como agregado JSONB. As transações usam `SELECT ... FOR UPDATE`, validação e `COMMIT`/`ROLLBACK`.
- Login: hash scrypt com salt, cookie HttpOnly/SameSite/Secure no modo online e expiração por inatividade.
- Inicialização: não substitui os dados existentes ao publicar uma nova versão.

Esta estrutura conserva o modelo da primeira iteração. É adequada à demonstração com um servidor; normalização das tabelas, sessões compartilhadas e índices são evoluções futuras. Quando o serviço reinicia, os registros permanecem no banco, mas é preciso entrar novamente.

## Verificação

```bash
npm ci
npm test
```

A suíte cobre os fluxos originais e a configuração online. O SQL é executado em PostgreSQL embarcado (PGlite) nos testes, incluindo rollback, reserva concorrente, reinício e login privado. A conexão com a conta real Neon e o domínio real Render devem ser conferidos após a implantação. Não foi feita publicação nas contas do usuário nem verificação visual interativa em navegador nesta etapa.

## Documentos

- [Guia do usuário](docs/guia-do-usuario.pdf)
- [Diagrama de implantação online](docs/diagrama-de-implantacao.pdf)
- [Diagrama editável](docs/diagrama-de-implantacao.puml)
- [Tutorial de publicação](docs/Como_publicar_GitHub.pdf)

## Limitações e conservação

Canais, transporte e fiscal continuam como simulações explícitas. O estado do banco não é substituído por atualizações de código. A exclusão do projeto Neon exclui seus dados. Planeje cópias com as ferramentas do PostgreSQL/provedor; esta edição online não implementa uma agenda própria de backups. O relatório exportado não contém senhas e não é uma cópia completa para restauração.

Render Free pode suspender a aplicação após inatividade e levar aproximadamente um minuto para acordar. Neon e Render possuem limites de plano; selecione Free e confira os termos atuais ao cadastrar. Esta configuração se destina à demonstração acadêmica, não a uma homologação de escala ou operação comercial.
