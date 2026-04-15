# Modelagem do Banco de Dados

## Diagrama de Entidades

```
categorias (1) ──── (N) produtos (N) ──── (N) acompanhamentos
                         │
                         │ (N:N)
                         │
                    regras_combo
                         
pedidos (1) ──── (N) pedido_itens

impressoras
configuracoes
```

## Tabelas

### categorias
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER PK | Identificador |
| nome | TEXT | Nome da categoria (ex: Parmegianas) |
| ordem | INTEGER | Ordem de exibição |
| ativo | INTEGER | 1=ativo, 0=inativo |

### produtos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER PK | Identificador |
| categoria_id | INTEGER FK | Categoria do produto |
| nome | TEXT | Nome do prato |
| descricao | TEXT | Descrição curta |
| preco | REAL | Preço normal (avulso) |
| preco_combo | REAL | Preço quando em combo (inclui bebida+sobremesa) |
| ativo | INTEGER | 1=ativo, 0=inativo |
| ordem | INTEGER | Ordem de exibição |

### acompanhamentos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER PK | Identificador |
| nome | TEXT | Nome (ex: Purê, Batata Frita) |
| ativo | INTEGER | 1=ativo, 0=inativo |

### produto_acompanhamento
| Campo | Tipo | Descrição |
|-------|------|-----------|
| produto_id | INTEGER FK | Produto |
| acompanhamento_id | INTEGER FK | Acompanhamento |
| UNIQUE | | Par único produto+acompanhamento |

### bebidas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER PK | Identificador |
| nome | TEXT | Nome da bebida |
| preco | REAL | Preço da bebida avulsa |
| participa_combo | INTEGER | 1=pode entrar no combo, 0=só avulsa |
| ativo | INTEGER | 1=ativo, 0=inativo |

### sobremesas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER PK | Identificador |
| nome | TEXT | Nome da sobremesa |
| preco | REAL | Preço avulsa |
| participa_combo | INTEGER | 1=pode entrar no combo, 0=só avulsa |
| ativo | INTEGER | 1=ativo, 0=inativo |

### regras_combo
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER PK | Identificador |
| nome | TEXT | Nome da regra (ex: Combo Completo) |
| descricao | TEXT | Descrição |
| exige_bebida | INTEGER | 1=bebida obrigatória no combo |
| exige_sobremesa | INTEGER | 1=sobremesa obrigatória no combo |
| ativo | INTEGER | 1=ativo, 0=inativo |

### produto_regra_combo
| Campo | Tipo | Descrição |
|-------|------|-----------|
| produto_id | INTEGER FK | Produto |
| regra_combo_id | INTEGER FK | Regra |

### pedidos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER PK | Identificador |
| numero | INTEGER | Número sequencial do dia (001, 002...) |
| data_hora | TEXT | Data/hora da criação |
| subtotal | REAL | Soma dos itens |
| desconto | REAL | Desconto aplicado |
| total | REAL | Valor final |
| observacao | TEXT | Observação geral |
| status | TEXT | Status do pedido |
| impresso_caixa | INTEGER | 1=impresso no caixa |
| impresso_cozinha | INTEGER | 1=impresso na cozinha |

### pedido_itens (desnormalizada)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER PK | Identificador |
| pedido_id | INTEGER FK | Pedido |
| produto_id | INTEGER | Referência ao produto |
| produto_nome | TEXT | Nome do produto (snapshot) |
| produto_preco | REAL | Preço no momento (snapshot) |
| acompanhamento_id | INTEGER | Referência |
| acompanhamento_nome | TEXT | Nome (snapshot) |
| bebida_id | INTEGER | Referência |
| bebida_nome | TEXT | Nome (snapshot) |
| bebida_preco | REAL | Preço (snapshot) |
| sobremesa_id | INTEGER | Referência |
| sobremesa_nome | TEXT | Nome (snapshot) |
| sobremesa_preco | REAL | Preço (snapshot) |
| combo_aplicado | INTEGER | 1=combo aplicado neste item |
| preco_combo | REAL | Preço combo utilizado |
| subtotal | REAL | Total do item |
| observacao | TEXT | Observação do item |

### impressoras
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER PK | Identificador |
| nome | TEXT | Nome descritivo |
| tipo | TEXT | 'caixa' ou 'cozinha' |
| conexao | TEXT | 'usb' ou 'rede' |
| endereco | TEXT | IP (para rede) |
| porta | INTEGER | Porta TCP (padrão 9100) |
| vendor_id | TEXT | Vendor ID USB (hex) |
| product_id | TEXT | Product ID USB (hex) |
| ativo | INTEGER | 1=ativo |

### configuracoes
| Campo | Tipo | Descrição |
|-------|------|-----------|
| chave | TEXT PK | Nome da configuração |
| valor | TEXT | Valor |

## Lógica de Combo

O cálculo de combo é feito por item do pedido:

1. Verifica se o produto tem `regra_combo` vinculada
2. Verifica se o produto tem `preco_combo > 0`
3. Se a regra exige bebida: verifica se a bebida escolhida tem `participa_combo = 1`
4. Se a regra exige sobremesa: verifica se a sobremesa escolhida tem `participa_combo = 1`
5. Se TODAS as condições são atendidas: `subtotal = preco_combo`
6. Caso contrário: `subtotal = preco + bebida_preco + sobremesa_preco`

O `preco_combo` já inclui o valor da bebida e sobremesa do combo.
