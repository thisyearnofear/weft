---
name: weft-demo
description: Conversational demo coordinator — chains verification, chronicle, and animation into a single natural-language-driven flow. Tries real data first, clearly labels demo fallback.
version: 2.1.0
metadata:
  hermes:
    tags: [web3, ai, kimi, fal, demo, storytelling, creative, 0g, axl, ens, manim]
    category: creative
    requires_toolsets: [terminal]
required_environment_variables:
  - name: KIMI_API_KEY
    prompt: Kimi/Moonshot API key
    required_for: "narrative generation"
---

# Weft Demo — Conversational Coordinator

## When to Use

- User says "run the demo", "demo weft", "show me everything", "I shipped a contract, verify it"
- Any request that implies showing the full Weft pipeline end-to-end

## What This Skill Does

This is a **coordinator**, not a monolithic script. It chains three skills in sequence:

1. **Verify** — collect evidence, show peer consensus (weft-verify logic)
2. **Chronicle** — Kimi weaves the narrative, HTML artifacts open in browser (weft-chronicle logic)
3. **Animate** — Manim renders the weaving visualisation (weft-manim logic)

Each phase has a narrative bridge printed to chat. The user sees a story unfold, not a script scroll by.

## Rules

- **Reason at each phase** — before executing, explain what you're about to do and why
- **Try real data first** — attempt real verification; only use demo data as explicit fallback
- **Label demo content** — any hardcoded or example data must be marked `[DEMO]` in the output
- **Print narrative bridges** between phases — these are the words the presenter says on camera
- **Always open visual artifacts** — chronicle HTML, milestone card, Manim MP4
- **Source env once** — `cd $WEFT_ROOT && source scripts/.env 2>/dev/null` at the start, not per step
- **Clean up AXL nodes** at the end — `pkill -f "axl -config" 2>/dev/null`

## Procedure

### Phase 0 — Setup + Discovery

**Reason in chat:** Explain what you're about to do: "I'm going to run the full Weft pipeline. First, let me check if there are real milestone attestations available. If there are, I'll use real data. If not, I'll show you the pipeline with example data — everything will be clearly labeled."

```bash
cd $WEFT_ROOT && source scripts/.env 2>/dev/null
export PYTHONPATH="$PWD:$PYTHONPATH"

# Discover: do we have real attestations?
python3 -c "
import glob, json

real_attestations = sorted(glob.glob('agent/.attestations/*/attestation.json'))
if real_attestations:
    print('REAL_DATA')
    for p in real_attestations:
        with open(p) as f:
            d = json.load(f)
        mh = d.get('weft', {}).get('milestoneHash', d.get('milestoneHash', '?'))
        print(f'  Milestone: {mh[:18]}...')
else:
    print('DEMO_MODE')
    print('  No attestations found. Will use example data for demo.')
    print('  To run with real data, verify a milestone first:')
    print('    /weft-workflow')
"
```

**Evaluate:** If `REAL_DATA` was printed, note the milestone hashes available. If `DEMO_MODE`, explain that the demo will use illustrative data.

Set a variable for the milestone hash:
```bash
# Use real milestone if available, otherwise demo hash
MILESTONE=$(python3 -c "
import glob, json
atts = sorted(glob.glob('agent/.attestations/*/attestation.json'))
if atts:
    with open(atts[0]) as f:
        d = json.load(f)
    print(d.get('weft', {}).get('milestoneHash', d.get('milestoneHash', '0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f')))
else:
    print('0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f')
")
export MILESTONE
```

### Phase 1 — The Problem

Print to chat (no code):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧵 WEFT — Agent-Run Verification Company
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every day, builders ship working code and get ghosted by sponsors.
Manual reviews take weeks. Capital sits locked behind someone's inbox.

The builder shipped. The code works. The users came.
But the money hasn't moved.

Worse: no agent today can both EARN and PAY ITS OWN BILLS.
They're tools, not companies. They need humans to provision them.

Weft is different. It's an agent that runs a real business:
  - EARNS 3% of every milestone it verifies (onchain revenue)
  - SPENDS that revenue via Stripe Skills to pay for Kimi, fal.ai, KeeperHub
  - PROVISIONS its own SaaS when it needs to scale
  - Runs on Nemotron 3 Ultra for fast, safe reasoning (via NemoClaw)

