// Minimal stdio JSON-RPC client for the `secondhand-mcp` server.
//
// We spawn the published MCP server as a subprocess and speak MCP over stdio.
// This keeps Turumba decoupled from the marketplace-scraping details: if the
// MCP adds a marketplace or changes selectors, we get it for free.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Resolve the installed secondhand-mcp entrypoint. */
function serverEntry() {
  return require.resolve('secondhand-mcp');
}

/**
 * Run one tool call against a fresh MCP server process and resolve its result.
 * A fresh process per call keeps things simple and stateless; searches are
 * infrequent (a scheduled digest), so process startup cost is irrelevant.
 *
 * @param {string} name  tool name, e.g. "search_marketplace"
 * @param {object} args  tool arguments
 * @param {object} [opts]
 * @param {string} [opts.marketplaces] value for the MARKETPLACES env var
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<string>} concatenated text content from the tool result
 */
export function callTool(name, args, opts = {}) {
  const {
    marketplaces = process.env.MARKETPLACES || 'facebook',
    timeoutMs = 90_000,
  } = opts;

  return new Promise((resolve, reject) => {
    const server = spawn(process.execPath, [serverEntry()], {
      env: { ...process.env, MARKETPLACES: marketplaces },
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    const timer = setTimeout(() => {
      server.kill();
      reject(new Error(`MCP call "${name}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    let buf = '';
    const pending = new Map();
    let id = 0;

    const rpc = (method, params) => {
      const myId = ++id;
      return new Promise((res) => {
        pending.set(myId, res);
        server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: myId, method, params }) + '\n');
      });
    };
    const notify = (method, params) =>
      server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');

    server.stdout.on('data', (d) => {
      buf += d.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }
        if (msg.id && pending.has(msg.id)) {
          pending.get(msg.id)(msg);
          pending.delete(msg.id);
        }
      }
    });

    server.on('error', (e) => { clearTimeout(timer); reject(e); });

    (async () => {
      await rpc('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'turumba', version: '0.1.0' },
      });
      notify('notifications/initialized', {});
      const res = await rpc('tools/call', { name, arguments: args });
      clearTimeout(timer);
      server.kill();
      const text = res?.result?.content?.map((c) => c.text).join('\n') ?? '';
      resolve(text);
    })().catch((e) => { clearTimeout(timer); server.kill(); reject(e); });
  });
}

/** Search a marketplace. Returns the raw formatted text the MCP emits. */
export function searchMarketplace(args, opts) {
  return callTool('search_marketplace', args, opts);
}

/** Full details for one listing id. */
export function getListingDetails(listingId, marketplace = 'facebook', opts) {
  return callTool('get_listing_details', { listingId, marketplace }, opts);
}
