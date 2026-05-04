---
name: weft-manim
description: Generate a Manim animation visualising the Weft verification flow as a weaving — threads appear (evidence), interlace (peer consensus), and form fabric (verified milestone card)
version: 1.0.0
metadata:
  hermes:
    tags: [creative, animation, manim, weaving, visualization, hackathon]
    category: creative
    requires_toolsets: [terminal]
---

# Weft Manim — Animated Verification Weaving

## When to Use

- User says "animate the verification", "show me the weaving", "animate weft", "create a weaving animation"
- Generating visual content for hackathon demo videos
- Making the verification flow tangible and beautiful

## What It Produces

A Manim animation (MP4) showing the Weft verification flow as a literal weaving:

1. **Warp threads** appear vertically — the structural data layer (blockchain, contracts, immutable)
2. **Weft threads** weave horizontally through the warp — evidence threads (commits, callers, deployment)
3. **Interlacing** — peer consensus nodes light up as threads cross, forming the mesh
4. **Fabric emerges** — the verified milestone card materialises from the completed weave
5. **Tagline** fades in: "Technology provides the warp. Liberal arts provide the weft."

## Rules

- **Execute immediately** — do not explore the filesystem or ask questions first
- **Install manim if needed** — run `pip3 install manim` if not already installed
- **Always open the output** — call `open <path>` on the rendered MP4
- **Use the demo milestone** — hash `0x5169...c16f`, 147 callers, 23 commits, 3 peer signers

## Procedure

Run this single script. It writes a Python file and renders it with Manim.

