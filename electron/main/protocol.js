"use strict";

/**
 * protocol.js — Registra o protocolo customizado `louvorja://`.
 *
 * Hosts suportados:
 *   louvorja://app/<caminho>       — assets do build Vue em dist/ (substitui file://)
 *   louvorja://json_db/<arquivo>   — proxy com cache para api.louvorja.com.br/json_db
 *   louvorja://files/<caminho>     — arquivos locais em userData/files/ (populado em D3 via FTP)
 *
 * O protocolo é marcado como standard + secure para que fetch() e XHR funcionem
 * normalmente dentro do renderer sem erros de CORS/CSP. O host "app" existe
 * para que a app principal seja servida com origem real (não null como no
 * file://) — secure context, BroadcastChannel, fetch relativo, todos
 * funcionam sem hacks.
 *
 * Faz parte da Fase D2 — Cache de JSON do banco.
 */

// IMPORTANTE: importar `electron` (não desestruturar) — `protocol` e `net`
// só ficam disponíveis após `app.whenReady()`. Acessar via `require("electron")`
// dentro das funções resolve corretamente.
const electron = require("electron");
const { pathToFileURL } = require("url");
const fs = require("fs-extra");
const path = require("path");
const paths = require("./paths.js");
const jsonCache = require("./jsonCache.js");

// ---------------------------------------------------------------------------
// Configuração de URLs remotas
// ---------------------------------------------------------------------------

/**
 * Config padrão aponta para produção; substituída via setRemoteConfig()
 * depois que o renderer lê as variáveis de ambiente do Vite.
 */
let _config = {
  databaseUrl: "https://api.louvorja.com.br/json_db",
  filesUrl: "https://api.louvorja.com.br/file",
  apiToken: "",
};

/**
 * Atualiza a configuração de URLs remotas.
 * Chamado pelo renderer via IPC logo após montar o app (main.js).
 *
 * @param {{ databaseUrl?: string, filesUrl?: string, apiToken?: string }} cfg
 */
function setRemoteConfig(cfg) {
  _config = { ..._config, ...cfg };
  console.log("[protocol] Remote config atualizada:", {
    databaseUrl: _config.databaseUrl,
    filesUrl: _config.filesUrl,
  });
}

/**
 * Liga/desliga o auto-cache de mídia (S1). Quando OFF, stream remoto
 * passa direto para o renderer sem gravar no disco.
 */
let _autoCacheEnabled = true;
/**
 * MIME type por extensão (apenas para o host "local" onde criamos
 * Responses customizados com Range support).
 */
const _MIME_TYPES = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain",
};
function _getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return _MIME_TYPES[ext] || "application/octet-stream";
}

function setAutoCacheEnabled(enabled) {
  _autoCacheEnabled = !!enabled;
}

/**
 * Grava um ReadableStream em um arquivo via .tmp + rename atômico.
 * Usado pelo auto-cache do host "files".
 */
