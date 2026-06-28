---
name: weft-treasury
description: Show the Weft agent's autonomous P&L — how much it earned from milestone verification fees and how much it spent on Kimi, fal.ai, KeeperHub, and other services via Stripe Skills. The proof that Weft is an agent-run company, not just a tool.
version: 1.0.0
metadata:
  hermes:
    tags: [web3, stripe, treasury, finance, autonomous, spend, earn, p&l]
    category: finance
    requires_toolsets: [terminal]
required_environment_variables:
  - name: STRIPE_SKILLS_KEY
    prompt: Stripe Skills API key
    required_for: "reading the agent's spend history and balance"
    help: "When unset, the skill reports that the spend loop is not yet activated"
---

# Weft Treasury — The Agent's Books

## When to Use

- User asks "show me the agent's books", "what did weft spend", "how much has the agent earned"
- User asks about the earn→spend loop or autonomous operations
- During a demo to prove the agent runs a real business
- User asks "is weft profitable?"

## What This Skill Does

Reads the Stripe Skills charge history and balance to produce a P&L report
showing:
- **Earned**: revenue swept from onchain milestone fees (3% of released capital)
- **Spent**: autonomous payments for Kimi narratives, fal.ai images, KeeperHub execution
- **Net**: profit/loss
- **Balance**: current Stripe operating balance

This is the proof surface that Weft is an agent-run company — it earns and
spends autonomously, without human intervention.

## Procedure

### 1. Fetch the P&L summary

```bash
python3 -c "
from agent.lib.stripe_skills_client import stripe_configured, get_profit_loss, list_recent_charges

if not stripe_configured():
    print('')
    print('  Weft Treasury — Spend Loop Not Activated')
    print('')
    print('  The autonomous spend loop is not yet running.')
    print('  Set STRIPE_SKILLS_KEY to enable the agent to earn and spend autonomously.')
    print('')
    print('  When activated, the agent will:')
    print('    - Earn 3% of every milestone release (swept to Stripe)')
    print('    - Pay for Kimi narratives (~\$0.01/call)')
    print('    - Pay for fal.ai milestone imagery (~\$0.05/image)')
    print('    - Pay for KeeperHub verdict execution (~\$0.10/tx)')
    print('    - Provision its own SaaS (hosting, monitoring) as needed')
    print('')
else:
    pnl = get_profit_loss()
    charges = list_recent_charges(20)

    print('')
    print('  Weft Treasury — Agent P&L')
    print('  ==========================')
    print('')
    print(f'  Earned (revenue sweeps):   \${pnl.total_earned_usd:>10.2f}')
    print(f'  Spent (autonomous costs):  \${pnl.total_spent_usd:>10.2f}')
    print(f'  Net P&L:                   \${pnl.net_usd:>10.2f}  {\" profitable\" if pnl.profitable else \" operating at loss\"}')
    print('')

    if pnl.spend_by_service:
        print('  Spend by Service:')
        for svc, amt in sorted(pnl.spend_by_service.items(), key=lambda x: -x[1]):
            print(f'    {svc:<20} \${amt:>8.2f}')
        print('')

    if pnl.balance and pnl.balance.ok:
        print(f'  Stripe Balance:')
        print(f'    Available:  \${pnl.balance.available_usd:>8.2f}')
        print(f'    Pending:    \${pnl.balance.pending_usd:>8.2f}')
        print('')

    if charges:
        print('  Recent Transactions (last 20):')
        print(f'    {\"Date\":<22} {\"Service\":<16} {\"Amount\":>10}  Memo')
        print(f'    {\"-\"*22} {\"-\"*16} {\"-\"*10}  {\"-\"*30}')
        import time
        for c in charges[:20]:
            date_str = time.strftime('%b %d %H:%M', time.gmtime(c.created))
            print(f'    {date_str:<22} {c.service:<16} \${c.amount_usd:>8.2f}  {c.memo[:40]}')
        print('')

    print('  The agent earns 3% of every milestone it verifies,')
    print('  and spends that revenue to keep itself running.')
    print('  No human touches the finances. This is an autonomous company.')
    print('')
"
```

### 2. Present the report

Show the P&L block directly to the user. This is the single most important
artifact for demonstrating that Weft is an agent-run business.

## Output Format

When Stripe is configured and the loop is running:

```
  Weft Treasury — Agent P&L
  ==========================

  Earned (revenue sweeps):   $    750.00
  Spent (autonomous costs):  $     12.47
  Net P&L:                   $    737.53  profitable

  Spend by Service:
    keeperhub              $     8.10
    fal                    $     3.25
    kimi                   $     1.12

  Stripe Balance:
    Available:  $   737.53
    Pending:    $     0.00

  Recent Transactions (last 20):
    Date                 Service         Amount  Memo
    ---------------------- ---------------- ---------- ------------------------------
    May 30 14:22          keeperhub        $    0.10  verdict submission: submitVerdict
    May 30 14:22          revenue_sweep    $   75.00  milestone 0x5169a3
    May 30 14:21          kimi             $    0.01  narrative for 0x5169a3
    May 30 14:20          fal              $    0.05  image generation: fal-ai/flux/schnell

  The agent earns 3% of every milestone it verifies,
  and spends that revenue to keep itself running.
  No human touches the finances. This is an autonomous company.
```

When Stripe is NOT configured:

```
  Weft Treasury — Spend Loop Not Activated

  The autonomous spend loop is not yet running.
  Set STRIPE_SKILLS_KEY to enable the agent to earn and spend autonomously.

  When activated, the agent will:
    - Earn 3% of every milestone release (swept to Stripe)
    - Pay for Kimi narratives (~$0.01/call)
    - Pay for fal.ai milestone imagery (~$0.05/image)
    - Pay for KeeperHub verdict execution (~$0.10/tx)
    - Provision its own SaaS (hosting, monitoring) as needed
```

## Narrative Bridge (for demos)

When presenting this in a demo, say:

> "This is the agent's bank statement. It earned $750 from verifying
> milestones onchain — 3% of released capital, swept automatically into
> its Stripe account. It spent $12 keeping itself running: Kimi for
> narratives, fal.ai for imagery, KeeperHub for execution. The remaining
> $737 is profit. No human touched any of this. The agent runs its own
> finances."

## Pitfalls

- **No charges yet**: The agent hasn't verified any milestones with Stripe
  enabled. Run a verification cycle first.
- **Stripe API error**: Check STRIPE_SKILLS_KEY is valid and not expired.
- **All amounts zero**: The earn→spend loop requires both KeeperHub (for
  release) and Stripe (for sweep) to be configured.
