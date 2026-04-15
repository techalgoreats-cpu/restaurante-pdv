# Arquitetura do Sistema - Restaurante PDV

## Visão Geral

Sistema de pedidos para restaurante com foco em simplicidade, velocidade de operação e baixa complexidade de infraestrutura.

## Stack Tecnológica

| Componente | Tecnologia | Justificativa |
|-----------|-----------|---------------|
| Backend | Python 3 + Flask | Leve, simples, serve HTML e API REST |
| Banco de dados | SQLite | Arquivo único, zero configuração, backup por cópia |
| Frontend | HTML + CSS + JS puro | Zero build, sem frameworks, carregamento instantâneo |
| Impressão | python-escpos | Suporte nativo ESC/POS para USB e rede |
| Servidor prod | Waitress | WSGI puro Python, roda em Windows sem compilação |

## Arquitetura de Camadas

```
┌─────────────────────────────────────┐
│         Frontend (SPA)              │
│   HTML + CSS + JavaScript puro      │
│   Templates Jinja2 (Flask)          │
├─────────────────────────────────────┤
│         API REST (Flask)            │
│   /api/categorias                   │
│   /api/produtos                     │
│   /api/bebidas                      │
│   /api/sobremesas                   │
│   /api/acompanhamentos              │
│   /api/regras-combo                 │
│   /api/pedidos                      │
│   /api/impressoras                  │
│   /api/configuracoes                │
├─────────────────────────────────────┤
│     Camada de Dados (database.py)   │
│     SQLite + queries diretas        │
├─────────────────────────────────────┤
│     Módulo Impressão (printer/)     │
│     ESC/POS USB + Rede + Simulação  │
├─────────────────────────────────────┤
│         SQLite (arquivo .db)        │
└─────────────────────────────────────┘
```

## Estrutura de Diretórios

```
restaurante-pdv/
├── app/
│   ├── __init__.py
│   ├── main.py              # Flask app factory
│   ├── database.py          # Acesso ao SQLite
│   ├── routes_cadastros.py  # Rotas CRUD
│   └── routes_pedidos.py    # Rotas de pedidos + combo
├── templates/
│   └── index.html           # SPA principal
├── static/
│   ├── css/
│   │   └── style.css        # Estilos
│   └── js/
│       ├── api.js           # Módulo de comunicação
│       └── app.js           # Lógica da interface
├── database/
│   ├── schema.sql           # Schema do banco
│   ├── restaurante.db       # Banco SQLite (gerado)
│   └── impressoes/          # Impressões simuladas (gerado)
├── printer/
│   ├── __init__.py
│   └── impressora.py        # Módulo de impressão
├── seed/
│   └── seed_data.py         # Dados de exemplo
├── docs/                    # Documentação
├── run.py                   # Inicializador
└── requirements.txt         # Dependências Python
```

## Decisões de Projeto

### Por que SPA sem framework?
- Zero complexidade de build (npm, webpack, etc.)
- Carregamento instantâneo
- Um único arquivo HTML com navegação por JavaScript
- Fácil manutenção por qualquer desenvolvedor

### Por que SQLite?
- Arquivo único, portável
- Backup = copiar arquivo
- Performance excelente para volume de restaurante (< 1000 pedidos/dia)
- Zero administração de servidor de banco

### Por que Flask e não FastAPI?
- Flask serve templates HTML nativamente
- Não precisa de async para operação local
- Comunidade maior para soluções simples
- Menos código de configuração

### Desnormalização nos pedidos
- Nomes e preços são copiados para `pedido_itens` no momento da criação
- Se o cardápio mudar, pedidos antigos mantêm valores corretos
- Padrão comum em sistemas PDV

## Escalabilidade Futura

O sistema está preparado para crescer:
- Adicionar autenticação (login de operadores)
- Adicionar controle de mesas
- Migrar de SQLite para PostgreSQL se necessário
- Adicionar relatórios de vendas
- Integrar com sistemas de pagamento
- Adicionar múltiplos terminais (trocar SQLite por banco em rede)
