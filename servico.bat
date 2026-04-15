@echo off
:: ================================================
:: Restaurante PDV - Servico em segundo plano
:: Este arquivo e executado automaticamente ao ligar
:: ================================================
cd /d "%~dp0"

:: Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 exit /b 1

:: Criar venv se nao existir
if not exist "venv" python -m venv venv

:: Ativar venv
call venv\Scripts\activate.bat

:: Instalar dependencias
pip install -r requirements.txt --quiet --disable-pip-version-check >nul 2>&1

:: Criar banco se nao existir
if not exist "database\restaurante.db" python seed\seed_data.py

:: Iniciar servidor
python run.py
