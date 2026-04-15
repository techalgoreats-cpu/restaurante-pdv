#!/bin/bash

echo "================================================"
echo "  RESTAURANTE PDV - Sistema de Pedidos"
echo "================================================"
echo ""

# Entrar na pasta do projeto
cd "$(dirname "$0")"

# =============================================
# VERIFICAR PYTHON
# =============================================
echo "[1/5] Verificando Python..."

if command -v python3 &>/dev/null; then
    PY=python3
elif command -v python &>/dev/null; then
    PY=python
else
    echo ""
    echo "ERRO: Python nao encontrado!"
    echo ""
    echo "Instale o Python 3:"
    echo "  macOS:  brew install python3"
    echo "  Ubuntu: sudo apt install python3 python3-venv python3-pip"
    echo ""
    exit 1
fi

PYVER=$($PY --version 2>&1)
echo "  $PYVER encontrado."

# =============================================
# CRIAR AMBIENTE VIRTUAL (se nao existir)
# =============================================
echo ""
echo "[2/5] Configurando ambiente virtual..."

if [ ! -d "venv" ]; then
    echo "  Criando ambiente virtual..."
    $PY -m venv venv
    if [ $? -ne 0 ]; then
        echo "ERRO: Falha ao criar ambiente virtual."
        echo "No Ubuntu/Debian, instale: sudo apt install python3-venv"
        exit 1
    fi
    echo "  Ambiente virtual criado."
else
    echo "  Ambiente virtual ja existe."
fi

# Ativar ambiente virtual
source venv/bin/activate

# =============================================
# INSTALAR DEPENDENCIAS
# =============================================
echo ""
echo "[3/5] Instalando dependencias..."

pip install -r requirements.txt --quiet --disable-pip-version-check
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao instalar dependencias."
    exit 1
fi
echo "  Dependencias instaladas."

# =============================================
# CARREGAR DADOS INICIAIS (se banco nao existir)
# =============================================
echo ""
echo "[4/5] Verificando banco de dados..."

if [ ! -f "database/restaurante.db" ]; then
    echo "  Banco nao encontrado. Criando e carregando dados de exemplo..."
    python seed/seed_data.py
    if [ $? -ne 0 ]; then
        echo "ERRO: Falha ao carregar dados iniciais."
        exit 1
    fi
else
    echo "  Banco de dados ja existe."
fi

# =============================================
# INICIAR SISTEMA
# =============================================
echo ""
echo "[5/5] Iniciando sistema..."
echo ""
echo "================================================"
echo "  Sistema pronto!"
echo "  Acesse no navegador: http://localhost:5555"
echo "================================================"
echo ""
echo "  Pressione Ctrl+C para encerrar."
echo ""

python run.py
