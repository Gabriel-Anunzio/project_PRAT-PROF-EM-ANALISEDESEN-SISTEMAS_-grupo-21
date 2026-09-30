# Guia do usuário
## NexoStock
Sistema de Gestão de Estoque e Pedidos para Operações de E-commerce Multicanal.

**1ª iteração da fase de construção · Grupo 21 · 2026**

Este guia apresenta o acesso e as operações disponíveis na aplicação web. Os registros de exemplo são fictícios e destinam-se à demonstração acadêmica.

### 1. Entrar no sistema
1. Acesse o sistema pelo link: **https://nexostock-qbwn.onrender.com/**.
2. Na tela de acesso, utilize a credencial correspondente ao seu nome. Os dois acessos possuem perfil **Administrador**.

| Professor | E-mail | Perfil | Senha |
| --- | --- | --- | --- |
| Cristiano Morais de Sousa | cristiano.sousa@nexostock.local | **Administrador** | **cristiano.sousa** |
| Joaquim Pessoa Filho | joaquim.pessoa@nexostock.local | **Administrador** | **joaquim.pessoa** |

3. Clique em **Entrar**. O sistema abrirá a tela **Visão geral**.

É necessário um navegador atualizado e conexão com a internet. Não é preciso instalar o sistema no computador.

### Perfis de acesso
| Perfil | Áreas disponíveis |
| --- | --- |
| Administrador | Todas as áreas, incluindo cadastro e edição de usuários. |
| Gestor | Produtos, estoque, pedidos, expedição, canais, documentos fiscais demonstrativos e relatórios. |
| Operador | Estoque, pedidos e expedição, além da visão geral. |

### Navegação e saída
Selecione uma opção no menu lateral. Em telas pequenas, abra o menu pelo botão no cabeçalho. Produtos, estoque e pedidos possuem busca; estoque e pedidos também oferecem filtros.

Use **Guia do usuário** para reabrir este documento e **Diagrama de implantação** para consultar a arquitetura. Clique em **Sair** para encerrar o acesso. Após 30 minutos sem atividade no servidor, a sessão expira e é necessário entrar novamente.

### Visão geral
O painel apresenta pedidos em operação, unidades disponíveis, produtos em alerta e vendas expedidas. Vendas expedidas considera os pedidos enviados e entregues. Os indicadores variam conforme as operações registradas pelos usuários.

<!-- page -->
## 2. Produtos e estoque

### Cadastrar um produto
1. Abra **Produtos** e clique em **Cadastrar produto**.
2. Preencha nome, SKU, categoria, variante, preço de venda, custo unitário, estoque mínimo, unidade e peso. O código de barras é opcional.
3. Clique em **Salvar**. O SKU deve ser exclusivo; utilize outro SKU para uma variante de cor ou tamanho diferente.

O cadastro do produto não adiciona unidades ao estoque. Para disponibilizar mercadoria, registre uma entrada. Use **Editar** para alterar o cadastro ou desmarcar **Produto ativo**.

### Registrar uma entrada
1. Abra **Estoque > Registrar entrada**.
2. Selecione produto e depósito. Informe quantidade recebida, custo unitário, fornecedor e **Documento de origem único**.
3. Clique em **Salvar**. O saldo físico aumenta e o custo médio é recalculado.

O mesmo documento de origem não pode ser usado para registrar novamente a entrada. Antes de repetir uma operação, confira se ela já aparece no histórico.

### Entender os saldos
| Saldo | Significado |
| --- | --- |
| Físico | Unidades registradas no depósito. |
| Reservado | Unidades comprometidas com pedidos ainda não enviados. |
| Disponível | Saldo físico menos o reservado; quantidade liberada para novos pedidos. |
| Em trânsito | Mercadorias transferidas que ainda aguardam recebimento no destino. |

