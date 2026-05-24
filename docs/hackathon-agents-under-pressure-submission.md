# Agents Under Pressure — Hackathon Submission (Recovery Track)

## Project: Weft
**Autonomous Milestone Verifier with Self-Healing Infrastructure**

### 1. The Vision
Weft is an autonomous verifier agent for onchain builders. It gates capital release (escrowed on 0G Chain) based on deterministic evidence gathered from across the stack.

In a "normal" world, if a builder's RPC times out or an AI narrative service goes down, the agent crashes or reports a failure. **Weft is built for the "Agents Under Pressure" reality: it treats infrastructure failure as a routing problem, not a crash.**

### 2. How it works (The AI OS Architecture)
Weft operates like a distributed OS for financial verification:
- **The Kernel (`weft_daemon.py`):** Coordinates multiple worker agents that collect evidence, reach peer consensus, and synthesize narratives.
- **Autonomous Recovery Layers:**
    - **RPC Layer:** Automatically switches to fallback chains (0G Galileo → PublicNode) upon timeout.
    - **Consensus Layer:** Encrypted P2P transport via **AXL**. If a peer drops, the agent reroutes consensus through remaining nodes.
    - **AI Layer:** If Kimi (narrative AI) is unavailable, the agent serves from its local cache or falls back to a deterministic template to ensure the verdict lands.
    - **Execution Layer:** Uses **KeeperHub** with built-in exponential backoff and retry for onchain settlement.

### 3. HydraDB — Operational Memory
Weft uses **HydraDB** (CortexDB) as its "Operational Memory" layer. Every failure, timeout, and recovery event is captured as an experience. 
- **Recall:** The agent uses HydraDB to recall historical failure patterns (e.g., "RPC frequency timeout") to improve its autonomous decision-making.
- **Insights:** The Recovery Dashboard queries HydraDB to provide human-readable insights into system stability.

### 4. Demo: The Recovery Dashboard
Visit [weft.thisyearnofear.com/recovery](https://weft.thisyearnofear.com/recovery) to see the agent under pressure:
1. **Inject Chaos:** Hit "Kill All" to simulate simultaneous failure of RPC, Peers, AI, and Execution.
2. **Run Demo:** Watch the live event timeline as the agent detects each failure and triggers its autonomous recovery path.
3. **Verdict:** Watch as the onchain verdict lands despite 4 simultaneous infrastructure failures.

### 5. Submission Links
- **GitHub**: https://github.com/thisyearnofear/weft
- **Live Demo**: https://weft.thisyearnofear.com/recovery
- **Video Demo**: [Link to 3-min video]
- **Track**: Recovery (Agents that handle failure)

### 6. Team
- **Team Name**: Weft
- **Contact**: @thisyearnofear

---
**"Don't build a chatbot. Build an OS that can survive the chaos."**
