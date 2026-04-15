' ================================================
' Restaurante PDV - Iniciar minimizado (sem janela)
' Coloque o atalho deste arquivo na pasta Inicializar
' ================================================
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run Chr(34) & Replace(WScript.ScriptFullName, "servico.vbs", "servico.bat") & Chr(34), 0, False
