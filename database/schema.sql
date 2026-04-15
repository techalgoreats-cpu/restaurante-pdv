-- ============================================
-- Restaurante PDV - Schema SQLite v2
-- ============================================

-- Categorias do cardápio
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    qtd_acompanhamentos INTEGER DEFAULT 0,
    acompanhamento_label TEXT DEFAULT 'Escolha o acompanhamento',
    acompanhamento_fixo TEXT DEFAULT '',
    preco_bebida_especial REAL DEFAULT 0,
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime')),
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Produtos (pratos)
CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    preco REAL NOT NULL DEFAULT 0,
    tem_combo INTEGER DEFAULT 1,
    ativo INTEGER DEFAULT 1,
    ordem INTEGER DEFAULT 0,
    criado_em TEXT DEFAULT (datetime('now', 'localtime')),
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- Acompanhamentos (purê, batata, fritas, etc.)
CREATE TABLE IF NOT EXISTS acompanhamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Vínculo produto <-> acompanhamento (N:N)
CREATE TABLE IF NOT EXISTS produto_acompanhamento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL,
    acompanhamento_id INTEGER NOT NULL,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    FOREIGN KEY (acompanhamento_id) REFERENCES acompanhamentos(id) ON DELETE CASCADE,
    UNIQUE(produto_id, acompanhamento_id)
);

-- Bebidas
CREATE TABLE IF NOT EXISTS bebidas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    preco REAL NOT NULL DEFAULT 0,
    participa_combo INTEGER DEFAULT 0,
    participa_especial INTEGER DEFAULT 0,
    ativo INTEGER DEFAULT 1,
    ordem INTEGER DEFAULT 0,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Sobremesas
CREATE TABLE IF NOT EXISTS sobremesas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    preco REAL NOT NULL DEFAULT 0,
    participa_combo INTEGER DEFAULT 0,
    ativo INTEGER DEFAULT 1,
    ordem INTEGER DEFAULT 0,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Extras pagos (caldo, saladinha, acompanhamento extra, etc.)
CREATE TABLE IF NOT EXISTS extras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    preco REAL NOT NULL DEFAULT 0,
    ativo INTEGER DEFAULT 1,
    ordem INTEGER DEFAULT 0,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Vínculo categoria <-> extras disponíveis (N:N)
CREATE TABLE IF NOT EXISTS categoria_extra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER NOT NULL,
    extra_id INTEGER NOT NULL,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
    FOREIGN KEY (extra_id) REFERENCES extras(id) ON DELETE CASCADE,
    UNIQUE(categoria_id, extra_id)
);

-- Regras de combo
CREATE TABLE IF NOT EXISTS regras_combo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    valor_adicional REAL NOT NULL DEFAULT 10.90,
    exige_bebida INTEGER DEFAULT 1,
    exige_sobremesa INTEGER DEFAULT 1,
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Vínculo produto <-> regra de combo (N:N)
CREATE TABLE IF NOT EXISTS produto_regra_combo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL,
    regra_combo_id INTEGER NOT NULL,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    FOREIGN KEY (regra_combo_id) REFERENCES regras_combo(id) ON DELETE CASCADE,
    UNIQUE(produto_id, regra_combo_id)
);

-- Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero INTEGER NOT NULL,
    pager INTEGER DEFAULT 0,
    data_hora TEXT DEFAULT (datetime('now', 'localtime')),
    subtotal REAL DEFAULT 0,
    desconto REAL DEFAULT 0,
    total REAL DEFAULT 0,
    observacao TEXT DEFAULT '',
    status TEXT DEFAULT 'aberto',
    impresso_caixa INTEGER DEFAULT 0,
    impresso_cozinha INTEGER DEFAULT 0,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Itens do pedido
CREATE TABLE IF NOT EXISTS pedido_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    produto_id INTEGER,
    produto_nome TEXT NOT NULL,
    produto_preco REAL NOT NULL DEFAULT 0,
    acompanhamentos_txt TEXT DEFAULT '',
    bebida_id INTEGER,
    bebida_nome TEXT DEFAULT '',
    bebida_preco REAL DEFAULT 0,
    sobremesa_id INTEGER,
    sobremesa_nome TEXT DEFAULT '',
    sobremesa_preco REAL DEFAULT 0,
    extras_txt TEXT DEFAULT '',
    extras_preco REAL DEFAULT 0,
    combo_aplicado INTEGER DEFAULT 0,
    valor_combo REAL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0,
    observacao TEXT DEFAULT '',
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

-- Impressoras configuradas
CREATE TABLE IF NOT EXISTS impressoras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('caixa', 'cozinha')),
    conexao TEXT NOT NULL CHECK(conexao IN ('usb', 'rede')),
    endereco TEXT DEFAULT '',
    porta INTEGER DEFAULT 9100,
    vendor_id TEXT DEFAULT '',
    product_id TEXT DEFAULT '',
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Configurações gerais
CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT DEFAULT ''
);

-- Log de alterações administrativas
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    acao TEXT NOT NULL,
    entidade TEXT NOT NULL,
    entidade_id INTEGER,
    detalhe TEXT DEFAULT '',
    data_hora TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON pedidos(data_hora);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos(numero);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido ON pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_logs_data ON logs(data_hora);

-- Configurações padrão
INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('nome_restaurante', 'Griletto');
INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('impressao_automatica', '1');
INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('modo_simulacao_impressora', '1');
INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('admin_user', 'admin');
INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('admin_senha', 'al2420');
