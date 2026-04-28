# FEEDBACK.md

## Uniswap Integration Feedback

This document tracks feedback on integrating with Uniswap for Weft's revenue distribution feature.

### Issue 1: Multi-hop Routing for Small Amounts

**Problem**: When distributing small amounts to multiple backers, multi-hop routes can result in significant slippage.

**Impact**: Small distributions (< $50) may lose 5-15% to slippage.

**Workaround**: Batch small distributions or use direct routes when possible.

### Issue 2: Gas Costs on High Traffic

**Problem**: Revenue distribution calls multiple separate transfers, each incurring gas.

**Impact**: During high gas periods, distribution costs can exceed the revenue being distributed.

**Workaround**: Implement minimum threshold for distribution or batch transfers.

### Issue 3: Token Pair Availability

**Problem**: Not all project tokens have direct Uniswap pools.

**Impact**: May need to route through intermediate pairs, increasing slippage.

**Workaround**: Use router's optimal path finding or establish direct pools for common tokens.

---

*Document created for ETHGlobal submission - to be updated as integration progresses.*