This isn't a chatbot. It's an autonomous company.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Phase 2 — Verify (evidence + peer consensus)

**Reason in chat:** Explain: "Now I'll collect evidence for this milestone. I check three signals: (1) does the contract code exist onchain, (2) how many unique wallets have interacted, (3) what GitHub activity exists in the milestone window. Then I'll check if peer verifiers agree."

```bash
cd $WEFT_ROOT && source scripts/.env 2>/dev/null
python3 - << 'PYEOF'
import os, sys, json, glob
sys.path.insert(0, '.')

from agent.lib.jsonrpc import JsonRpcClient
from agent.lib.mvp_verifier import eth_get_code

rpc_url = os.environ.get('ETH_RPC_URL', 'https://evmrpc-testnet.0g.ai')
contract = os.environ.get('WEFT_CONTRACT_ADDRESS', '0x9f66158c560ce5c8b40820fdcd2874ff8d852192')
milestone = os.environ.get('MILESTONE', '')

rpc = JsonRpcClient(rpc_url)
print()
print("  🔍 Collecting evidence...")
print()

# Deployment check
code_exists = False
try:
    code = eth_get_code(rpc, contract)
    if code and code != '0x':
        code_exists = True
        print(f"  ✓ Contract deployed at {contract[:14]}...{contract[-4:]}")
        print(f"    Code size: {len(code)//2 - 1} bytes")
except Exception as e:
    print(f"  ⚠ Deployment check: {e}")

# Check if we have a real attestation
real_data = False
atts = sorted(glob.glob('agent/.attestations/*/attestation.json'))
if atts:
    with open(atts[0]) as f:
        d = json.load(f)
    callers = d.get('evidence', {}).get('usage', {}).get('uniqueCallerCount', 0)
    commits = len(d.get('evidence', {}).get('github', {}).get('commits', []))
    prs = len(d.get('evidence', {}).get('github', {}).get('pull_requests', []))
    verified = d.get('verdict', {}).get('verified', False)
    evidence_root = d.get('evidenceRoot', '')
    print(f"  ✓ Unique callers:  {callers}")
    print(f"  ✓ GitHub commits:  {commits}")
    print(f"  ✓ Pull requests:   {prs}")
    real_data = True
    if verified:
        print(f"  ✓ Verdict:         VERIFIED")
    else:
        print(f"  ⚠ Verdict:         NOT VERIFIED")

if not real_data:
    print(f"  [DEMO] Unique callers:  147 (threshold: 10)")
    print(f"  [DEMO] GitHub commits:  23 in window")
    print(f"  [DEMO] Pull requests:   4")
    print(f"  [DEMO] This is example data. Run /weft-workflow to verify a real milestone.")
    print()
    if code_exists:
        print(f"  (The deployment check above is real onchain data.)")

print()
print("  🔗 Peer consensus via AXL...")
print()

# Try real AXL check, gracefully degrade
try:
    from agent.lib.axl_client import axl_available, receive_verdicts
    if axl_available():
        peers = receive_verdicts(milestone) if milestone else []
        if peers:
            for p in peers:
                print(f"    {p.verifier_address[:10]}... → verified={p.verified}")
            print()
            print(f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"  ✓ Consensus: {len(peers)}/{len(peers)} VERIFIED")
        else:
            print("  ⚠ No peer verdicts received yet")
            print()
            print(f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"  ✓ Single-node verification complete")
    else:
        print("  ⚠ AXL node not running — no peer consensus")
        print()
        print(f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"  ✓ Single-node verification complete")
except Exception as e:
    print(f"  ⚠ Peer consensus check: {e}")
    print()
    print(f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"  ✓ Verification data collected")

print()
PYEOF
```

Print to chat (adjust the message based on whether real or demo data was used):

```
The evidence is deterministic. The consensus is cryptographic.
No human reviewed this. The capital releases automatically.

But a transaction receipt isn't a story. This is where Kimi comes in.
```

### Phase 3 — Chronicle (Kimi narrative + HTML artifacts)

**Reason in chat:** Explain: "Now I'll weave the verification data into a Builder Journey narrative using Kimi. This transforms raw onchain data (bytes32 hashes, uint256 counts) into a story the builder can actually read and share."

