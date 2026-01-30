import { Mastra } from "@mastra/core";
import { Pool } from "pg";
import { inngest } from "../inngest/client";

let poolInstance: Pool | null = null;

function getDbPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return poolInstance;
}

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YouTube Optimizer Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  </style>
</head>
<body class="bg-gray-900 text-white min-h-screen">
  <div class="container mx-auto px-4 py-8">
    <header class="mb-8">
      <h1 class="text-4xl font-bold gradient-bg bg-clip-text text-transparent inline-block">
        YouTube Video Optimizer
      </h1>
      <p class="text-gray-400 mt-2">AI-powered video description and tag optimization</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-gray-400 text-sm uppercase tracking-wide">Total Optimizations</h3>
        <p id="total-count" class="text-3xl font-bold mt-2">-</p>
      </div>
      <div class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-gray-400 text-sm uppercase tracking-wide">Successful</h3>
        <p id="success-count" class="text-3xl font-bold mt-2 text-green-400">-</p>
      </div>
      <div class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-gray-400 text-sm uppercase tracking-wide">Failed</h3>
        <p id="failed-count" class="text-3xl font-bold mt-2 text-red-400">-</p>
      </div>
    </div>

    <div class="mb-6 flex justify-between items-center">
      <h2 class="text-2xl font-semibold">Optimization History</h2>
      <button id="trigger-btn" onclick="triggerOptimization()"
        class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
        Run Optimization Now
      </button>
    </div>

    <div class="bg-gray-800 rounded-lg overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-700">
          <tr>
            <th class="text-left py-3 px-4">Video Title</th>
            <th class="text-left py-3 px-4">Status</th>
            <th class="text-left py-3 px-4">Date</th>
            <th class="text-left py-3 px-4">Actions</th>
          </tr>
        </thead>
        <tbody id="history-table">
          <tr><td colspan="4" class="py-8 text-center text-gray-400">Loading...</td></tr>
        </tbody>
      </table>
    </div>

    <div id="modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center">
      <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 id="modal-title" class="text-xl font-semibold"></h3>
          <button onclick="closeModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        <div id="modal-content"></div>
      </div>
    </div>
  </div>

  <script>
    async function loadStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        document.getElementById('total-count').textContent = data.total || 0;
        document.getElementById('success-count').textContent = data.completed || 0;
        document.getElementById('failed-count').textContent = data.failed || 0;
      } catch (e) { console.error('Failed to load stats:', e); }
    }

    async function loadHistory() {
      try {
        const res = await fetch('/api/dashboard/history');
        const data = await res.json();
        const tbody = document.getElementById('history-table');
        
        if (!data.records || data.records.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-gray-400">No optimizations yet. Click "Run Optimization Now" to get started!</td></tr>';
          return;
        }

        tbody.innerHTML = data.records.map(r => {
          const statusClass = r.status === 'completed' ? 'bg-green-900 text-green-300' :
            r.status === 'failed' ? 'bg-red-900 text-red-300' :
            r.status === 'processing' ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-700 text-gray-300';
          return '<tr class="border-t border-gray-700 hover:bg-gray-750">' +
            '<td class="py-3 px-4">' + (r.video_title || 'Unknown') + '</td>' +
            '<td class="py-3 px-4"><span class="px-2 py-1 rounded text-sm ' + statusClass + '">' + r.status + '</span></td>' +
            '<td class="py-3 px-4 text-gray-400">' + new Date(r.created_at).toLocaleString() + '</td>' +
            '<td class="py-3 px-4"><button onclick="showDetails(\\'' + r.id + '\\')" class="text-blue-400 hover:underline">View Details</button></td>' +
            '</tr>';
        }).join('');
      } catch (e) {
        console.error('Failed to load history:', e);
        document.getElementById('history-table').innerHTML = '<tr><td colspan="4" class="py-8 text-center text-red-400">Failed to load history</td></tr>';
      }
    }

    async function triggerOptimization() {
      const btn = document.getElementById('trigger-btn');
      btn.disabled = true;
      btn.textContent = 'Running...';
      try {
        const res = await fetch('/api/dashboard/trigger', { method: 'POST' });
        const data = await res.json();
        alert(data.message || 'Optimization triggered!');
        setTimeout(() => { loadStats(); loadHistory(); }, 2000);
      } catch (e) { alert('Failed to trigger optimization'); }
      finally { btn.disabled = false; btn.textContent = 'Run Optimization Now'; }
    }

    async function showDetails(id) {
      try {
        const res = await fetch('/api/dashboard/record/' + id);
        const data = await res.json();
        document.getElementById('modal-title').textContent = data.video_title || 'Video Details';
        document.getElementById('modal-content').innerHTML = 
          '<div class="space-y-4">' +
          '<div><h4 class="text-gray-400 text-sm">Video ID</h4><p>' + data.video_id + '</p></div>' +
          '<div><h4 class="text-gray-400 text-sm">Original Description</h4><p class="bg-gray-700 p-3 rounded whitespace-pre-wrap">' + (data.original_description || 'N/A') + '</p></div>' +
          '<div><h4 class="text-gray-400 text-sm">Optimized Description</h4><p class="bg-gray-700 p-3 rounded whitespace-pre-wrap">' + (data.optimized_description || 'N/A') + '</p></div>' +
          '<div><h4 class="text-gray-400 text-sm">Original Tags</h4><p>' + ((data.original_tags || []).join(', ') || 'None') + '</p></div>' +
          '<div><h4 class="text-gray-400 text-sm">Optimized Tags</h4><p>' + ((data.optimized_tags || []).join(', ') || 'None') + '</p></div>' +
          (data.error_message ? '<div><h4 class="text-red-400 text-sm">Error</h4><p class="text-red-300">' + data.error_message + '</p></div>' : '') +
          '</div>';
        document.getElementById('modal').classList.remove('hidden');
        document.getElementById('modal').classList.add('flex');
      } catch (e) { alert('Failed to load details'); }
    }

    function closeModal() {
      document.getElementById('modal').classList.add('hidden');
      document.getElementById('modal').classList.remove('flex');
    }

    document.addEventListener('DOMContentLoaded', () => { loadStats(); loadHistory(); });
  </script>
