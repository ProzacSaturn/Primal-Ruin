@echo off
setlocal
cd /d "%~dp0"

if not exist "index.html" (
    echo Manca index.html in questa cartella.
    pause
    exit /b 1
)

if not exist "standalone.js" (
    echo Manca standalone.js.
    echo Devi avere index.html e standalone.js nella stessa cartella.
    echo Aggiorna questa cartella dal branch del gioco, poi riprova.
    pause
    exit /b 1
)

if not exist "styles.css" (
    echo Manca styles.css in questa cartella.
    pause
    exit /b 1
)

start "" "%~dp0index.html"
endlocal
