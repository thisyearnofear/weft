# Weft Hermes Skills

This directory contains custom Hermes skills for autonomous milestone verification.

## Skills

### github.py
Verifies code contributions by reading GitHub commit history and PR merges.

### deployment.py
Checks on-chain activity on 0G Chain via explorer API.

### usage.py
Measures live endpoint usage and on-chain interaction counts.

## Usage

```python
from skills.github import GitHubSkill
from skills.deployment import DeploymentSkill
from skills.usage import UsageSkill

# Initialize skills
github = GitHubSkill()
deployment = DeploymentSkill()
usage = UsageSkill()

# Run verification
evidence = {
    "github": github.verify(project_id),
    "deployment": deployment.verify(contract_address),
    "usage": usage.verify(endpoint)
}

# Synthesize with Kimi
attestation = kimi.synthesize(evidence)
```