</body>
</html>`;

export function createDashboardRoutes() {
  return [
    {
      path: "/dashboard",
      method: "GET" as const,
      createHandler: async () => {
        return async (c: any) => {
          return c.html(DASHBOARD_HTML);
        };
      },
    },
    {
      path: "/api/dashboard/stats",
      method: "GET" as const,
      createHandler: async ({ mastra }: { mastra: Mastra }) => {
        return async (c: any) => {
          const logger = mastra?.getLogger();
          logger?.info("📊 [Dashboard] Fetching optimization stats");
          try {
            const pool = getDbPool();
            const result = await pool.query(
              `SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                COUNT(*) FILTER (WHERE status = 'processing') as processing
              FROM optimization_records`
            );
            logger?.info("✅ [Dashboard] Stats fetched successfully", result.rows[0]);
            return c.json(result.rows[0] || { total: 0, completed: 0, failed: 0, processing: 0 });
          } catch (e) {
            logger?.error("❌ [Dashboard] Failed to fetch stats", { error: e });
            return c.json({ total: 0, completed: 0, failed: 0, processing: 0 });
          }
        };
      },
    },
    {
      path: "/api/dashboard/history",
      method: "GET" as const,
      createHandler: async ({ mastra }: { mastra: Mastra }) => {
        return async (c: any) => {
          const logger = mastra?.getLogger();
          logger?.info("📜 [Dashboard] Fetching optimization history");
          try {
            const pool = getDbPool();
            const result = await pool.query(
              `SELECT id, video_id, video_title, status, created_at, updated_at
              FROM optimization_records
              ORDER BY created_at DESC
              LIMIT 50`
            );
            logger?.info(`✅ [Dashboard] Found ${result.rows.length} records`);
            return c.json({ records: result.rows });
          } catch (e) {
            logger?.error("❌ [Dashboard] Failed to fetch history", { error: e });
            return c.json({ records: [] });
          }
        };
      },
    },
    {
      path: "/api/dashboard/record/:id",
      method: "GET" as const,
      createHandler: async ({ mastra }: { mastra: Mastra }) => {
        return async (c: any) => {
          const logger = mastra?.getLogger();
          const id = c.req.param("id");
          logger?.info(`🔍 [Dashboard] Fetching record: ${id}`);
          try {
            const pool = getDbPool();
            const result = await pool.query(
              "SELECT * FROM optimization_records WHERE id = $1",
              [id]
            );
            if (result.rows.length === 0) {
              logger?.warn(`⚠️ [Dashboard] Record not found: ${id}`);
              return c.json({ error: "Not found" }, 404);
            }
            logger?.info(`✅ [Dashboard] Record fetched: ${id}`);
            return c.json(result.rows[0]);
          } catch (e) {
            logger?.error(`❌ [Dashboard] Failed to fetch record: ${id}`, { error: e });
            return c.json({ error: "Failed to fetch record" }, 500);
          }
        };
      },
    },
    {
      path: "/api/dashboard/trigger",
      method: "POST" as const,
      createHandler: async ({ mastra }: { mastra: Mastra }) => {
        return async (c: any) => {
          const logger = mastra?.getLogger();
          logger?.info("🚀 [Dashboard] Manual trigger requested");
          try {
            const workflow = mastra.getWorkflow("youtube-optimizer-workflow");
            if (!workflow) {
              logger?.error("❌ [Dashboard] Workflow not found");
              return c.json({ error: "Workflow not found" }, 404);
            }
            
            const run = await workflow.createRunAsync();
            logger?.info(`📝 [Dashboard] Created workflow run: ${run.runId}`);
            
            await inngest.send({
              name: `workflow.${workflow.id}`,
              data: {
                runId: run.runId,
                inputData: {},
              },
            });
            
            logger?.info(`✅ [Dashboard] Triggered workflow successfully`, { runId: run.runId });
            return c.json({ 
              message: "Optimization triggered successfully!",
              runId: run.runId 
            });
          } catch (e: any) {
            logger?.error("❌ [Dashboard] Failed to trigger workflow", { error: e.message });
            return c.json({ error: e.message || "Failed to trigger" }, 500);
          }
        };
      },
    },
  ];
}
