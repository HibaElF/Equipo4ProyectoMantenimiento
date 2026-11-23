# Claude Security Skills

A suite of four Claude Code skills that bring structured, layered security analysis to your development workflow. Run them individually at the right stage of development, or let the orchestrator run all three in sequence for a full audit.

---

## Skills Overview

| Skill | Command | Purpose | Output |
|---|---|---|---|
| **Security Scan** | `/security-scan` | SAST + secret detection | `security-audit/security-scan-report.md` |
| **Threat Model** | `/threat-model` | STRIDE architecture analysis | `security-audit/threat-model.md` |
| **Security Review** | `/security-arch-review` | OWASP Proactive Controls code review | `security-audit/security-arch-review-report.md` |
| **Security Audit** | `/security-audit` | Orchestrates all three + unified summary | all of the above + `security-audit/security-audit-summary.md` |

### How They Relate

The skills work at three different levels of abstraction and are designed to feed into each other:

```
/security-scan     →  automated: what do tools find in the code?
        ↓ output consumed by
/threat-model      →  architectural: what could go wrong, and how bad?
        ↓ both outputs consumed by
/security-arch-review   →  implementation: are the defences actually built correctly?
        ↓ all three synthesised by
/security-audit    →  unified view: what is the overall security posture?
```

---

## Prerequisites

