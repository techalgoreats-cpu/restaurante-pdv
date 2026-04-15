#!/bin/bash
# ================================================
# Restaurante PDV - Configurar inicio automatico (macOS)
# Cria um LaunchAgent que inicia o servidor ao fazer login
# ================================================

PROJETO_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_NAME="com.restaurantepdv.servidor"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

echo "================================================"
echo "  Restaurante PDV - Inicio automatico (macOS)"
echo "================================================"
echo ""

# Criar o plist do LaunchAgent
cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${PROJETO_DIR}/iniciar.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${PROJETO_DIR}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${PROJETO_DIR}/database/servidor.log</string>
    <key>StandardErrorPath</key>
    <string>${PROJETO_DIR}/database/servidor_erro.log</string>
</dict>
</plist>
EOF

# Carregar o agente
launchctl load "$PLIST_PATH" 2>/dev/null
launchctl start "$PLIST_NAME" 2>/dev/null

echo "  PRONTO! Servidor configurado para iniciar automaticamente."
echo ""
echo "  Arquivo: $PLIST_PATH"
echo ""
echo "  Para remover:"
echo "    launchctl unload $PLIST_PATH"
echo "    rm $PLIST_PATH"
echo "  ou execute: ./desinstalar_autostart_mac.sh"
echo ""
