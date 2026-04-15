# Manual de Operação

## Para o Atendente

### Lançar um Pedido (passo a passo)

1. Abra o sistema no navegador: `http://localhost:5000`
2. Clique em **Novo Pedido** no menu lateral (já é a tela inicial)
3. **Escolha a categoria** do prato (ex: Parmegianas)
4. **Escolha o prato** (ex: Frango à Parmegiana)
5. Se o prato tem acompanhamento, **escolha o acompanhamento** (ex: Purê)
6. **Bebida?** Clique na bebida desejada ou "Sem bebida"
7. **Sobremesa?** Clique na sobremesa desejada ou "Sem sobremesa"
8. Na tela de confirmação, confira o preço e adicione observação se necessário
9. Clique **"Adicionar ao Pedido"**
10. O item aparece no carrinho lateral à direita
11. Para adicionar mais itens, repita os passos 3-10
12. Quando terminar, clique **"Fechar Pedido"**
13. Confira o resumo, adicione observação geral se necessário
14. Clique **"Confirmar e Imprimir"**
15. O sistema imprime no caixa e na cozinha automaticamente

### Dicas para o atendente
- O combo é calculado automaticamente, não precisa calcular nada
- Se errou um item, clique no X no carrinho lateral para remover
- Para limpar todo o pedido, clique "Limpar Pedido" no topo
- O número do pedido é gerado automaticamente

### Reimprimir um pedido
1. Clique em **Pedidos do Dia** no menu
2. Encontre o pedido na lista
3. Clique **Reimprimir**

## Para o Administrador

### Cadastrar uma nova categoria
1. Menu lateral > **Categorias**
2. Digite o nome e ordem
3. Clique **Salvar**

### Cadastrar um novo produto
1. Menu lateral > **Produtos**
2. Preencha: categoria, nome, descrição, preço, preço combo
3. Selecione os acompanhamentos disponíveis para este prato
4. Selecione a regra de combo (se aplicável)
5. Clique **Salvar**

### Cadastrar acompanhamento
1. Menu lateral > **Acompanhamentos**
2. Digite o nome (ex: Purê de Batata)
3. Clique **Salvar**
4. Depois, vincule ao produto na tela de Produtos

### Cadastrar bebida
1. Menu lateral > **Bebidas**
2. Preencha nome e preço
3. Marque "Participa do Combo" se esta bebida pode entrar em combos
4. Clique **Salvar**

### Cadastrar sobremesa
1. Menu lateral > **Sobremesas**
2. Preencha nome e preço
3. Marque "Participa do Combo" se pode entrar em combos
4. Clique **Salvar**

### Criar regra de combo
1. Menu lateral > **Regras de Combo**
2. Dê um nome à regra (ex: "Combo Completo")
3. Marque se exige bebida e/ou sobremesa
4. Selecione quais produtos usam esta regra
5. Clique **Salvar**

### Alterar preços
1. Menu lateral > **Produtos**
2. Clique **Editar** no produto desejado
3. Altere o preço e/ou preço combo
4. Clique **Salvar**

### Configurar impressoras
1. Menu lateral > **Impressoras**
2. Configure o nome do restaurante
3. Cadastre as impressoras (caixa USB e cozinha rede)
4. Quando tiver as impressoras físicas, desmarque "Modo simulação"