### Claude Code
These are skills for [Claude Code](https://claude.ai/download). You need Claude Code installed and running.

### Security Tools (for `/security-scan`)

The scan skill uses whichever tools it finds — install at least one tool from each category:

**SAST (choose one):**
```bash
brew install semgrep        # recommended
pip install semgrep         # alternative
# opengrep is a compatible alternative to semgrep
```

**Secret scanning:**
```bash
brew install trufflehog
```

**SCA + Container/IaC (choose one):**
```bash
brew install trivy          # recommended — covers dependency CVEs, Dockerfile, Terraform, K8s
brew install grype          # alternative — dependency CVEs only (no IaC/container misconfig)
```

The threat model and security review skills are pure analysis — they require no external tools beyond Claude Code itself.

---

## Installation

### Option 1 — Plugin marketplace (recommended)

In Claude Code:

```
/plugin marketplace add secureIO-GmbH/security-skills
/plugin install security-skills
```

That's it. Claude Code fetches the repo and registers all four skills automatically.

### Option 2 — Local clone

```bash
git clone https://github.com/secureIO-GmbH/security-skills ~/.claude/plugins/security-skills
```

Then in Claude Code:

```
/plugin marketplace add ~/.claude/plugins/security-skills
/plugin install security-skills
```

### Option 3 — Manual copy

```bash
git clone https://github.com/secureIO-GmbH/security-skills
cd security-skills
for skill in security-scan threat-model security-arch-review security-audit; do
  cp -r skills/$skill ~/.claude/skills/
done
```

### Staying Up To Date

**Plugin install:** `/plugin update security-skills` in Claude Code, or re-run the marketplace install.

**Manual copy:** `git pull` in the cloned repo, then re-run the copy command above.

---

## Usage

### `/security-scan` — SAST + Secret Detection

Scans for code vulnerabilities and leaked credentials using semgrep/opengrep and trufflehog.

```
/security-scan              # scan staged files only (fast, pre-commit)
/security-scan full         # scan the entire codebase
/security-scan --ci         # non-interactive, exits non-zero on Critical/High
/security-scan full --ci    # full codebase, CI mode
```

**What it does:**
1. Detects which tools are installed (semgrep/opengrep, trufflehog, trivy/grype)
2. Collects staged files (`git diff --cached`) or full codebase depending on mode
3. Runs SAST scan with auto-detected language rulesets
4. Runs secret/credential scan
5. Runs SCA scan — checks dependency manifests for known CVEs (trivy or grype); in staged mode, only runs if a manifest file is staged
6. Runs container/IaC scan — checks Dockerfiles, Terraform, K8s manifests for misconfigurations (trivy only); auto-detected from file presence
7. Validates findings — filters false positives, deduplicates, assigns severity
8. Saves `security-audit/security-scan-report.md` with findings grouped by severity and scan type
9. Asks if you want autoremediation (replaces hardcoded secrets with env var references, shows dependency upgrade commands, flags other issues)

**Report sections:** Summary · SAST Findings · Secret/Credential Findings · SCA Findings · Container/IaC Findings · False Positives Filtered · Recommended Fixes

---

### `/threat-model` — STRIDE Threat Model

Builds and maintains a living threat model for your application using STRIDE, OWASP frameworks, and the OWASP pytm threat library (113 curated threats).

```
/threat-model               # auto-detects scope (see below)
/threat-model full          # force full regeneration
/threat-model --ci          # non-interactive, exits non-zero on unmitigated Critical/High
/threat-model full --ci     # full regeneration, CI mode
```

**Scope logic:**
- No `security-audit/threat-model.md` exists → always runs full (first-time setup)
- `security-audit/threat-model.md` exists, no argument → incremental (analyses staged changes against existing model)
- `security-audit/threat-model.md` exists + `full` argument → full regeneration with snapshot of previous version

**What it does:**
1. Reads reference material: STRIDE, OWASP Top 10 (web, API, LLM), CVSS scoring, pytm threat library
2. Discovers the application: entry points, data stores, auth/authz, external integrations, user roles, sensitive data, trust boundaries
3. Classifies components using the pytm taxonomy (Server, Process, Datastore, Dataflow, ExternalEntity, LLM)
4. Synthesises architecture: actor/asset inventory, Mermaid data flow diagram, trust boundary map
5. Enumerates threats exhaustively using STRIDE × components, cross-referenced against OWASP lists and pytm
6. Scores risk: Likelihood (1–5) × Impact (1–5) → Critical (20–25) / High (12–19) / Medium (6–11) / Low (1–5)
7. Produces detailed remediations for High+ risks
8. Cross-references `security-audit/security-scan-report.md` if present
9. Saves `security-audit/threat-model.md`

**Bundled references:** STRIDE · OWASP Web Top 10 (2025) · OWASP API Top 10 (2023) · OWASP LLM Top 10 (2025) · CVSS v3 · pytm threat library

**Report sections:** Changelog · Application Overview · Actors · Assets · Data Flow Diagram (Mermaid) · Trust Boundaries · Threat Register · High-Risk Remediations · Medium-Risk Summary · Accepted/Low Risks · Scan Cross-Reference

---

### `/security-arch-review` — OWASP Proactive Controls Review

Evaluates your code against the [OWASP Top 10 Proactive Controls (2024)](https://owasp.org/www-project-proactive-controls/) — a developer-focused checklist of security controls that should be present in every application.

```
/security-arch-review        # review staged files only
/security-arch-review full   # review entire codebase
```

**What it does:**
1. Loads `security-audit/threat-model.md` and `security-audit/security-scan-report.md` if present — uses them to prioritise which controls need the deepest scrutiny
2. Detects the tech stack from dependency manifests
3. Evaluates all 10 controls against the actual code with code-level evidence
4. Rates each control: **Pass / Partial / Fail / N/A**
5. Flags controls that address high-risk threats from the threat model as priority
6. Saves `security-audit/security-arch-review-report.md`

**The 10 controls evaluated:**

| Control | Checks |
|---|---|
| C1 — Access Control | Centralised authz, deny-by-default, no IDOR, no hard-coded roles |
| C2 — Cryptography | Password hashing, secrets in vaults, TLS config, key rotation |
| C3 — Input Validation | Server-side validation, parameterised queries, output encoding, no mass assignment |
| C4 — Secure Design | Trust boundaries enforced in code, minimal attack surface, no obscurity |
| C5 — Secure Defaults | Debug off in production, no default credentials, fail-secure config |
| C6 — Component Security | Dependency versions, CVE exposure, SCA in pipeline |
| C7 — Digital Identity | bcrypt/Argon2 password storage, session management, MFA, cookie flags |
| C8 — Browser Security | CSP, HSTS, X-Frame-Options, SameSite cookies |
| C9 — Logging & Monitoring | Security events logged, no sensitive data in logs, structured format |
| C10 — SSRF Prevention | URL allowlists, private IP blocking, XXE prevention |

**Report sections:** Executive Summary · Controls Overview Table · Detailed Findings per Control · Priority Gaps (threat model cross-reference) · Scan Findings Cross-Reference · Recommended Actions

---

### `/security-audit` — Full Audit Orchestrator

Runs all three skills in sequence and synthesises their findings into a single executive summary.

```
/security-audit         # staged files — quick pre-commit audit
/security-audit full    # full codebase — thorough assessment
/security-audit release # full codebase + release gate check
```

**What it does:**
1. Runs `/security-scan` (or reuses today's report if already run)
2. Runs `/threat-model`
3. Runs `/security-arch-review`
4. Reads all three reports and identifies cross-cutting issues — findings corroborated by multiple assessments get highest priority
5. Saves `security-audit/security-audit-summary.md` with unified severity counts, cross-cutting issues, and a single prioritised action list
6. In `release` mode: evaluates a release gate — fails if any Critical/High findings are open across all three assessments

**Overall posture ratings:** ✅ Secure · ⚠️ Needs Attention · 🔴 At Risk · 🚫 Not Release-Ready

---

## Recommended Workflow

### Pre-commit (fast, ~1–3 min)
Stage your changes, then run:
```
/security-scan
```
Fix any Critical/High findings before committing. For significant feature work, add:
```
/threat-model
```

### Pre-PR (thorough, ~5–10 min)
```
/security-audit full
```
Address all Critical findings and document any accepted risks before requesting review.

### Pre-release gate
```
/security-audit release
```
All three assessments must pass with no open Critical/High findings for the release gate to pass.

### First-time setup on a new codebase
```
/security-audit full
```
This creates all three baseline reports. Subsequent runs are incremental by default.

### CI/CD integration

The `--ci` flag makes skills non-interactive and produces a clear PASSED/FAILED output line for the pipeline to act on. Use it in pre-push hooks or CI jobs:

```bash
# .git/hooks/pre-push
#!/bin/bash
output=$(claude -p "/security-scan --ci" 2>&1)
echo "$output"
echo "$output" | grep -q "scan FAILED" && exit 1 || exit 0
```

```yaml
# GitHub Actions
- name: Security scan
  run: |
    claude -p "/security-scan full --ci" | tee scan-output.txt
    grep -q "scan FAILED" scan-output.txt && exit 1 || exit 0

- name: Threat model check
  run: |
    claude -p "/threat-model --ci" | tee tm-output.txt
    grep -q "threat model FAILED" tm-output.txt && exit 1 || exit 0
```

For lightweight blocking at `git commit` without Claude, see the native pre-commit hooks approach below.

---

### Native pre-commit hooks (fast, no Claude required)

For blocking at `git commit` time, run semgrep and trufflehog directly via the [pre-commit framework](https://pre-commit.com). This takes ~5–15 seconds and has no API cost:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/trufflesecurity/trufflehog
    rev: v3.63.7
    hooks:
      - id: trufflehog
        name: Detect secrets
        entry: trufflehog git file://. --since-commit HEAD --only-verified --fail
        language: system
        pass_filenames: false

  - repo: https://github.com/returntocorp/semgrep
    rev: v1.59.1
    hooks:
      - id: semgrep
        name: SAST scan
        args: ['--config=auto', '--error']
        language: system
```

```bash
pip install pre-commit && pre-commit install
```

This is the same underlying tool pair that `/security-scan` uses. The Claude skill adds AI-powered validation, false positive filtering, severity rating, and autoremediation on top — use it for the deeper analysis, not the fast gate.

---

## Output Files

All reports are saved in the current working directory (your project root):

| File | Created by | Updated by |
|---|---|---|
| `security-audit/security-scan-report.md` | `/security-scan` | Each scan run (timestamped if file exists) |
| `security-audit/threat-model.md` | `/threat-model` (first run) | `/threat-model` incremental (changelog appended) |
| `security-audit/threat-model-YYYYMMDD-HHMMSS.md` | `/threat-model full` | Snapshot before full regeneration |
| `security-audit/security-arch-review-report.md` | `/security-arch-review` | Each review run (timestamped if file exists) |
| `security-audit/security-audit-summary.md` | `/security-audit` | Each audit run |

These files are intended to be **committed to your repository** — particularly `security-audit/threat-model.md`, which is a living document that tracks your security posture over time.

All output lives in `security-audit/`. To keep reports out of the repo but still track the living threat model:
```gitignore
security-audit/
!security-audit/threat-model.md
```
Or to exclude everything:
```gitignore
security-audit/
```

---

## Skill Structure

```
security-skills/
├── .claude-plugin/
│   ├── plugin.json                  ← plugin metadata
│   └── marketplace.json             ← marketplace registration
└── skills/
    ├── security-scan/
    │   └── SKILL.md
    ├── threat-model/
    │   ├── SKILL.md
    │   └── references/
    │       ├── stride.md
    │       ├── owasp-top10-2025.md
    │       ├── owasp-api-top10-2023.md
    │       ├── owasp-llm-top10-2025.md
    │       ├── cvss-scoring.md
    │       └── pytm-threats.json    ← 113 curated threats from OWASP pytm
    ├── security-arch-review/
    │   ├── SKILL.md
    │   └── references/
    │       └── owasp-proactive-controls.md
    └── security-audit/
        └── SKILL.md
```

Reference files are bundled with each skill so assessments are consistent and do not require internet access at runtime.

---

## Framework Coverage

| Framework / Database | Used in |
|---|---|
| STRIDE | Threat Model |
| OWASP Web Top 10 (2025) | Threat Model |
| OWASP API Security Top 10 (2023) | Threat Model |
| OWASP LLM Top 10 (2025) | Threat Model (when AI features detected) |
| OWASP pytm threat library | Threat Model |
| CVSS v3 | Threat Model (risk scoring) |
| OWASP Top 10 Proactive Controls (2024) | Security Review |
| CWE mappings | Threat Model + Security Review |
| NVD / OSV CVE database | Security Scan — SCA (via trivy/grype) |
| Dockerfile / Terraform / K8s security rules | Security Scan — Container/IaC (via trivy) |

---

## Contributing

Reference files in `references/` are the most likely to need periodic updates as OWASP releases new versions of their lists. To update:

1. Replace the relevant file in `references/`
2. Update the version note at the top of the file
3. Re-copy to `~/.claude/skills/` using the install command above

---

## License

MIT