### Ajustar inventário e consultar o histórico
Em **Estoque > Ajustar inventário**, escolha produto e depósito, informe a quantidade física contada e uma justificativa. A contagem deve ser inteira e não pode ser menor que a quantidade reservada.

Na tabela **Posição de estoque**, clique em **Kardex** para consultar data, tipo de movimentação, quantidade, saldo físico, referência e usuário responsável pelo produto no depósito selecionado.

<!-- page -->
## 3. Pedidos e expedição

### Criar um pedido
1. Abra **Pedidos > Novo pedido**.
2. Informe cliente, canal de venda, depósito de atendimento e referência única.
3. Escolha produto e quantidade. Use **Adicionar item** para incluir outros produtos.
4. Clique em **Salvar**. O pedido ficará **Reservado** e o sistema comprometerá o saldo necessário.

Se qualquer item não tiver saldo suficiente, o pedido inteiro é recusado e não são criadas reservas parciais. Os preços vêm do cadastro dos produtos e o total é calculado pelo sistema.

### Separar, conferir e enviar
1. Em **Expedição**, localize o pedido e clique em **Detalhes**.
2. Clique em **Iniciar separação**. O pedido passa para **Separação**.
3. Marque **Conferido** em cada item e clique em **Concluir conferência**. Todos os itens devem estar conferidos.
4. Quando o pedido estiver **Pronto**, clique em **Registrar envio**. Informe transportadora e código de rastreamento, depois salve.
5. Após o recebimento pelo cliente, abra os detalhes do pedido e clique em **Confirmar entrega**.

O envio reduz o saldo físico e libera a reserva em uma única operação. O sistema impede um segundo envio do mesmo pedido.

### Cancelar antes do envio
Abra **Pedidos > Detalhes > Cancelar pedido** e confirme. As reservas são liberadas. Pedidos enviados, entregues ou já cancelados não podem ser cancelados nesta iteração.

### Exemplo de alteração do saldo
| Momento | Físico | Reservado | Disponível |
| --- | --- | --- | --- |
| Antes do pedido | 10 | 0 | 10 |
| Pedido de 3 unidades reservado | 10 | 3 | 7 |
| Pedido enviado | 7 | 0 | 7 |

<!-- page -->
## 4. Depósitos e recursos de demonstração

### Criar depósito e transferir mercadorias
1. Em **Estoque > Novo depósito**, informe nome e localização e salve.
2. Clique em **Transferir**. Escolha produto, depósito de origem, depósito de destino, quantidade e referência única.
3. Salve. O saldo sai da origem e a transferência fica **Em trânsito**. O destino ainda não recebe as unidades.
4. Após a chegada da mercadoria, localize a transferência e clique em **Confirmar recebimento**. O saldo do destino aumenta e a situação passa para **Recebida**.

A transferência usa apenas saldo disponível. Não é possível confirmar duas vezes o mesmo recebimento.

### Canais de venda
Em **Canais de venda**, escolha um canal e clique em **Simular sincronização**. Quando há saldo disponível, o sistema importa um pedido fictício por canal e por dia. Repetir a operação não duplica esse pedido. Consulte o resultado em **Histórico de sincronização**.

Nenhuma conta real de marketplace está conectada. A ação simula a importação de pedidos; não publica estoque nem envia informações a plataformas externas.

### Etiqueta de demonstração
Abra os detalhes de um pedido **Pronto**, **Enviado** ou **Entregue** e selecione **Etiqueta de demonstração**. Clique em **Imprimir / salvar PDF** para abrir a impressão do navegador.

A etiqueta é interna e está identificada como teste. Não deve ser utilizada para postagem.

### Documentos fiscais demonstrativos
Em **Documentos fiscais**, localize um pedido não cancelado e clique em **Gerar demonstração**. Confirme a operação. Use **Visualizar** para consultar o documento e **Imprimir / salvar PDF** para imprimi-lo.

É gerado um único documento de demonstração por pedido. O documento **não possui validade fiscal** e não substitui NF-e ou NFC-e.

