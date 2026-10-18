#!/bin/bash
cd "$(dirname "$0")" || exit 1

if [[ ! -f index.html || ! -f standalone.js || ! -f styles.css ]]; then
    echo "Servono index.html, standalone.js e styles.css nella stessa cartella."
    read -r -p "Premi Invio per chiudere…"
    exit 1
fi

if command -v open >/dev/null 2>&1; then
    open "index.html"
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "index.html"
else
    echo "Apri index.html con il browser."
    read -r -p "Premi Invio per chiudere…"
    exit 1
fi
