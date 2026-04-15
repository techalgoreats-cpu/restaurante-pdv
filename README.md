# Restaurante PDV - Sistema de Pedidos

Sistema simples e rápido para registro de pedidos em restaurante, com cadastro de cardápio, montagem de combos, cálculo automático de preço e impressão no caixa e na cozinha.

## Características

- Interface rápida com poucos cliques
- Cálculo automático de combo
- Impressão no caixa (USB) e cozinha (rede)
- Cadastro completo de cardápio
- Banco de dados local SQLite
- Zero complexidade de infraestrutura

## Requisitos

- Python 3.8 ou superior
- Navegador web moderno (Chrome, Edge, Firefox)

## Instalação

### 1. Instalar Python

Se ainda não tem Python instalado, baixe em: https://www.python.org/downloads/

No Windows, marque a opção **"Add Python to PATH"** durante a instalação.

### 2. Clonar/copiar o projeto

Copie a pasta `restaurante-pdv` para o local desejado.

### 3. Instalar dependências

Abra o terminal/prompt na pasta do projeto e execute:

```bash
cd restaurante-pdv
pip install -r requirements.txt
```

### 4. Carregar dados de exemplo (opcional)

```bash
python seed/seed_data.py
```

Isso cria categorias, produtos, bebidas, sobremesas e regras de combo de exemplo.

### 5. Iniciar o sistema

```bash
python run.py
```

### 6. Acessar no navegador

Abra: **http://localhost:5000**

## Como Usar

### Lançar pedido
1. Escolha a **categoria** (ex: Parmegianas)
2. Escolha o **prato** (ex: Frango à Parmegiana)
3. Escolha o **acompanhamento** (se houver)
4. Escolha **bebida** ou "Sem bebida"
5. Escolha **sobremesa** ou "Sem sobremesa"
6. Confirme e adicione ao pedido
7. Repita para mais itens ou clique **"Fechar Pedido"**
8. Confirme e imprima

### Cadastrar cardápio
- Use o menu lateral para acessar Categorias, Produtos, Acompanhamentos, Bebidas e Sobremesas
- Cada tela tem formulário de cadastro no topo e lista abaixo
- Para editar, clique "Editar" na linha desejada

### Cadastrar preços
- Acesse **Produtos** no menu lateral
- Defina o **Preço** normal e o **Preço Combo** (inclui bebida + sobremesa)
- Para bebidas e sobremesas, defina preço na tela específica

### Configurar combos
1. Cadastre a regra em **Regras de Combo** (defina se exige bebida e/ou sobremesa)
2. Em **Produtos**, vincule a regra ao produto e defina o preço combo
3. Em **Bebidas**, marque quais participam do combo
4. Em **Sobremesas**, marque quais participam do combo

### Configurar impressoras
1. Acesse **Impressoras** no menu lateral
2. Configure o nome do restaurante
3. Cadastre a impressora do caixa (USB) e da cozinha (rede)
4. Desmarque "Modo simulação" quando tiver as impressoras reais

### Reimprimir pedido
1. Acesse **Pedidos do Dia**
2. Clique **Reimprimir** no pedido desejado

## Impressão

### Impressora do Caixa (USB - i9)
1. Conecte a impressora i9 via USB
2. Descubra o Vendor ID e Product ID:
   - Windows: Gerenciador de Dispositivos > Impressora > IDs de hardware
   - Linux/Mac: `lsusb`
3. Instale o driver libusb (Windows: usar Zadig - https://zadig.akeo.ie/)
4. Configure no sistema em Impressoras

### Impressora da Cozinha (Rede)
1. Descubra o IP da impressora na rede
2. Configure no sistema com IP e porta 9100

### Modo Simulação
Com "Modo simulação" ativo, as impressões são salvas como arquivos `.txt` em `database/impressoes/`.

## Estrutura do Projeto

```
restaurante-pdv/
├── app/               # Backend Flask
├── templates/         # HTML
├── static/            # CSS e JavaScript
├── database/          # SQLite e schema
├── printer/           # Módulo de impressão
├── seed/              # Dados de exemplo
├── docs/              # Documentação detalhada
├── run.py             # Inicializador
└── requirements.txt   # Dependências
```

## Produção (Windows)

Para rodar em produção no Windows, use o Waitress ao invés do servidor de desenvolvimento:

Edite o `run.py` e descomente as linhas do Waitress:

```python
from waitress import serve
serve(app, host='0.0.0.0', port=5000)
```

Ou crie um arquivo `start.bat`:

```batch
@echo off
cd /d %~dp0
python -c "from app.main import create_app; from waitress import serve; serve(create_app(), host='0.0.0.0', port=5000)"
```

## Documentação Completa

- [Arquitetura](docs/arquitetura.md)
- [Modelagem do Banco](docs/modelagem_banco.md)
- [Fluxo do Pedido](docs/fluxo_pedido.md)
- [Impressão](docs/impressao.md)
- [Manual de Operação](docs/operacao.md)

## Backup

O banco de dados é um arquivo único: `database/restaurante.db`

Para fazer backup, basta copiar este arquivo para um local seguro.

## Testes Rápidos

1. Inicie o sistema: `python run.py`
2. Carregue os dados de exemplo: `python seed/seed_data.py`
3. Acesse http://localhost:5000
4. Faça um pedido:
   - Clique "Parmegianas"
   - Clique "Frango à Parmegiana"
   - Escolha "Purê de Batata"
   - Escolha "Pepsi Lata"
   - Escolha "Brigadeirão"
   - Confirme (deve mostrar COMBO APLICADO e preço R$ 44,90)
   - Feche e confirme o pedido
5. Verifique em Pedidos do Dia
6. Verifique os arquivos de impressão simulada em `database/impressoes/`