<!-- page -->
## 5. Relatórios e administração de acesso

### Consultar indicadores e exportar
Abra **Relatórios** para consultar receita expedida, ticket médio, valor do estoque e quantidade de movimentações. A tela também apresenta resultados por canal e as 40 ocorrências mais recentes da trilha de auditoria.

- **Exportar estoque CSV:** baixa uma tabela com SKU, produto, variante, depósito, saldos e custo médio.
- **Exportar dados:** baixa os registros operacionais disponíveis ao perfil, em JSON, sem hashes de senha.

Essas exportações servem para consulta. Elas não realizam a restauração do banco de dados.

### Cadastrar usuários
Esta área é exclusiva do perfil **Administrador**.

1. Abra **Usuários > Novo usuário**.
2. Informe nome, e-mail, perfil e senha inicial com **10 a 128 caracteres**.
3. Mantenha **Acesso ativo** marcado e clique em **Salvar**.
4. Encaminhe as credenciais ao titular da conta em canal reservado.

Em **Editar**, é possível trocar o perfil, redefinir a senha ou desativar o acesso. Para conservar a senha atual, deixe **Nova senha (opcional)** em branco. O administrador não pode desativar nem retirar o próprio perfil de administrador.

### Acesso do avaliador
O grupo deve fornecer uma conta de avaliação. O perfil **Administrador** permite observar também a gestão de usuários; o perfil **Gestor** permite avaliar as demais áreas de gestão. O usuário não precisa conhecer nem configurar os serviços de hospedagem para utilizar o sistema.

### Continuidade dos registros
Os cadastros e as operações são compartilhados entre os usuários e permanecem salvos no banco da aplicação. Fechar o navegador ou sair da conta não apaga os dados. Se o serviço for reiniciado, será necessário realizar novo login.

<!-- page -->
## 6. Percurso de avaliação e dúvidas

### Percurso sugerido
1. Entre no sistema e consulte a **Visão geral**.
2. Cadastre um produto chamado **Produto de avaliação**, com SKU exclusivo, preço de R$ 20,00 e custo de R$ 10,00.
3. Registre uma entrada de **10 unidades**, com custo de R$ 10,00, no depósito escolhido. Utilize uma referência exclusiva para a entrada.
4. Crie um pedido de **3 unidades** desse produto no mesmo depósito. Confira: físico 10, reservado 3 e disponível 7.
5. Inicie a separação, confira o item, conclua a conferência e registre o envio com dados de demonstração.
6. Verifique que o saldo passou a físico 7, reservado 0 e disponível 7. Confirme a entrega e consulte o **Kardex** e os **Relatórios**.

Esse exemplo considera um produto novo, sem outras operações simultâneas sobre seu saldo. A avaliação cria registros reais dentro da base acadêmica compartilhada. Use nomes, SKUs e referências exclusivos a cada execução.

### Dúvidas frequentes
| Situação | Orientação |
| --- | --- |
| E-mail ou senha incorretos | Confira os dados de acesso recebidos. Solicite a redefinição ao administrador se necessário. |
| Muitas tentativas de login | Aguarde um minuto antes de tentar novamente. |
| Sessão expirada | Entre novamente com sua conta. |
| Menu não aparece | A opção depende do perfil. Consulte o administrador sobre o acesso necessário. |
| Estoque insuficiente | Reduza a quantidade, escolha outro depósito ou registre uma entrada. |
| SKU ou referência já usados | Confira o registro existente. Use um identificador novo apenas para uma nova operação. |
| Conferência incompleta | Inicie a separação e marque todos os itens como conferidos. |
| Site não abre ou demora a responder | Confira a internet e o link recebido. Aguarde e tente novamente; se persistir, avise o grupo responsável. |

**Responsável pelo suporte acadêmico:** equipe do projeto NexoStock, Grupo 21.