```bash
cd ~/dev/weft && pip3 install manim 2>/dev/null | tail -1

cat > /tmp/weft_weaving.py << 'PYEOF'
from manim import *
import random

# Weft brand colours
WARP_COLOR = "#4a5568"      # slate — structural, immutable
WEFT_GREEN = "#48bb78"      # verified green
WEFT_AMBER = "#ecc94b"      # usage/callers
WEFT_BLUE = "#4299e1"       # commits/github
WEFT_PURPLE = "#9f7aea"     # peer consensus
FABRIC_BG = "#1a202c"       # dark background
ACCENT = "#f6ad55"          # highlight

class WeftWeaving(Scene):
    def construct(self):
        self.camera.background_color = FABRIC_BG

        # ── Title ──
        title = Text("The Weaving of Weft", font_size=48, color=WHITE)
        subtitle = Text(
            "Trustless verification, visualised",
            font_size=24, color=GREY_B
        )
        subtitle.next_to(title, DOWN, buff=0.3)
        self.play(Write(title), run_time=1.5)
        self.play(FadeIn(subtitle, shift=UP * 0.2), run_time=0.8)
        self.wait(1)
        self.play(FadeOut(title), FadeOut(subtitle))

        # ── Phase 1: Warp threads (vertical — the data layer) ──
        phase1 = Text("Phase 1: The Warp", font_size=36, color=WARP_COLOR)
        phase1_sub = Text(
            "Blockchain · Contracts · Immutable structure",
            font_size=20, color=GREY_B
        )
        phase1_sub.next_to(phase1, DOWN, buff=0.2)
        self.play(FadeIn(phase1), FadeIn(phase1_sub))
        self.wait(0.8)
        self.play(FadeOut(phase1), FadeOut(phase1_sub))

        NUM_WARP = 9
        warp_lines = VGroup()
        warp_x_positions = [
            -3.5 + i * (7.0 / (NUM_WARP - 1)) for i in range(NUM_WARP)
        ]
        for x in warp_x_positions:
            line = Line(
                start=[x, -3.5, 0], end=[x, 3.5, 0],
                stroke_width=2, color=WARP_COLOR
            )
            warp_lines.add(line)

        self.play(
            *[Create(l) for l in warp_lines],
            run_time=2, lag_ratio=0.15
        )
        self.wait(0.5)

        # ── Phase 2: Weft threads (horizontal — evidence) ──
        phase2 = Text("Phase 2: The Weft", font_size=36, color=WEFT_GREEN)
        phase2_sub = Text(
            "Evidence threads: deployment · usage · commits",
            font_size=20, color=GREY_B
        )
        phase2_sub.to_edge(UP, buff=0.3)
        phase2.next_to(phase2_sub, UP, buff=0.2)
        self.play(FadeIn(phase2), FadeIn(phase2_sub))

        evidence_threads = [
            ("Deployment verified", WEFT_GREEN, -2.5),
            ("147 unique callers", WEFT_AMBER, -1.5),
            ("23 commits", WEFT_BLUE, -0.5),
            ("4 PRs merged", WEFT_BLUE, 0.5),
            ("Code hash confirmed", WEFT_GREEN, 1.5),
        ]

        weft_lines = VGroup()
        labels = VGroup()
        for text, color, y in evidence_threads:
            # Weave: go over/under warp threads
            points = []
            amplitude = 0.15
            for j, x in enumerate(warp_x_positions):
                offset = amplitude if j % 2 == 0 else -amplitude
                points.append([x, y + offset, 0])

            path = VMobject(stroke_width=3, color=color)
            path.set_points_smoothly([np.array(p) for p in points])
            weft_lines.add(path)

            label = Text(text, font_size=14, color=color)
            label.next_to(path, RIGHT, buff=0.3)
            labels.add(label)

        for wl, lb in zip(weft_lines, labels):
            self.play(Create(wl), FadeIn(lb, shift=LEFT * 0.3), run_time=1.2)

        self.wait(0.5)
        self.play(FadeOut(phase2), FadeOut(phase2_sub))

        # ── Phase 3: Interlacing (peer consensus) ──
        phase3 = Text("Phase 3: Interlacing", font_size=36, color=WEFT_PURPLE)
        phase3_sub = Text(
            "Peer consensus: 3 nodes verify independently",
            font_size=20, color=GREY_B
        )
        phase3_sub.to_edge(UP, buff=0.3)
        phase3.next_to(phase3_sub, UP, buff=0.2)
        self.play(FadeIn(phase3), FadeIn(phase3_sub))

        # Show 3 peer nodes
        node_positions = [[-2, 2.5, 0], [0, 2.5, 0], [2, 2.5, 0]]
        nodes = VGroup()
        node_labels = VGroup()
        for idx, pos in enumerate(node_positions):
            circle = Circle(radius=0.3, color=WEFT_PURPLE, fill_opacity=0.2)
            circle.move_to(pos)
            nodes.add(circle)
            nl = Text(f"Node {idx+1}", font_size=14, color=WEFT_PURPLE)
            nl.next_to(circle, DOWN, buff=0.15)
            node_labels.add(nl)

        self.play(
            *[GrowFromCenter(n) for n in nodes],
            *[FadeIn(nl) for nl in node_labels],
            run_time=1
        )

        # Consensus lines between nodes
        consensus_lines = VGroup()
        for i in range(3):
            for j in range(i + 1, 3):
                cl = Line(
                    start=node_positions[i], end=node_positions[j],
                    stroke_width=2, color=WEFT_PURPLE
                ).set_opacity(0.5)
                consensus_lines.add(cl)

        self.play(*[Create(cl) for cl in consensus_lines], run_time=1)

        # Flash nodes to show agreement
        for _ in range(2):
            self.play(
                *[n.animate.set_fill(WEFT_PURPLE, opacity=0.8) for n in nodes],
                run_time=0.3
            )
            self.play(
                *[n.animate.set_fill(WEFT_PURPLE, opacity=0.2) for n in nodes],
                run_time=0.3
            )

        verdict = Text("✓ 3/3 VERIFIED", font_size=28, color=WEFT_GREEN)
        verdict.move_to([0, 2.5, 0])
        self.play(
            FadeOut(nodes), FadeOut(node_labels), FadeOut(consensus_lines),
            FadeIn(verdict, scale=1.5),
            run_time=1
        )
        self.wait(0.5)
        self.play(FadeOut(phase3), FadeOut(phase3_sub), FadeOut(verdict))

        # ── Phase 4: Fabric emerges ──
        phase4 = Text("The Fabric", font_size=36, color=WHITE)
        phase4.to_edge(UP, buff=0.5)
        self.play(FadeIn(phase4))

        # Brighten all threads to show completed fabric
        self.play(
            *[wl.animate.set_stroke(opacity=1.0, width=4) for wl in weft_lines],
            *[l.animate.set_stroke(opacity=0.8, width=3) for l in warp_lines],
            run_time=1.5
        )

        # Milestone card appears from the weave
        card = RoundedRectangle(
            corner_radius=0.2, width=5, height=2.5,
            fill_color="#2d3748", fill_opacity=0.95,
            stroke_color=WEFT_GREEN, stroke_width=2
        )
        card.move_to([0, 0, 0])

        card_title = Text("Milestone Verified", font_size=24, color=WEFT_GREEN)
        card_title.move_to(card.get_top() + DOWN * 0.4)

        card_hash = Text("0x5169...c16f", font_size=16, color=GREY_B)
        card_hash.next_to(card_title, DOWN, buff=0.2)

        card_stats = VGroup(
            Text("147 callers", font_size=16, color=WEFT_AMBER),
            Text("23 commits", font_size=16, color=WEFT_BLUE),
            Text("3/3 peers", font_size=16, color=WEFT_PURPLE),
        ).arrange(RIGHT, buff=0.8)
        card_stats.next_to(card_hash, DOWN, buff=0.3)

        card_ens = Text("weft.thisyearnofear.eth", font_size=14, color=ACCENT)
        card_ens.next_to(card_stats, DOWN, buff=0.3)

        card_group = VGroup(card, card_title, card_hash, card_stats, card_ens)

        self.play(
            FadeOut(warp_lines), FadeOut(weft_lines), FadeOut(labels),
            FadeOut(phase4),
            run_time=0.5
        )
        self.play(
            FadeIn(card_group, scale=0.8),
            run_time=1.5
        )
        self.wait(1)

        # ── Tagline ──
        self.play(FadeOut(card_group), run_time=0.8)

        tagline1 = Text(
            "Technology provides the warp.",
            font_size=32, color=WARP_COLOR
        )
        tagline2 = Text(
            "Liberal arts provide the weft.",
            font_size=32, color=WEFT_GREEN
        )
        tagline2.next_to(tagline1, DOWN, buff=0.4)

        self.play(Write(tagline1), run_time=1.5)
        self.play(Write(tagline2), run_time=1.5)
        self.wait(2)
        self.play(FadeOut(tagline1), FadeOut(tagline2))
PYEOF

echo "Rendering animation..."
cd /tmp && manim -pql weft_weaving.py WeftWeaving 2>&1 | tail -5
echo ""
echo "✓ Animation rendered"
ANIM=$(find /tmp/media/videos/weft_weaving -name "WeftWeaving.mp4" 2>/dev/null | head -1)
if [ -n "$ANIM" ]; then
  cp "$ANIM" ~/dev/weft/agent/.attestations/weft_weaving.mp4
  echo "✓ Copied to: ~/dev/weft/agent/.attestations/weft_weaving.mp4"
  open "$ANIM"
else
  echo "⚠ Animation file not found — check manim output above"
fi
```

After the animation opens, print to chat:

```
🧵 The Weaving of Weft — animated.

Warp threads are the blockchain: vertical, structural, immutable.
Weft threads are the evidence: commits, callers, deployment — woven horizontally through the structure.
Peer consensus is the interlacing: three nodes flash in agreement.
The fabric is the verified milestone card that emerges from the completed weave.

Technology provides the warp. Liberal arts provide the weft.

Generated with Manim — the engine behind 3Blue1Brown.
```
