#!/bin/bash
PLIST_NAME="com.restaurantepdv.servidor"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"
launchctl unload "$PLIST_PATH" 2>/dev/null
launchctl stop "$PLIST_NAME" 2>/dev/null
rm -f "$PLIST_PATH"
echo "Inicio automatico removido."
