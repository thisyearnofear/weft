# Deterministic Verification vs. LLM-as-Judge

Weft's core design decision is that **capital-release decisions should be made by deterministic evidence rules, not by an LLM**. The LLM is allowed to narrate, summarize, and format, but it does not get to decide whether money moves.

This document compares the two approaches and explains why Weft uses a deterministic-first model, with a small role for LLM assistance.

## The two approaches

| Dimension | Deterministic Rules | LLM-as-Judge |
|---|---|---|
| **Verdict basis** | Measurable signals (deployment, usage, impressions, checklist) | Natural language reasoning over evidence |
| **Reproducibility** | Same inputs → same verdict every time | Same inputs can yield different verdicts |
| **Auditability** | Verdict maps directly to a documented rule | Verdict is a black-box output with opaque reasoning |
| **Cost** | Cheap (API calls + local logic) | Expensive (LLM tokens per verdict) |
| **Latency** | Fast (seconds) | Slower (seconds to minutes) |
| **Flexibility** | Rigid; must define a signal for each task | Flexible; can reason about ambiguous deliverables |
| **Gaming risk** | Rule-gaming is visible once discovered | Prompt injection / hallucination can flip a verdict |
| **Trust model** | Trust the evidence + open rules | Trust the model vendor + prompt engineering |

## When deterministic rules win

Weft cares about these cases:

1. **Money is at stake.** Escrow release should not depend on a model's mood or temperature.
2. **The deliverable is machine-checkable.** Contract code exists on-chain, API calls have logs, Twitter impressions are numeric, a Notion page has a hash.
3. **Multiple verifiers must agree.** Deterministic rules make consensus trivial: two nodes running the same rule on the same evidence produce the same answer.
4. **Reputation compounds.** A builder's long-term track record only works if past verdicts are reproducible and defensible.

## When LLM judging wins

LLM-as-judge is better for:

1. **Ambiguous quality.** "Is this blog post good?" is hard to reduce to a signal; an LLM can evaluate style, clarity, and accuracy.
2. **No structured data source.** If the deliverable is a PDF in an private inbox, an LLM can read and assess it.
3. **Subjective acceptance.** Brand alignment, tone, or strategic fit may require human-like judgment.

## Weft's hybrid model

Weft does not ban LLMs. It limits them:

- **Deterministic rules decide the verdict.** The rule is the ground truth for capital release.
- **LLM narrates the evidence.** After the rule runs, Weft calls Kimi/Nemotron/Nous to write a human-readable Builder Journey card. The narrative is decoration, not evidence.
- **LLM can suggest signals, not verdicts.** In future templates, an LLM might propose a new evidence signal (e.g., "sentiment improved by 10%"), but the final gate remains a deterministic check.

This is analogous to a credit score vs. a loan officer:

- The **credit score** (deterministic rule) decides approval.
- The **loan officer** (LLM) explains the decision to the customer.

## Practical example

Consider a marketing milestone: "Run a Twitter campaign that drives 1,000 pageviews."

**Deterministic verification:**
- Deliverable hash from Notion (campaign brief exists)
- Twitter API reports 5,200 impressions
- Google Analytics reports 1,300 pageviews from the campaign UTM
- Rule: `verified = has_deliverable AND pageviews >= 1000`

**LLM-as-judge:**
- Feed the campaign copy, screenshots, and analytics summary to an LLM.
- Ask: "Did the agent complete the milestone?"
- Risk: A persuasive but low-performing campaign might get a passing narrative; a high-performing campaign with poor formatting might fail.

## Trade-offs and how to mitigate them

| Weakness of deterministic rules | Mitigation |
|---|---|
| Rigid for subjective tasks | Use LLM to propose signals, then lock the rule |
| Requires a data source | Build collectors for common platforms (Twitter, GA, Notion) |
| Rule gaming | Publish rules openly; attackers must beat the rule, not the model |
| Cold-start for new task types | Ship a generic template with human-set thresholds |

| Weakness of LLM judging | Mitigation |
|---|---|
| Non-deterministic | Add temperature=0, few-shot prompts, and output schemas |
| Expensive | Cache verdicts; only call LLM when necessary |
| Hallucination | Constrain output to enum choices and require citations |
| Opacity | Use model cards, prompt versioning, and audit logs |

## Recommendation

Use **deterministic rules as the default** for any milestone tied to escrow or reputation. Reserve **LLM judging** for:

- Prototype phases before a measurable signal exists
- Subjective acceptance gates where a human would otherwise review
- Generating human-readable summaries *after* the rule has run

The moment an LLM verdict is converted into a deterministic rule, it becomes suitable for Weft.
