"""
API Test Page - Test all endpoints individually
"""

from flask import Flask, render_template_string, request, jsonify
import requests
import time
import sys
sys.path.insert(0, 'd:/PharmaLensv2')
from services.trends_service import TrendsService

app = Flask(__name__)
trends_service = TrendsService(geo="IN", mock_mode=False)

DRUG_API_BASE = "http://localhost:3000"

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Test Console</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', sans-serif;
            background: #0f172a;
            min-height: 100vh;
            color: #e2e8f0;
            padding: 24px;
        }
        
        h1 {
            font-size: 1.5rem;
            margin-bottom: 8px;
            color: #fff;
        }
        
        .subtitle {
            color: #64748b;
            margin-bottom: 24px;
        }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        @media (max-width: 900px) {
            .grid { grid-template-columns: 1fr; }
        }
        
        .card {
            background: #1e293b;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #334155;
        }
        
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        
        .card-title {
            font-weight: 600;
            color: #fff;
        }
        
        .method {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        
        .method.get { background: #22c55e; color: #000; }
        .method.post { background: #3b82f6; color: #fff; }
        
        .endpoint {
            background: #0f172a;
            padding: 10px 14px;
            border-radius: 6px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            margin-bottom: 16px;
            color: #94a3b8;
        }
        
        .params {
            margin-bottom: 16px;
        }
        
        .param-row {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .param-row label {
            width: 100px;
            font-size: 0.85rem;
            color: #94a3b8;
            display: flex;
            align-items: center;
        }
        
        .param-row input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #334155;
            border-radius: 6px;
            background: #0f172a;
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
        }
        
        .param-row input:focus {
            outline: none;
            border-color: #3b82f6;
        }
        
        button.test-btn {
            width: 100%;
            padding: 10px;
            background: #3b82f6;
            border: none;
            border-radius: 6px;
            color: #fff;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 12px;
        }
        
        button.test-btn:hover { background: #2563eb; }
        button.test-btn:disabled { background: #475569; }
        
        .response-box {
            background: #0f172a;
            border-radius: 6px;
            padding: 12px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            max-height: 300px;
            overflow: auto;
            white-space: pre-wrap;
            word-break: break-all;
        }
        
        .response-meta {
            display: flex;
            gap: 16px;
            margin-bottom: 8px;
            font-size: 0.8rem;
        }
        
        .status-ok { color: #22c55e; }
        .status-err { color: #ef4444; }
        
        .timer-bar {
            background: #1e293b;
            border-radius: 8px;
            padding: 16px 24px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid #334155;
        }
        
        .timer-item {
            text-align: center;
        }
        
        .timer-value {
            font-size: 1.5rem;
            font-weight: 600;
            font-family: 'JetBrains Mono', monospace;
        }
        
        .timer-value.fast { color: #22c55e; }
        .timer-value.slow { color: #f59e0b; }
        
        .timer-label {
            font-size: 0.75rem;
            color: #64748b;
        }
    </style>
</head>
<body>
    <h1>🧪 API Test Console</h1>
    <p class="subtitle">Test Drug Search API (Node.js) and Trends Service (Python) individually</p>
    
    <div class="timer-bar">
        <div class="timer-item">
            <div class="timer-value" id="totalTests">0</div>
            <div class="timer-label">Total Tests</div>
        </div>
        <div class="timer-item">
            <div class="timer-value" id="passedTests">0</div>
            <div class="timer-label">Passed</div>
        </div>
        <div class="timer-item">
            <div class="timer-value" id="failedTests">0</div>
            <div class="timer-label">Failed</div>
        </div>
        <div class="timer-item">
            <div class="timer-value fast" id="avgTime">--</div>
            <div class="timer-label">Avg Response (ms)</div>
        </div>
    </div>
    
    <div class="grid">
        <!-- Drug Search API -->
        <div class="card">
            <div class="card-header">
                <span class="card-title">1. Drug Search</span>
                <span class="method get">GET</span>
            </div>
            <div class="endpoint">/api/search?drug=...</div>
            <div class="params">
                <div class="param-row">
                    <label>drug</label>
                    <input type="text" id="p1_drug" value="Paracetamol">
                </div>
                <div class="param-row">
                    <label>limit</label>
                    <input type="text" id="p1_limit" value="5">
                </div>
            </div>
            <button class="test-btn" onclick="testDrugSearch()">▶ Test</button>
            <div class="response-meta">
                <span>Status: <span id="r1_status">--</span></span>
                <span>Time: <span id="r1_time">--</span></span>
            </div>
            <div class="response-box" id="r1_body">Click Test to see response</div>
        </div>
        
        <!-- Condition Search API -->
        <div class="card">
            <div class="card-header">
                <span class="card-title">2. Condition Search</span>
                <span class="method get">GET</span>
            </div>
            <div class="endpoint">/api/search?condition=...</div>
            <div class="params">
                <div class="param-row">
                    <label>condition</label>
                    <input type="text" id="p2_condition" value="Diabetes">
                </div>
                <div class="param-row">
                    <label>limit</label>
                    <input type="text" id="p2_limit" value="5">
                </div>
            </div>
            <button class="test-btn" onclick="testConditionSearch()">▶ Test</button>
            <div class="response-meta">
                <span>Status: <span id="r2_status">--</span></span>
                <span>Time: <span id="r2_time">--</span></span>
            </div>
            <div class="response-box" id="r2_body">Click Test to see response</div>
        </div>
        
        <!-- Price Filter -->
        <div class="card">
            <div class="card-header">
                <span class="card-title">3. Price Filter</span>
                <span class="method get">GET</span>
            </div>
            <div class="endpoint">/api/search?drug=...&max_price=...</div>
            <div class="params">
                <div class="param-row">
                    <label>drug</label>
                    <input type="text" id="p3_drug" value="Metformin">
                </div>
                <div class="param-row">
                    <label>max_price</label>
                    <input type="text" id="p3_max_price" value="100">
                </div>
            </div>
            <button class="test-btn" onclick="testPriceFilter()">▶ Test</button>
            <div class="response-meta">
                <span>Status: <span id="r3_status">--</span></span>
                <span>Time: <span id="r3_time">--</span></span>
            </div>
            <div class="response-box" id="r3_body">Click Test to see response</div>
        </div>
        
        <!-- Trends Service -->
        <div class="card">
            <div class="card-header">
                <span class="card-title">4. Google Trends</span>
                <span class="method get">GET</span>
            </div>
            <div class="endpoint">/api/trends?drug=...</div>
            <div class="params">
                <div class="param-row">
                    <label>drug</label>
                    <input type="text" id="p4_drug" value="Crocin">
                </div>
            </div>
            <button class="test-btn" onclick="testTrends()">▶ Test</button>
            <div class="response-meta">
                <span>Status: <span id="r4_status">--</span></span>
                <span>Time: <span id="r4_time">--</span></span>
            </div>
            <div class="response-box" id="r4_body">Click Test to see response</div>
        </div>
        
        <!-- Combined Drug+Condition -->
        <div class="card">
            <div class="card-header">
                <span class="card-title">5. Drug + Condition</span>
                <span class="method get">GET</span>
            </div>
            <div class="endpoint">/api/search?drug=...&condition=...</div>
            <div class="params">
                <div class="param-row">
                    <label>drug</label>
                    <input type="text" id="p5_drug" value="Insulin">
                </div>
                <div class="param-row">
                    <label>condition</label>
                    <input type="text" id="p5_condition" value="Diabetes">
                </div>
            </div>
            <button class="test-btn" onclick="testDrugCondition()">▶ Test</button>
            <div class="response-meta">
                <span>Status: <span id="r5_status">--</span></span>
                <span>Time: <span id="r5_time">--</span></span>
            </div>
            <div class="response-box" id="r5_body">Click Test to see response</div>
        </div>
        
        <!-- Sort by Rating -->
        <div class="card">
            <div class="card-header">
                <span class="card-title">6. Sort by Rating</span>
                <span class="method get">GET</span>
            </div>
            <div class="endpoint">/api/search?drug=...&sort=rating</div>
            <div class="params">
                <div class="param-row">
                    <label>drug</label>
                    <input type="text" id="p6_drug" value="Paracetamol">
                </div>
                <div class="param-row">
                    <label>min_rating</label>
                    <input type="text" id="p6_rating" value="7">
                </div>
            </div>
            <button class="test-btn" onclick="testSortRating()">▶ Test</button>
            <div class="response-meta">
                <span>Status: <span id="r6_status">--</span></span>
                <span>Time: <span id="r6_time">--</span></span>
            </div>
            <div class="response-box" id="r6_body">Click Test to see response</div>
        </div>
    </div>
    
    <script>
        let testStats = { total: 0, passed: 0, failed: 0, times: [] };
        
        function updateStats(passed, time) {
            testStats.total++;
            if (passed) testStats.passed++;
            else testStats.failed++;
            testStats.times.push(time);
            
            document.getElementById('totalTests').textContent = testStats.total;
            document.getElementById('passedTests').textContent = testStats.passed;
            document.getElementById('failedTests').textContent = testStats.failed;
            
            const avg = Math.round(testStats.times.reduce((a,b) => a+b, 0) / testStats.times.length);
            const avgEl = document.getElementById('avgTime');
            avgEl.textContent = avg + 'ms';
            avgEl.className = 'timer-value ' + (avg < 500 ? 'fast' : 'slow');
        }
        
        async function runTest(url, statusId, timeId, bodyId) {
            const statusEl = document.getElementById(statusId);
            const timeEl = document.getElementById(timeId);
            const bodyEl = document.getElementById(bodyId);
            
            bodyEl.textContent = 'Loading...';
            
            const start = performance.now();
            try {
                const res = await fetch(url);
                const time = Math.round(performance.now() - start);
                const data = await res.json();
                
                statusEl.textContent = res.status;
                statusEl.className = res.ok ? 'status-ok' : 'status-err';
                timeEl.textContent = time + 'ms';
                bodyEl.textContent = JSON.stringify(data, null, 2);
                
                updateStats(res.ok, time);
            } catch (e) {
                const time = Math.round(performance.now() - start);
                statusEl.textContent = 'ERR';
                statusEl.className = 'status-err';
                timeEl.textContent = time + 'ms';
                bodyEl.textContent = 'Error: ' + e.message;
                updateStats(false, time);
            }
        }
        
        async function testDrugSearch() {
            const drug = document.getElementById('p1_drug').value;
            const limit = document.getElementById('p1_limit').value;
            await runTest(`/proxy/search?drug=${encodeURIComponent(drug)}&limit=${limit}`, 'r1_status', 'r1_time', 'r1_body');
        }
        
        async function testConditionSearch() {
            const condition = document.getElementById('p2_condition').value;
            const limit = document.getElementById('p2_limit').value;
            await runTest(`/proxy/search?condition=${encodeURIComponent(condition)}&limit=${limit}`, 'r2_status', 'r2_time', 'r2_body');
        }
        
        async function testPriceFilter() {
            const drug = document.getElementById('p3_drug').value;
            const maxPrice = document.getElementById('p3_max_price').value;
            await runTest(`/proxy/search?drug=${encodeURIComponent(drug)}&max_price=${maxPrice}&limit=5`, 'r3_status', 'r3_time', 'r3_body');
        }
        
        async function testTrends() {
            const drug = document.getElementById('p4_drug').value;
            await runTest(`/api/trends?drug=${encodeURIComponent(drug)}`, 'r4_status', 'r4_time', 'r4_body');
        }
        
        async function testDrugCondition() {
            const drug = document.getElementById('p5_drug').value;
            const condition = document.getElementById('p5_condition').value;
            await runTest(`/proxy/search?drug=${encodeURIComponent(drug)}&condition=${encodeURIComponent(condition)}&limit=5`, 'r5_status', 'r5_time', 'r5_body');
        }
        
        async function testSortRating() {
            const drug = document.getElementById('p6_drug').value;
            const rating = document.getElementById('p6_rating').value;
            await runTest(`/proxy/search?drug=${encodeURIComponent(drug)}&min_rating=${rating}&sort=rating&limit=5`, 'r6_status', 'r6_time', 'r6_body');
        }
    </script>
</body>
</html>
"""

@app.route('/')
def home():
    return render_template_string(HTML_TEMPLATE)

@app.route('/proxy/search')
def proxy_search():
    """Proxy to Node.js API"""
    params = request.args.to_dict()
    try:
        r = requests.get(f"{DRUG_API_BASE}/api/search", params=params, timeout=10)
        return jsonify(r.json()), r.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/trends')
def get_trends():
    """Get trends from Python service"""
    drug = request.args.get('drug', '')
    result = trends_service.get_trend(drug)
    return jsonify(result)

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🧪 API Test Console")
    print("="*60)
    print("\n📍 Open: http://localhost:5002")
    print("📦 Drug API: http://localhost:3000 (Node.js)")
    print("📈 Trends: Built-in Python service")
    print("\nPress Ctrl+C to stop\n")
    app.run(debug=True, port=5002)
