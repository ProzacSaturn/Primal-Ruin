// Apre una partita locale sul codice vivo e la ricarica quando un fix viene salvato.
import { spawn } from 'node:child_process';
import {
    createReadStream,
    existsSync,
    readdirSync,
    readFileSync,
    realpathSync,
    renameSync,
    statSync,
    unlinkSync,
    watch
} from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(resolve(fileURLToPath(new URL('..', import.meta.url))));
const rolldownCli = join(root, 'node_modules/rolldown/dist/cli.mjs');
const firstPort = 4173;
const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};
const reloadScript = `<script>
new EventSource('/play-reload').onmessage = function (event) {
    if (event.data === 'reload') location.reload();
};
</script>
`;

const clients = new Set();
const watchers = [];
const watchedDirs = new Set();
const nextBundle = join(root, 'standalone.js.next');
const currentBundle = join(root, 'standalone.js');
let server = null;
let bundleProcess = null;
let wantRebuild = false;
let reloadPending = false;
let building = false;
let reloadTimer = null;

if (!existsSync(rolldownCli)) {
    console.error('Manca Rolldown. Esegui npm install nella cartella del progetto.');
    process.exit(1);
}

const started = await listen(firstPort);
server = started.server;
const url = `http://127.0.0.1:${started.port}/`;
console.log(`Partita di prova: ${url}`);
console.log('La pagina usa il codice vivo e si ricarica quando salvi un file.');
console.log('Finché questo comando resta aperto, standalone.js segue i fix per il doppio clic.');
openBrowser(url);
watchProject();
wantRebuild = true;
void runCycle();

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function listen(port, attemptsLeft = 10) {
    return new Promise((resolveListen, rejectListen) => {
        const candidate = createServer((request, response) => {
            serve(request, response).catch((error) => {
                console.error(error instanceof Error ? error.message : error);
                if (!response.headersSent) response.writeHead(500);
                response.end();
            });
        });
        candidate.once('error', (error) => {
            if (error.code === 'EADDRINUSE' && attemptsLeft > 1) {
                resolveListen(listen(port + 1, attemptsLeft - 1));
                return;
            }
            rejectListen(error);
        });
        candidate.listen(port, '127.0.0.1', () => resolveListen({ server: candidate, port }));
    });
}

async function serve(request, response) {
    const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
    if (pathname === '/play-reload') {
        response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-store',
            Connection: 'keep-alive'
        });
        response.write('retry: 1000\n\n');
        clients.add(response);
        response.on('error', () => clients.delete(response));
        request.on('close', () => clients.delete(response));
        return;
    }

    const file = fileForRequest(pathname === '/' ? '/index.html' : pathname);
    if (!file) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Non trovato');
        return;
    }

    const headers = {
        'Content-Type': mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    };
    if (file.endsWith(`${sep}index.html`)) {
        const html = readFileSync(file, 'utf8');
        const marker = '</body>';
        const index = html.lastIndexOf(marker);
        const body =
            index === -1
                ? html + reloadScript
                : `${html.slice(0, index)}${reloadScript}${html.slice(index)}`;
        response.writeHead(200, headers);
        response.end(body);
        return;
    }

    response.writeHead(200, headers);
    createReadStream(file).pipe(response);
}

function fileForRequest(pathname) {
    let decoded;
    try {
        decoded = decodeURIComponent(pathname);
    } catch {
        return null;
    }
    if (decoded.includes('\0')) return null;
    const full = resolve(root, decoded.replace(/^[/\\]+/, ''));
    if (full !== root && !full.startsWith(`${root}${sep}`)) return null;
    let real;
    try {
        real = realpathSync(full);
    } catch {
        return null;
    }
    if (real !== root && !real.startsWith(`${root}${sep}`)) return null;
    try {
        if (!statSync(real).isFile()) return null;
    } catch {
        return null;
    }
    return real;
}

