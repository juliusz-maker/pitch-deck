const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
};

const RELOAD_SNIPPET = `<script>new EventSource("/__reload").addEventListener("reload",()=>location.reload())</script>`;

// --- SSE live reload ---
const sseClients = new Set();

function broadcast() {
  for (const res of sseClients) {
    res.write('event: reload\ndata: ok\n\n');
  }
}

// --- File watcher -> rebuild -> reload ---
let buildTimer = null;

function rebuild() {
  try {
    execSync('node build.js', { cwd: __dirname, stdio: 'pipe' });
    console.log(`[${new Date().toLocaleTimeString()}] Rebuilt all decks`);
    broadcast();
  } catch (e) {
    console.error(`[${new Date().toLocaleTimeString()}] Build error:`, e.stderr?.toString().trim());
  }
}

function onSourceChange(dir) {
  return (_event, filename) => {
    if (!filename) return;
    clearTimeout(buildTimer);
    buildTimer = setTimeout(() => {
      console.log(`[${new Date().toLocaleTimeString()}] Changed: ${path.join(dir, filename)}`);
      rebuild();
    }, 150);
  };
}

// Watch source directories
const contentDir = path.join(__dirname, 'content');
fs.watch(path.join(contentDir, 'slides'), onSourceChange('slides'));
fs.watch(path.join(contentDir, 'decks'), onSourceChange('decks'));
fs.watch(contentDir, (_event, filename) => {
  if (filename && /^(head|tail).*\.html$/.test(filename)) {
    clearTimeout(buildTimer);
    buildTimer = setTimeout(() => {
      console.log(`[${new Date().toLocaleTimeString()}] Changed: ${filename}`);
      rebuild();
    }, 150);
  }
});

// --- HTTP server ---
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // SSE endpoint
  if (url === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(':ok\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  let filePath;
  if (url === '/' || url === '/index.html') {
    filePath = path.join(contentDir, 'page.html');
  } else {
    filePath = path.join(__dirname, 'public', url);
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    // Inject live-reload snippet into HTML responses
    if (ext === '.html') {
      const html = data.toString().replace('</body>', RELOAD_SNIPPET + '</body>');
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(html);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const PORT = parseInt(process.env.PORT, 10) || 3334;
server.listen(PORT, () => {
  console.log(`Pitch dev server with live reload at http://localhost:${PORT}`);
  console.log('Watching: content/slides/, content/decks/, content/head.html, content/tail*.html');
});