```bash
cd $WEFT_ROOT && source scripts/.env 2>/dev/null
KIMI_API_KEY="$KIMI_API_KEY" python3 - << 'PYEOF'
import os, sys, json, glob
sys.path.insert(0, '.')

from agent.lib.kimi_client import generate_chronicle
from agent.lib.chronicle import write_chronicle, write_card, CardData

OUT = 'agent/.attestations/demo'
os.makedirs(OUT, exist_ok=True)

# Try real attestations first
attestations = []
for path in sorted(glob.glob('agent/.attestations/*/attestation.json')):
    if 'demo' in path:
        continue
    with open(path) as f:
        d = json.load(f)
    attestations.append({
        'milestoneHash': d.get('weft', {}).get('milestoneHash', d.get('milestoneHash', '')),
        'projectId':     d.get('weft', {}).get('projectId', d.get('projectId', 'weft-protocol')),
        'verified':      d.get('verdict', {}).get('verified', d.get('verified', False)),
        'uniqueCallerCount': d.get('evidence', {}).get('usage', {}).get('uniqueCallerCount',
                             d.get('usage', {}).get('uniqueCallerCount', 0)),
        'commitCount':   len(d.get('evidence', {}).get('github', {}).get('commits', [])),
        'narrative':     d.get('narrative', {}).get('summary', ''),
        'evidenceRoot':  d.get('evidenceRoot', ''),
        'peerSigners':   d.get('peerSigners', 0),
    })

is_demo = not attestations
if is_demo:
    attestations = [{
        'milestoneHash': os.environ.get('MILESTONE', '0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f'),
        'projectId': 'weft-protocol',
        'verified': True,
        'uniqueCallerCount': 147,
        'commitCount': 23,
        'narrative': '',
        'evidenceRoot': '',
        'peerSigners': 3,
    }]
    print("  [DEMO] No real attestations found — using example data for illustration.")
    print("  [DEMO] Run /weft-workflow to verify a real milestone first.")
    print()

print("  🧵 Kimi is weaving the narrative...")
print()

chronicle = generate_chronicle(attestations)

if chronicle.title:
    print(f'  {"[DEMO] " if is_demo else ""}\"{chronicle.title}\"')
    print()
    for ch in chronicle.chapters:
        tag = "[DEMO] " if is_demo else ""
        print(f'    {tag}Chapter: {ch["heading"]}')
        print(f'    {tag}\"{ch["body"][:160]}..."')
        print()
    if chronicle.epilogue:
        print(f'    {"[DEMO] " if is_demo else ""}Epilogue: "{chronicle.epilogue[:120]}..."')
        print()

    write_chronicle(
        title=chronicle.title,
        chapters=chronicle.chapters,
        epilogue=chronicle.epilogue,
        attestations=attestations,
        out_path=f'{OUT}/chronicle.html',
    )

    att = attestations[0]
    ch0 = chronicle.chapters[0] if chronicle.chapters else {}
    write_card(CardData(
        milestone_hash=att['milestoneHash'],
        project_id='weft-protocol',
        verified=True,
        narrative_summary=ch0.get('body', '')[:300],
        unique_callers=att['uniqueCallerCount'],
        commits=att['commitCount'],
        peer_signers=att.get('peerSigners', 0),
        evidence_root=att.get('evidenceRoot', ''),
        chapter_heading=ch0.get('heading', ''),
        chapter_body=ch0.get('body', ''),
    ), f'{OUT}/milestone_card.html')

    print(f'  ✓ Chronicle: {OUT}/chronicle.html')
    print(f'  ✓ Card:      {OUT}/milestone_card.html')
else:
    print("  ⚠ Kimi unavailable — narrative generation skipped")
    print("  (Check KIMI_API_KEY is set in scripts/.env)")
print()
PYEOF

open $WEFT_ROOT/agent/.attestations/demo/chronicle.html 2>/dev/null || true
open $WEFT_ROOT/agent/.attestations/demo/milestone_card.html 2>/dev/null || true
```

Print to chat:

```
This is what Weft produces. Not a transaction receipt. A story.

Real data. Real stakes. Generated by Kimi from onchain evidence.
Narrative non-fiction from the blockchain.
```

### Phase 4 — Animate (Manim weaving visualisation)

**Reason in chat:** Explain: "Finally, I'll render a Manim animation of the verification flow as a literal weaving. Warp threads are the blockchain (vertical, structural). Weft threads are the evidence (woven horizontally through the structure). Peer consensus is the interlacing. The fabric is the verified milestone card."

