@echo off
chcp 65001 >nul 2>&1
title Restaurante PDV - Sistema de Pedidos

echo ================================================
echo   RESTAURANTE PDV - Sistema de Pedidos
echo ================================================
echo.

:: Entrar na pasta do projeto
cd /d "%~dp0"

:: =============================================
:: VERIFICAR PYTHON
:: =============================================
echo [1/5] Verificando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERRO: Python nao encontrado!
    echo.
    echo Baixe e instale o Python em:
    echo   https://www.python.org/downloads/
    echo.
    echo IMPORTANTE: Marque "Add Python to PATH" na instalacao.
    echo.
    pause
    exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo   Python %PYVER% encontrado.

:: =============================================
:: CRIAR AMBIENTE VIRTUAL (se nao existir)
:: =============================================
echo.
echo [2/5] Configurando ambiente virtual...
if not exist "venv" (
    echo   Criando ambiente virtual...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo ERRO: Falha ao criar ambiente virtual.
        pause
        exit /b 1
    )
    echo   Ambiente virtual criado.
) else (
    echo   Ambiente virtual ja existe.
)

:: Ativar ambiente virtual
call venv\Scripts\activate.bat

:: =============================================
:: INSTALAR DEPENDENCIAS
:: =============================================
echo.
echo [3/5] Instalando dependencias...
pip install -r requirements.txt --quiet --disable-pip-version-check
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependencias.
    pause
    exit /b 1
)
echo   Dependencias instaladas.

:: =============================================
:: CARREGAR DADOS INICIAIS (se banco nao existir)
:: =============================================
echo.
echo [4/5] Verificando banco de dados...
if not exist "database\restaurante.db" (
    echo   Banco nao encontrado. Criando e carregando dados de exemplo...
    python seed\seed_data.py
    if %errorlevel% neq 0 (
        echo ERRO: Falha ao carregar dados iniciais.
        pause
        exit /b 1
    )
) else (
    echo   Banco de dados ja existe.
)

:: =============================================
:: INICIAR SISTEMA
:: =============================================
echo.
echo [5/5] Iniciando sistema...
echo.
echo ================================================
echo   Sistema pronto!
echo   Acesse no navegador: http://localhost:5555
echo ================================================
echo.
echo   Pressione Ctrl+C para encerrar.
echo.

python run.py

echo.
echo Sistema encerrado.
pause
