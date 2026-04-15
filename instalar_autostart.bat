@echo off
chcp 65001 >nul 2>&1
echo ================================================
echo   Restaurante PDV - Configurar inicio automatico
echo ================================================
echo.

cd /d "%~dp0"

:: Caminho da pasta Inicializar do Windows
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

:: Criar atalho do servico.vbs na pasta Inicializar
echo Criando atalho na pasta Inicializar do Windows...

:: Usar PowerShell para criar o atalho .lnk
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP%\RestaurantePDV.lnk'); $s.TargetPath = '%cd%\servico.vbs'; $s.WorkingDirectory = '%cd%'; $s.Description = 'Restaurante PDV - Servidor'; $s.Save()"

if %errorlevel% neq 0 (
    echo.
    echo ERRO: Nao foi possivel criar o atalho.
    echo.
    echo Faca manualmente:
    echo   1. Pressione Win+R
    echo   2. Digite: shell:startup
    echo   3. Copie o arquivo "servico.vbs" para essa pasta
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo   PRONTO! O servidor vai iniciar automaticamente
echo   toda vez que o computador ligar.
echo.
echo   Atalho criado em:
echo   %STARTUP%\RestaurantePDV.lnk
echo.
echo   Para remover: delete o atalho da pasta acima
echo   ou execute: desinstalar_autostart.bat
echo ================================================
echo.
pause
