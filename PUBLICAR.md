# Publicar NexoStock: GitHub + Render + Neon

Use o pacote **NexoStock_GitHub.zip**, versão online 1.1. Extraia tudo primeiro. Não envie apenas o ZIP ao GitHub: a hospedagem precisa ler os arquivos extraídos.

## 1. Enviar os arquivos para o GitHub

1. Acesse https://github.com/new e entre em sua conta.
2. Em **Repository name**, escreva `nexostock`.
3. Escolha **Private** para manter o código restrito à equipe. O site pode ser acessível mesmo com o código privado.
4. Crie o repositório com **Create repository**. Em um repositório vazio, use o link **uploading an existing file**. Se já houver arquivos, use **Add file > Upload files**.
5. Abra a pasta extraída `nexostock-online`. Arraste para o GitHub os arquivos e pastas que estão **dentro dela**.
6. Escreva `Primeira versão online do NexoStock` e conclua **Commit changes**. Se a interface propuser uma branch, conclua a proposta e o merge para `main`.
7. Confira: `package.json`, `package-lock.json`, `server.js` e `render.yaml` devem aparecer na página principal do repositório. As pastas `public`, `docs` e `tests` também devem estar presentes.

Se você estiver vendo somente uma pasta `nexostock-online`, os arquivos ficaram um nível abaixo. Para este tutorial, envie o conteúdo dessa pasta para a raiz. Não ative GitHub Pages para esta versão.

## 2. Criar o banco persistente no Neon

1. Acesse https://neon.com e crie uma conta/entre.
2. Crie um projeto chamado `nexostock`, usando o plano **Free** e PostgreSQL.
3. Abra **Connect** e copie a **Connection string** completa, iniciada por `postgresql://`.
4. Mantenha a senha real da conexão, não um marcador como `[YOUR_PASSWORD]`. Se a tela mostrar `psql 'postgresql://...'`, copie somente a URL de dentro das aspas, sem `psql` e sem aspas.
5. Guarde essa conexão para colar no Render. Ela contém uma senha: não a coloque em arquivos do repositório, prints públicos ou mensagens ao professor.

O sistema cria a tabela e os dados fictícios de exemplo na primeira execução. Você não precisa criar tabelas manualmente. Esse banco será separado dos dados que você eventualmente já cadastrou na versão local.

## 3. Conectar o GitHub ao Render

1. Acesse https://dashboard.render.com e crie uma conta/entre.
2. Clique em **New > Blueprint**.
3. Conecte sua conta GitHub e autorize acesso ao repositório `nexostock`.
4. Selecione o repositório. Use a branch `main` e o arquivo `render.yaml` da raiz.
5. Dê um nome ao Blueprint, por exemplo `nexostock-online`.
6. Preencha os três campos solicitados:

| Campo | O que colocar |
| --- | --- |
| `DATABASE_URL` | A Connection string que você copiou do Neon. |
| `ADMIN_EMAIL` | Seu e-mail de acesso ao NexoStock. |
| `ADMIN_PASSWORD` | Uma senha particular, com 12 a 128 caracteres. |

O arquivo já define `NODE_ENV=production`, Node 24 e plano **Free**. Nenhuma compra é necessária para esse caminho dentro das cotas gratuitas. Confira os planos antes de confirmar; não selecione upgrade pago para seguir este tutorial.

7. Clique em **Deploy Blueprint** ou **Apply**, conforme a tela.
8. Espere a criação e a implantação terminarem. Abra o serviço web **nexostock**.
9. Quando aparecer **Live**, clique na URL HTTPS terminada em `.onrender.com` exibida pelo Render. Esse será o link para compartilhar a aplicação.
10. Entre usando `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Cadastre os outros integrantes em **Usuários**.

## Se preferir configurar como Web Service

Use esta alternativa apenas se não usar o Blueprint. Não crie os dois serviços.

No Render, escolha **New > Web Service**, conecte o mesmo repositório e configure:

| Campo | Valor |
| --- | --- |
| Language / Runtime | Node |
| Branch | main |
| Root Directory | deixe vazio, com arquivos na raiz |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance Type | Free |
| Environment | `NODE_ENV=production`, `NODE_VERSION=24` e os três campos da tabela anterior |

O Render fornece automaticamente `PORT` e `RENDER_EXTERNAL_URL`. Não configure o endereço como localhost. Para um domínio próprio, defina `APP_URL` com seu endereço HTTPS exato, sem caminhos.

## Conferir depois de publicar

1. Faça login com sua conta de administrador.
2. Cadastre um produto de teste e registre uma entrada de estoque.
3. Crie um pedido, confira os itens e registre o envio.
4. Saia, entre novamente e confirme que os registros permanecem.
5. No Render, reinicie o serviço e confira novamente após o novo login. Isso verifica a conexão persistente na hospedagem real.

## Atualizar o site depois

Envie os arquivos alterados ao mesmo repositório e conclua o commit na branch conectada. Com o deploy automático habilitado, o Render publica a nova versão. A atualização do código não recria o banco e não apaga seus cadastros.

`ADMIN_EMAIL` e `ADMIN_PASSWORD` servem para criar a conta inicial em um banco vazio. Depois, altere dados e senhas pelo menu **Usuários**, não pelas variáveis de inicialização.

## Dúvidas comuns

- **Site demora na primeira abertura:** Render Free suspende o processo após 15 minutos sem tráfego. Ao abrir novamente, pode levar cerca de um minuto. O banco permanece no Neon.
- **Cannot find package.json:** os arquivos foram enviados dentro de uma pasta extra. Coloque o conteúdo na raiz do repositório.
- **Falha na instalação npm ci:** confirme que enviou `package-lock.json` junto com `package.json`.
- **Erro de conexão com banco:** confira a URL completa do Neon, a senha e se o projeto continua ativo.
- **Login antigo Nexo@2026! não funciona online:** use o e-mail e a senha que definiu no Render. As contas locais não são criadas na publicação.
- **Host não permitido:** confira `APP_URL`, se definido. No endereço padrão Render, deixe essa variável ausente para usar a detecção automática.
- **Os dados locais não apareceram online:** os ambientes usam bancos diferentes. A migração de cadastros locais não é automática.

Os serviços possuem cotas e políticas de plano. Confira os limites atuais nos painéis. Os documentos fiscais e as integrações externas continuam sendo simulações para a apresentação acadêmica.

## Referências oficiais consultadas em 30/09/2026

- GitHub, upload de arquivos: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- Render, aplicação Node: https://render.com/docs/deploy-node-express-app
- Render, Blueprint: https://render.com/docs/blueprint-spec
- Render, limites gratuitos: https://render.com/docs/free
- Neon, conexão: https://neon.com/docs/connect/connect-from-any-app
- Neon, planos: https://neon.com/pricing
