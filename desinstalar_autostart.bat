@echo off
chcp 65001 >nul 2>&1
echo Removendo inicio automatico...
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\RestaurantePDV.lnk" >nul 2>&1
echo Pronto! O servidor NAO vai mais iniciar automaticamente.
pause