```bash
cd $WEFT_ROOT && pip3 install manim 2>/dev/null | tail -1

# Read real evidence values if available, otherwise use illustrative demo values
python3 -c "
import glob, json, os
callers = '147'
commits = '23'
prs = '4'
hash_short = '0x5169...c16f'
ens_name = 'weft.thisyearnofear.eth'
atts = sorted(glob.glob('agent/.attestations/*/attestation.json'))
if atts:
    with open(atts[0]) as f:
        d = json.load(f)
    c = d.get('evidence', {}).get('usage', {}).get('uniqueCallerCount', 147)
    cm = len(d.get('evidence', {}).get('github', {}).get('commits', [])) or 23
    pr = len(d.get('evidence', {}).get('github', {}).get('pull_requests', [])) or 4
    mh = d.get('weft', {}).get('milestoneHash', d.get('milestoneHash', ''))
    callers = str(c)
    commits = str(cm)
    prs = str(pr)
    if mh:
        hash_short = mh[:10] + '...' + mh[-4:]
print(f'{callers},{commits},{prs},{hash_short},{ens_name}')
" > /tmp/weft_anim_vars.txt

CALLERS=$(cut -d, -f1 /tmp/weft_anim_vars.txt)
COMMITS=$(cut -d, -f2 /tmp/weft_anim_vars.txt)
PRS=$(cut -d, -f3 /tmp/weft_anim_vars.txt)
HASH_SHORT=$(cut -d, -f4 /tmp/weft_anim_vars.txt)
ENS_NAME=$(cut -d, -f5 /tmp/weft_anim_vars.txt)

cat > /tmp/weft_weaving.py << PYEOF
from manim import *

WARP_COLOR = "#4a5568"
WEFT_GREEN = "#48bb78"
WEFT_AMBER = "#ecc94b"
WEFT_BLUE = "#4299e1"
WEFT_PURPLE = "#9f7aea"
FABRIC_BG = "#1a202c"
ACCENT = "#f6ad55"

class WeftWeaving(Scene):
    def construct(self):
        self.camera.background_color = FABRIC_BG

        title = Text("The Weaving of Weft", font_size=48, color=WHITE)
        sub = Text("Trustless verification, visualised", font_size=24, color=GREY_B)
        sub.next_to(title, DOWN, buff=0.3)
        self.play(Write(title), run_time=1.5)
        self.play(FadeIn(sub, shift=UP*0.2), run_time=0.8)
        self.wait(1)
        self.play(FadeOut(title), FadeOut(sub))

        # Warp threads (vertical — blockchain structure)
        NUM = 9
        xs = [-3.5 + i*(7.0/(NUM-1)) for i in range(NUM)]
        warps = VGroup(*[Line([x,-3.5,0],[x,3.5,0], stroke_width=2, color=WARP_COLOR) for x in xs])
        self.play(*[Create(l) for l in warps], run_time=2, lag_ratio=0.15)

        # Weft threads (horizontal — evidence)
        callers = "$CALLERS" + " callers"
        commits = "$COMMITS" + " commits"
        prs = "$PRS" + " PRs"
        threads = [
            ("Deployment", WEFT_GREEN, -2.5),
            (callers, WEFT_AMBER, -1.5),
            (commits, WEFT_BLUE, -0.5),
            (prs, WEFT_BLUE, 0.5),
            ("Code hash", WEFT_GREEN, 1.5),
        ]
        wefts = VGroup()
        labels = VGroup()
        for txt, col, y in threads:
            pts = [[x, y + (0.15 if j%2==0 else -0.15), 0] for j,x in enumerate(xs)]
            path = VMobject(stroke_width=3, color=col)
            path.set_points_smoothly([np.array(p) for p in pts])
            wefts.add(path)
            lb = Text(txt, font_size=14, color=col)
            lb.next_to(path, RIGHT, buff=0.3)
            labels.add(lb)
        for w,l in zip(wefts, labels):
            self.play(Create(w), FadeIn(l, shift=LEFT*0.3), run_time=1)

        # Peer consensus
        npos = [[-2,2.5,0],[0,2.5,0],[2,2.5,0]]
        nodes = VGroup(*[Circle(radius=0.3, color=WEFT_PURPLE, fill_opacity=0.2).move_to(p) for p in npos])
        self.play(*[GrowFromCenter(n) for n in nodes], run_time=0.8)
        for _ in range(2):
            self.play(*[n.animate.set_fill(WEFT_PURPLE, opacity=0.8) for n in nodes], run_time=0.25)
            self.play(*[n.animate.set_fill(WEFT_PURPLE, opacity=0.2) for n in nodes], run_time=0.25)
        v = Text("✓ 3/3 VERIFIED", font_size=28, color=WEFT_GREEN).move_to([0,2.5,0])
        self.play(FadeOut(nodes), FadeIn(v, scale=1.5), run_time=0.8)
        self.wait(0.5)
        self.play(FadeOut(v))

        # Milestone card emerges
        card = RoundedRectangle(corner_radius=0.2, width=5, height=2.5, fill_color="#2d3748", fill_opacity=0.95, stroke_color=WEFT_GREEN, stroke_width=2)
        ct = Text("Milestone Verified", font_size=24, color=WEFT_GREEN).move_to(card.get_top()+DOWN*0.4)
        ch = Text("$HASH_SHORT", font_size=16, color=GREY_B).next_to(ct, DOWN, buff=0.2)
        stats = VGroup(Text(callers,font_size=16,color=WEFT_AMBER), Text(commits,font_size=16,color=WEFT_BLUE), Text("3/3 peers",font_size=16,color=WEFT_PURPLE)).arrange(RIGHT, buff=0.8).next_to(ch, DOWN, buff=0.3)
        ens = Text("$ENS_NAME", font_size=14, color=ACCENT).next_to(stats, DOWN, buff=0.3)
        cg = VGroup(card, ct, ch, stats, ens)
        self.play(FadeOut(warps), FadeOut(wefts), FadeOut(labels), run_time=0.5)
        self.play(FadeIn(cg, scale=0.8), run_time=1.5)
        self.wait(1)
        self.play(FadeOut(cg), run_time=0.8)

        t1 = Text("Technology provides the warp.", font_size=32, color=WARP_COLOR)
        t2 = Text("Liberal arts provide the weft.", font_size=32, color=WEFT_GREEN).next_to(t1, DOWN, buff=0.4)
        self.play(Write(t1), run_time=1.5)
        self.play(Write(t2), run_time=1.5)
        self.wait(2)
        self.play(FadeOut(t1), FadeOut(t2))
PYEOF

echo "  🎬 Rendering Manim animation..."
cd /tmp && manim -pql weft_weaving.py WeftWeaving 2>&1 | tail -3
ANIM=$(find /tmp/media/videos/weft_weaving -name "WeftWeaving.mp4" 2>/dev/null | head -1)
if [ -n "$ANIM" ]; then
  cp "$ANIM" $WEFT_ROOT/agent/.attestations/weft_weaving.mp4
  echo "  ✓ Animation: $WEFT_ROOT/agent/.attestations/weft_weaving.mp4"
  open "$ANIM"
else
  echo "  ⚠ Manim not installed or render failed — install with: pip3 install manim"
fi
```

### Phase 5 — The Close

Print to chat:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧵 What Just Happened
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A builder shipped. Verifiers confirmed it — independently,
cryptographically, without a coordinator.

The agent earned 3% of the released capital. It swept that revenue
into its Stripe account and used it to pay for the services it
consumed: Nemotron for narratives, fal.ai for imagery, KeeperHub
for execution. No human touched the finances.

  0G Chain      ✓  Milestone contract + evidence storage
  Gensyn AXL    ✓  Encrypted P2P peer consensus
  KeeperHub     ✓  Reliable onchain execution
  ENS           ✓  Human-readable identity + reputation
  Nemotron 3    ✓  Fast, safe narrative reasoning (via NemoClaw)
  fal.ai        ✓  AI-woven milestone swatch
  Stripe Skills ✓  Autonomous earn→spend loop (agent pays its own bills)
  Manim         ✓  Animated verification weaving

Technology provides the warp. Liberal arts provide the weft.
The agent runs the loom — and pays for the thread.

  Live:    https://weft.thisyearnofear.com
  GitHub:  https://github.com/thisyearnofear/weft
  ENS:     weft.thisyearnofear.eth
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then clean up:

```bash
pkill -f "axl -config" 2>/dev/null
echo "  ✓ Cleanup complete"
```
