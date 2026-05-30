const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS and JSON parsing middlewares
app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// 1. IN-MEMORY STATE & CONSTANTS
// -------------------------------------------------------------
const state = {
    cpuHistory: [32, 38, 42, 35, 48, 55, 60, 52, 49, 58, 62, 65, 54, 52, 59],
    ramHistory: [6.1, 6.2, 6.4, 6.3, 6.5, 6.6, 6.8, 6.7, 6.5, 6.6, 6.9, 7.1, 7.0, 7.0, 7.2],
    netHistory: [1.2, 1.5, 2.4, 1.8, 2.9, 3.2, 4.1, 3.5, 2.8, 3.9, 4.5, 5.2, 4.1, 3.8, 4.3],
    
    transactions: [],
    alerts: [],
    
    syncIntervalMs: 1500,
    faultRate: 0.15
};

const ENDPOINTS = [
    '/api/v1/auth/verify',
    '/api/v1/queries/spark-submit',
    '/api/v1/compute/matrix-solve',
    '/api/v1/quantum/entangle',
    '/api/v1/database/ledger-sync',
    '/api/v1/network/tunnel-open',
    '/api/v1/storage/commit'
];

const CLIENT_IPS = [
    '10.240.12.89',
    '192.168.10.42',
    '127.0.0.1',
    '10.12.94.133',
    '172.16.89.24',
    '10.240.14.2'
];

// Helper to inject a mock transaction
function injectMockTransaction(quiet = false) {
    const id = 'TX-' + Math.floor(100000 + Math.random() * 900000);
    const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
    const latency = Math.floor(12 + Math.random() * 120);
    const payload = (Math.random() * 8.5).toFixed(2) + ' KB';
    const ip = CLIENT_IPS[Math.floor(Math.random() * CLIENT_IPS.length)];
    
    let status = 'success';
    const roll = Math.random();
    if (roll < state.faultRate) {
        status = roll < (state.faultRate / 3) ? 'error' : 'warning';
    }

    const timestamp = new Date();
    const timeStr = timestamp.toLocaleTimeString();

    const tx = { id, endpoint, latency, payload, ip, status, timeStr };
    
    state.transactions.unshift(tx);
    if (state.transactions.length > 50) {
        state.transactions.pop();
    }

    if (status !== 'success') {
        const alertItem = {
            id: 'AL-' + Math.floor(1000 + Math.random() * 9000),
            txId: tx.id,
            message: tx.status === 'error' ? `Critical database timeout at route ${tx.endpoint}` : `High latency spike detected on endpoint ${tx.endpoint}`,
            type: tx.status,
            time: tx.timeStr
        };
        state.alerts.unshift(alertItem);
        if (state.alerts.length > 15) {
            state.alerts.pop();
        }
    }
    return tx;
}

// Generate initial mock data
for (let i = 0; i < 20; i++) {
    injectMockTransaction(true);
}

// -------------------------------------------------------------
// 2. DYNAMIC METRIC INTERVAL GENERATION
// -------------------------------------------------------------
let syncTimer = null;

function startMetricGenerator() {
    if (syncTimer) clearInterval(syncTimer);
    
    syncTimer = setInterval(() => {
        // Fluctuate CPU
        const prevCpu = state.cpuHistory[state.cpuHistory.length - 1];
        const cpuDelta = (Math.random() - 0.48) * 15;
        const nextCpu = Math.max(15, Math.min(prevCpu + cpuDelta, 98));

        // Fluctuate RAM
        const prevRam = state.ramHistory[state.ramHistory.length - 1];
        const ramDelta = (Math.random() - 0.5) * 0.4;
        const nextRam = Math.max(4.2, Math.min(prevRam + ramDelta, 14.8));

        // Fluctuate Network
        const prevNet = state.netHistory[state.netHistory.length - 1];
        const netDelta = (Math.random() - 0.45) * 0.8;
        const nextNet = Math.max(0.2, Math.min(prevNet + netDelta, 8.5));

        state.cpuHistory.push(nextCpu);
        state.ramHistory.push(nextRam);
        state.netHistory.push(nextNet);

        if (state.cpuHistory.length > 30) {
            state.cpuHistory.shift();
            state.ramHistory.shift();
            state.netHistory.shift();
        }

        // Random transaction addition organically
        if (Math.random() < 0.7) {
            injectMockTransaction(false);
        }
    }, state.syncIntervalMs);
}

startMetricGenerator();

// -------------------------------------------------------------
// 3. API ENDPOINTS
// -------------------------------------------------------------

// Fetch system dashboard metrics
app.get('/api/v1/metrics', (req, res) => {
    res.json({
        cpu: state.cpuHistory[state.cpuHistory.length - 1],
        ram: state.ramHistory[state.ramHistory.length - 1],
        net: state.netHistory[state.netHistory.length - 1],
        cpuHistory: state.cpuHistory,
        ramHistory: state.ramHistory,
        netHistory: state.netHistory
    });
});