async function _writeStreamToFile(readable, finalPath) {
  await fs.ensureDir(path.dirname(finalPath));
  const tmp = `${finalPath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  const writer = fs.createWriteStream(tmp);
  const reader = readable.getReader();

  try {
    /* eslint-disable no-constant-condition */
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      // value é Uint8Array — converte pra Buffer antes de gravar
      writer.write(Buffer.from(value));
    }
    /* eslint-enable no-constant-condition */
    await new Promise((resolve, reject) => {
      writer.end((err) => (err ? reject(err) : resolve()));
    });
    await fs.move(tmp, finalPath, { overwrite: true });
    console.log("[protocol] Auto-cached:", finalPath);
  } catch (e) {
    try {
      await fs.remove(tmp);
    } catch (_) {
      /* ignore */
    }
    throw e;
  } finally {
    try {
      reader.releaseLock();
    } catch (_) {
      /* ignore */
    }
  }
}

// ---------------------------------------------------------------------------
// Registro do scheme (antes do app.whenReady)
// ---------------------------------------------------------------------------

/**
 * Registra `louvorja://` como scheme privilegiado.
 * DEVE ser chamado antes de `app.whenReady()`.
 */
function register() {
  electron.protocol.registerSchemesAsPrivileged([
    {
      scheme: "louvorja",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        bypassCSP: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ]);
}

// ---------------------------------------------------------------------------
// Handler do protocolo (após app.whenReady)
// ---------------------------------------------------------------------------

/**
 * Instala o handler para `louvorja://`.
 * DEVE ser chamado dentro de `app.whenReady()`.
 */
function handle() {
  electron.protocol.handle("louvorja", async (request) => {
    try {
      const url = new URL(request.url);
      const host = url.host; // "app" | "json_db" | "files"
      const pathname = url.pathname || "/";

      // ------------------------------------------------------------------
      // louvorja://app/<caminho>
      // Serve assets do build Vue (dist/). Substitui file:// para que
      // a origem do renderer não seja null.
      // ------------------------------------------------------------------
      if (host === "app") {
        const distDir = path.join(electron.app.getAppPath(), "dist");
        const cleaned = pathname.replace(/^\/+/, "") || "index.html";
        const localPath = path.resolve(distDir, cleaned);

        if (!localPath.startsWith(distDir + path.sep) && localPath !== distDir) {
          console.warn("[protocol] app: path traversal bloqueado:", pathname);
          return new Response("Forbidden", { status: 403 });
        }

        if (!fs.existsSync(localPath)) {
          // SPA fallback: rotas client-side (vue-router) caem em index.html
          const indexPath = path.join(distDir, "index.html");
          if (fs.existsSync(indexPath)) {
            return electron.net.fetch(pathToFileURL(indexPath).toString());
          }
          return new Response("Not found", { status: 404 });
        }

        return electron.net.fetch(pathToFileURL(localPath).toString());
      }

      // ------------------------------------------------------------------
      // louvorja://json_db/<arquivo>
      // Serve JSON com cache em userData/json_db/
      // ------------------------------------------------------------------
      if (host === "json_db") {
        const headers = {
          "Api-Token": _config.apiToken,
        };

        try {
          const result = await jsonCache.fetchJson(
            pathname,
            _config.databaseUrl,
            headers
          );

          if (result.status === 404) {
            return new Response("Not found", { status: 404 });
          }

          return new Response(result.body, {
            status: result.status || 200,
            headers: {
              "Content-Type": result.contentType,
              "X-Cache": result.fromCache ? "HIT" : "MISS",
            },
          });
        } catch (e) {
          console.error(`[protocol] Erro ao buscar JSON em ${pathname}:`, e);
          return new Response(e.message || "JSON Cache Error", { status: 500 });
        }
      }

      // ------------------------------------------------------------------
      // louvorja://files/<caminho>
      // Serve arquivos locais de userData/files/. Se faltar, busca remoto
      // E grava no disco em paralelo (auto-cache S1) — exceto para Range
      // requests (não cacheamos partials).
      // ------------------------------------------------------------------
      if (host === "files") {
        const filesDir = paths.filesDir();
        const rawRelative = pathname.replace(/^\/+/, "");
        const localPath = path.resolve(filesDir, rawRelative);

        // Proteção path traversal: o caminho resolvido deve iniciar com filesDir
        if (!localPath.startsWith(filesDir + path.sep) && localPath !== filesDir) {
          console.warn("[protocol] Path traversal bloqueado:", pathname);
          return new Response("Forbidden", { status: 403 });
        }

        // Prioriza arquivo local sempre que existe (suporta Range, streaming, mime).
        if (fs.existsSync(localPath)) {
          const fileUrl = pathToFileURL(localPath).toString();
          return electron.net.fetch(fileUrl);
        }

        // Fallback: stream remoto. Cacheia se for request "completo" (sem Range).
        if (_config.filesUrl) {
          const remoteUrl = _config.filesUrl + (pathname.startsWith("/") ? pathname : "/" + pathname);
          const isRangeRequest = !!request.headers.get("range");
          const headers = _config.apiToken ? { "Api-Token": _config.apiToken } : {};

          try {
            const response = await electron.net.fetch(remoteUrl, { headers });

            if (!response.ok || response.status !== 200 || isRangeRequest) {
              return response; // não cacheamos parciais nem erros
            }

            if (!_autoCacheEnabled || !response.body) {
              return response;
            }

            // Tee: uma branch vai pro renderer, outra grava em .tmp e renomeia.
            const [forRenderer, forDisk] = response.body.tee();
            _writeStreamToFile(forDisk, localPath).catch((e) =>
              console.warn("[protocol] Auto-cache falhou:", e.message || e)
            );

            return new Response(forRenderer, {
              status: 200,
              headers: response.headers,
            });
          } catch (fetchErr) {
            console.warn("[protocol] Falha ao buscar remoto:", remoteUrl, fetchErr.message);
            return new Response("File not found locally and remote fetch failed", { status: 404 });
          }
        }

        return new Response("File not found", { status: 404 });
      }

      // ------------------------------------------------------------------
      // louvorja://local/<caminho-absoluto>
      // Serve arquivos de caminhos absolutos arbitrários (liturgia,
      // arrastar/soltar, etc). Ex:
      //   louvorja://local/Users/diego/Music/song.mp3          (Unix)
      //   louvorja://local/C:/Users/diego/Music/song.mp3       (Windows)
      //
      // O pathname (ex: /Users/diego/Music/song.mp3) é o caminho
      // absoluto real (a `/` inicial já faz parte do path Unix).
      // ------------------------------------------------------------------
      if (host === "local") {
        // pathname vem percent-encoded (ex: %20 → espaço): decodifica
        const raw = decodeURIComponent(pathname);

        if (!raw || raw.includes("..")) {
          console.warn("[protocol] local: path traversal bloqueado:", pathname);
          return new Response("Forbidden", { status: 403 });
        }

        if (!fs.existsSync(raw)) {
          return new Response("Not found", { status: 404 });
        }

        const rangeHeader = request.headers.get("range");

        // Suporte a Range requests (necessário para seeking em <audio>/<video>)
        if (rangeHeader) {
          const stat = fs.statSync(raw);
          const fileSize = stat.size;
          const match = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);

          if (match) {
            const start = parseInt(match[1], 10);
            const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            const stream = fs.createReadStream(raw, { start, end });
            const readable = new ReadableStream({
              start(controller) {
                stream.on("data", (chunk) => {
                  try { controller.enqueue(chunk); } catch {
                    // Consumer fechou o ReadableStream (seek/nav) →
                    // para de ler do disco.
                    stream.destroy();
                  }
                });
                stream.on("end", () => {
                  try { controller.close(); } catch { /* ignore */ }
                });
                stream.on("error", (err) => {
                  try { controller.error(err); } catch { /* ignore */ }
                });
              },
              cancel() {
                stream.destroy();
              },
            });

            return new Response(readable, {
              status: 206,
              headers: {
                "Content-Type": _getMimeType(raw),
                "Content-Length": String(chunkSize),
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
              },
            });
          }
        }

        return electron.net.fetch(pathToFileURL(raw).toString());
      }

      // Host desconhecido
      return new Response(`louvorja:// host desconhecido: "${host}"`, {
        status: 404,
      });
    } catch (e) {
      console.error("[protocol] Erro interno:", e);
      return new Response(e.message || "Internal error", { status: 500 });
    }
  });

  console.log("[protocol] Handler louvorja:// registrado.");
}

/**
 * Retorna a config atual de URLs remotas. Usado pelo bridge SSE
 * (httpServer/events.js) para traduzir `louvorja://files/...` em URLs HTTPS
 * que clients remotos (OBS, celular) consigam carregar — eles não conhecem
 * o protocolo customizado do Electron.
 */
function getRemoteConfig() {
  return { ..._config };
}

module.exports = { register, handle, setRemoteConfig, getRemoteConfig, setAutoCacheEnabled };
