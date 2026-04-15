# Fluxo do Pedido

## Fluxo Principal

```
INÍCIO
  │
  ▼
[Tela: Categorias]  ← Cards coloridos, um toque
  │
  ▼ (clica categoria)
[Tela: Produtos]  ← Cards com nome + preço + preço combo
  │
  ▼ (clica produto)
[Tem acompanhamento?]
  │ SIM                    │ NÃO
  ▼                        │
[Tela: Acompanhamento]     │
  │ (clica opção)          │
  ▼                        ▼
[Tela: Bebida?]  ← "Sem bebida" ou lista de bebidas
  │ (clica opção ou "sem")
  ▼
[Tela: Sobremesa?]  ← "Sem sobremesa" ou lista
  │ (clica opção ou "sem")
  ▼
[Tela: Confirmar Item]  ← Mostra resumo + preço calculado + combo badge
  │ (clica "Adicionar ao Pedido")
  ▼
[Item adicionado ao carrinho lateral]
  │
  ├─→ [+ Adicionar outro item] → volta para Categorias
  │
  ▼ (clica "Fechar Pedido")
[Tela: Resumo/Fechamento]
  │ - Lista todos os itens
  │ - Total calculado
  │ - Campo de observação geral
  │
  ▼ (clica "Confirmar e Imprimir")
[Sistema:]
  │ 1. Gera número do pedido (sequencial do dia)
  │ 2. Salva no SQLite
  │ 3. Imprime no caixa (USB)
  │ 4. Imprime na cozinha (rede)
  │
  ▼
[Tela: Sucesso]
  │ - Mostra número do pedido
  │ - Status de impressão
  │ - Botão "Novo Pedido"
  │ - Botão "Reimprimir"
  │
  ▼
FIM (ou novo pedido)
```

## Cálculo Automático de Combo

### Quando o combo é aplicado:
1. O produto tem uma regra de combo vinculada
2. O produto tem `preco_combo > 0`
3. Se a regra exige bebida: o cliente escolheu uma bebida que `participa_combo = 1`
4. Se a regra exige sobremesa: o cliente escolheu uma sobremesa que `participa_combo = 1`
5. Todas as condições acima devem ser verdadeiras

### Quando o combo NÃO é aplicado:
- Cliente não escolheu bebida (e regra exige)
- Cliente não escolheu sobremesa (e regra exige)
- Bebida escolhida não participa do combo
- Sobremesa escolhida não participa do combo
- Produto não tem regra de combo

### Cálculo do preço:
- **COM combo:** subtotal = `preco_combo` (já inclui prato + bebida + sobremesa)
- **SEM combo:** subtotal = `preco` + `bebida_preco` + `sobremesa_preco`

## Exemplos

### Exemplo 1: Frango à Parmegiana COM combo
- Frango à Parmegiana: R$ 34,90 (avulso) / R$ 44,90 (combo)
- Acompanhamento: Purê
- Bebida: Pepsi Lata (participa combo) - R$ 6,00
- Sobremesa: Brigadeirão (participa combo) - R$ 10,00
- **Resultado:** COMBO aplicado → R$ 44,90 (economia de R$ 6,90)

### Exemplo 2: Frango à Parmegiana SEM combo
- Frango à Parmegiana: R$ 34,90
- Acompanhamento: Purê
- Bebida: Cerveja (NÃO participa combo) - R$ 12,00
- Sobremesa: Nenhuma
- **Resultado:** Sem combo → R$ 34,90 + R$ 12,00 = R$ 46,90

### Exemplo 3: Frango à Parmegiana parcial
- Frango à Parmegiana: R$ 34,90
- Acompanhamento: Batata Frita
- Bebida: Nenhuma
- Sobremesa: Nenhuma
- **Resultado:** Sem combo → R$ 34,90

## Número do Pedido

- Sequencial por dia: 001, 002, 003...
- Reinicia todo dia
- Gerado automaticamente no momento da confirmação
- Query: `MAX(numero) + 1` filtrado por `date(data_hora) = hoje`