function watchProject() {
    watchFile(root, (filename) => {
        if (filename === 'game.js') queue(true);
        else if (filename === 'styles.css' || filename === 'index.html') queue(false);
    });
    watchTree(join(root, 'src'));
}

function watchTree(dir) {
    const real = realpathSync(dir);
    if (watchedDirs.has(real)) return;
    watchedDirs.add(real);
    watchFile(real, (filename) => {
        if (filename === 'standalone.js') return;
        if (!filename) {
            queue(true);
            return;
        }
        const child = join(real, filename);
        try {
            if (statSync(child).isDirectory()) watchTree(child);
        } catch {
            // Il file può essere già stato rimosso.
        }
        queue(isSourceFile(filename));
    });
    for (const entry of readdirSync(real, { withFileTypes: true })) {
        if (entry.isDirectory()) watchTree(join(real, entry.name));
    }
}

function watchFile(target, onName) {
    const watcher = watch(target, (_event, filename) => {
        onName(filename ? String(filename) : '');
    });
    watcher.on('error', (error) => console.error(error.message));
    watchers.push(watcher);
}

function isSourceFile(filename) {
    return filename.endsWith('.js') || filename.endsWith('.mjs') || filename.endsWith('.json');
}

function queue(rebuild) {
    if (rebuild) wantRebuild = true;
    reloadPending = true;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => void runCycle(), 80);
}

async function runCycle() {
    if (building) return;
    building = true;
    try {
        while (wantRebuild) {
            wantRebuild = false;
            try {
                console.log('Aggiorno standalone.js…');
                await rebuildStandalone();
                console.log('standalone.js aggiornato.');
            } catch (error) {
                console.error(error instanceof Error ? error.message : error);
            }
        }
    } finally {
        building = false;
    }
    if (wantRebuild) {
        queue(true);
        return;
    }
    if (!reloadPending) return;
    reloadPending = false;
    for (const response of clients) response.write('data: reload\n\n');
    console.log('Partita ricaricata.');
}

function rebuildStandalone() {
    return new Promise((resolveBuild, rejectBuild) => {
        bundleProcess = spawn(
            process.execPath,
            [
                rolldownCli,
                'src/main.js',
                '--format',
                'iife',
                '--file',
                'standalone.js.next',
                '--platform',
                'browser',
                '--name',
                'PrimalRuin'
            ],
            { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] }
        );
        bundleProcess.once('error', (error) => {
            bundleProcess = null;
            rejectBuild(error);
        });
        bundleProcess.once('exit', (code) => {
            bundleProcess = null;
            if (code !== 0) {
                unlinkQuiet(nextBundle);
                rejectBuild(new Error(`Rolldown si è chiuso con codice ${code}.`));
                return;
            }
            try {
                const next = readFileSync(nextBundle);
                const same = existsSync(currentBundle) && readFileSync(currentBundle).equals(next);
                if (same) unlinkSync(nextBundle);
                else renameSync(nextBundle, currentBundle);
                resolveBuild();
            } catch (error) {
                unlinkQuiet(nextBundle);
                rejectBuild(error);
            }
        });
    });
}

function unlinkQuiet(file) {
    try {
        unlinkSync(file);
    } catch {
        // Il file temporaneo può non esserci.
    }
}

function openBrowser(target) {
    const command =
        process.platform === 'win32'
            ? ['cmd', ['/c', 'start', '', target]]
            : process.platform === 'darwin'
              ? ['open', [target]]
              : ['xdg-open', [target]];
    const opened = spawn(command[0], command[1], { stdio: 'ignore', detached: true });
    opened.on('error', () => {
        console.log('Non sono riuscito ad aprire il browser. Usa il link qui sopra.');
    });
    opened.unref();
}

function shutdown(code) {
    bundleProcess?.kill('SIGTERM');
    clearTimeout(reloadTimer);
    for (const watcher of watchers) watcher.close();
    for (const response of clients) response.end();
    if (!server) process.exit(code);
    server.close(() => process.exit(code));
    setTimeout(() => process.exit(code), 500).unref();
}
