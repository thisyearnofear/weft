#!/usr/bin/env node
/**
 * Minimal MCP client that talks to the TestSprite MCP server via stdio.
 * Sends JSON-RPC 2.0 messages and prints responses.
 *
 * Usage:
 *   node scripts/mcp-client.mjs bootstrap
 *   node scripts/mcp-client.mjs code-summary
 *   node scripts/mcp-client.mjs prd
 *   node scripts/mcp-client.mjs frontend-plan
 *   node scripts/mcp-client.mjs backend-plan
 *   node scripts/mcp-client.mjs generate-and-execute
 *   node scripts/mcp-client.mjs rerun
 */

import { spawn } from "child_process";

const API_KEY = process.env.TESTSPRITE_API_KEY;
if (!API_KEY) {
  console.error("ERROR: Set TESTSPRITE_API_KEY environment variable");
  process.exit(1);
}
const PROJECT_PATH = process.env.PROJECT_PATH || "/Users/udingethe/Dev/weft/frontend";
const LOCAL_PORT = parseInt(process.env.LOCAL_PORT || "3001", 10);

const command = process.argv[2] || "bootstrap";

// Tool name mapping
const TOOL_MAP = {
  "bootstrap": "testsprite_bootstrap",
  "code-summary": "testsprite_generate_code_summary",
  "prd": "testsprite_generate_standardized_prd",
  "frontend-plan": "testsprite_generate_frontend_test_plan",
  "backend-plan": "testsprite_generate_backend_test_plan",
  "generate-and-execute": "testsprite_generate_code_and_execute",
  "rerun": "testsprite_rerun_tests",
  "dashboard": "testsprite_open_test_result_dashboard",
  "account": "testsprite_check_account_info",
};

const toolName = TOOL_MAP[command];
if (!toolName) {
  console.error(`Unknown command: ${command}`);
  console.error(`Available: ${Object.keys(TOOL_MAP).join(", ")}`);
  process.exit(1);
}

// Start the MCP server as a subprocess
const mcp = spawn("npx", ["@testsprite/testsprite-mcp@latest"], {
  env: { ...process.env, API_KEY },
  stdio: ["pipe", "pipe", "pipe"],
});

let buffer = "";
let messageId = 0;
const pending = new Map();

// Parse incoming JSON-RPC messages
mcp.stdout.on("data", (data) => {
  buffer += data.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) {
          reject(new Error(JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      }
    } catch (e) {
      // Not a complete JSON message yet, or not JSON-RPC
      console.error("[mcp stderr]", line);
    }
  }
});

mcp.stderr.on("data", (data) => {
  const text = data.toString();
  // Only print non-empty stderr lines
  if (text.trim()) {
    console.error("[mcp]", text.trim());
  }
});

mcp.on("close", (code) => {
  console.error(`[mcp] Server exited with code ${code}`);
  process.exit(code || 0);
});

function sendRequest(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
    pending.set(id, { resolve, reject });
    mcp.stdin.write(msg);
  });
}

function sendNotification(method, params) {
  const msg = JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n";
  mcp.stdin.write(msg);
}

async function main() {
  try {
    // 1. Initialize
    console.log("→ Initializing MCP connection...");
    const initResult = await sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "weft-mcp-client", version: "1.0.0" },
    });
    console.log("✓ Initialized:", JSON.stringify(initResult).slice(0, 200));

    // 2. Send initialized notification
    sendNotification("notifications/initialized", {});

    // 3. List tools
    console.log("→ Listing available tools...");
    const toolsResult = await sendRequest("tools/list", {});
    const toolNames = toolsResult.tools.map((t) => t.name);
    console.log("✓ Available tools:", toolNames.join(", "));

    // 4. Call the requested tool
    console.log(`→ Calling ${toolName}...`);

    let params = {};
    if (command === "bootstrap") {
      params = {
        localPort: LOCAL_PORT,
        type: "frontend",
        projectPath: PROJECT_PATH,
        testScope: "codebase",
      };
    } else if (command === "code-summary") {
      params = { projectRootPath: PROJECT_PATH };
    } else if (command === "prd") {
      params = { projectPath: PROJECT_PATH };
    } else if (command === "frontend-plan") {
      params = { projectPath: PROJECT_PATH, needLogin: false };
    } else if (command === "backend-plan") {
      params = { projectPath: PROJECT_PATH };
    } else if (command === "generate-and-execute") {
      params = {
        projectName: "weft-frontend",
        projectPath: PROJECT_PATH,
        testIds: [],
        additionalInstruction: "Test all public pages: landing, explorer, operations, sponsor, activity, verifiers, API docs, recovery. The app is running on port " + LOCAL_PORT,
      };
    } else if (command === "rerun") {
      params = { projectPath: PROJECT_PATH };
    } else if (command === "dashboard") {
      params = {};
    }

    const result = await sendRequest("tools/call", {
      name: toolName,
      arguments: params,
    });

    console.log("\n═══════════════════════════════════════════════════");
    console.log("RESULT:");
    console.log("═══════════════════════════════════════════════════");
    if (result && result.content) {
      for (const item of result.content) {
        if (item.type === "text") {
          console.log(item.text);
        } else {
          console.log(JSON.stringify(item, null, 2));
        }
      }
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
    console.log("═══════════════════════════════════════════════════\n");

    // Clean up
    mcp.kill();
    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error.message);
    mcp.kill();
    process.exit(1);
  }
}

main();