// Fetch transaction database entries
app.get('/api/v1/transactions', (req, res) => {
    res.json(state.transactions);
});

// Manually inject a dynamic ledger log record
app.post('/api/v1/transactions', (req, res) => {
    const tx = injectMockTransaction(false);
    res.status(201).json(tx);
});

// Fetch system alert queue logs
app.get('/api/v1/alerts', (req, res) => {
    res.json(state.alerts);
});

// Delete all dashboard alert messages
app.delete('/api/v1/alerts', (req, res) => {
    state.alerts = [];
    res.json({ message: "Alerts queue flushed." });
});

// Execute custom backend terminal commands
app.post('/api/v1/terminal', (req, res) => {
    const { command } = req.body;
    if (!command) {
        return res.status(400).json({ error: "No query parameters received." });
    }

    const parts = command.trim().split(' ');
    const cmd = parts[0].toLowerCase();

    let response = "";

    switch (cmd) {
        case 'sysinfo':
            const cpu = state.cpuHistory[state.cpuHistory.length - 1].toFixed(1);
            const ram = state.ramHistory[state.ramHistory.length - 1].toFixed(1);
            response = `CONTAINER RUNTIME PARAMS:
  SYSTEM CORE    : Quantum M-80 CORE SERVER
  CPU ALLOC      : ${cpu}% Engine Util
  RAM COMMITTED  : ${ram} GB / 16.0 GB Core Pool
  NETWORK SYNC   : LINK SECURE (TUNNEL v6)
  UPTIME         : ${Math.floor(process.uptime())}s Live Node`;
            break;

        case 'db_stats':
            const errCount = state.transactions.filter(t => t.status === 'error').length;
            const warnCount = state.transactions.filter(t => t.status === 'warning').length;
            response = `LEDGER DUMP REPORT:
  TOTAL ENTRIES  : ${state.transactions.length} In-Memory
  CACHE BUFFER   : Active Flush enabled
  FAULT RATIO    : ${state.faultRate * 100}% Injected
  ERROR COMMITS  : ${errCount} records flagged
  WARN ALERTS    : ${warnCount} records flagged`;
            break;

        case 'trigger_error':
            const tx = {
                id: 'TX-FAIL-' + Math.floor(100000 + Math.random() * 900000),
                endpoint: '/api/v1/quantum/collapse',
                latency: 582,
                payload: '12.4 KB',
                ip: '127.0.0.1',
                status: 'error',
                timeStr: new Date().toLocaleTimeString()
            };
            state.transactions.unshift(tx);
            state.alerts.unshift({
                id: 'AL-' + Math.floor(1000 + Math.random() * 9000),
                txId: tx.id,
                message: `Critical database timeout at route ${tx.endpoint}`,
                type: tx.status,
                time: tx.timeStr
            });
            response = `SYSTEM ERROR INJECTED: Collapsing quantum entanglements at ${tx.endpoint}. Log written under ID ${tx.id}.`;
            break;

        case 'inject_spark':
            const qty = parseInt(parts[1]) || 5;
            for (let i = 0; i < qty; i++) {
                injectMockTransaction(true);
            }
            response = `SPARK PIPELINE: Injected ${qty} custom transaction objects into ledger pools.`;
            break;

        case 'help':
            response = `Available Quantum core command pipelines:
  - sysinfo: Display container metrics, active core engines, and runtime parameters.
  - db_stats: Dump memory details on JSON ledger tables.
  - trigger_error: Artificially inject error sequences.
  - inject_spark [qty]: Mass-execute database transfers.`;
            break;

        default:
            response = `bash: command not found: ${cmd}. Type 'help' to review active container options.`;
    }

    res.json({ output: response });
});

// Configure backend simulation constants
app.post('/api/v1/settings', (req, res) => {
    const { syncIntervalMs, faultRate } = req.body;
    
    if (syncIntervalMs !== undefined) {
        state.syncIntervalMs = parseInt(syncIntervalMs);
        startMetricGenerator();
    }
    if (faultRate !== undefined) {
        state.faultRate = parseFloat(faultRate);
    }
    
    res.json({
        message: "Configurations synchronized with Node.js backend.",
        syncIntervalMs: state.syncIntervalMs,
        faultRate: state.faultRate
    });
});

// -------------------------------------------------------------
// 4. SERVE STATIC FRONTEND
// -------------------------------------------------------------
app.use(express.static(path.join(__dirname, '../Frontend')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

// -------------------------------------------------------------
// 5. SERVER LAUNCH
// -------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 SECTION M COMMAND HUB IS LAUNCHED ONLINE`);
    console.log(`💻 Local Address: http://localhost:${PORT}`);
    console.log(`📦 Node Version : ${process.version}`);
    console.log(`======================================================\n`);
});
