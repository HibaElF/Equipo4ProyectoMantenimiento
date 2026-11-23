---
name: security-scan
description: "Use this skill to run a security scan combining SAST analysis, secret/credential detection, dependency vulnerability scanning (SCA), and container/IaC misconfiguration checks on staged code or the full codebase. Invoke as `/security-scan` to scan only git-staged files (fast, pre-commit use), or `/security-scan full` to scan the entire codebase. Uses semgrep or opengrep for SAST, trufflehog for secrets, and trivy (preferred) or grype for SCA and container/IaC scanning. Validates and deduplicates findings, generates a structured markdown report with severity ratings, and offers to auto-remediate fixable issues. Trigger this skill whenever the user wants to: run a security scan, check for secrets or credentials in code, scan dependencies for CVEs, check container or IaC configuration, do a SAST scan before committing, scan for vulnerabilities, run semgrep, trufflehog, trivy, or grype, or get a security report on their code."
---

# Security Scan Skill

Run a four-tool security scan (SAST + secrets + SCA + container/IaC) on staged files or the full codebase, validate findings, and produce an actionable markdown report.

---

## Step 1: Determine Scan Mode

Parse all arguments from the invocation. Arguments can be combined: `/security-scan full --ci`

| Argument | Effect |
|---|---|
| _(none)_ | Staged mode |
| `full` | Full codebase mode |
| `--ci` | CI mode: skip interactive prompts, exit non-zero on Critical/High findings |

Set flags:
- `SCOPE` = `staged` or `full`
- `CI_MODE` = `true` if `--ci` present, otherwise `false`

If invoked from natural language (e.g. "check my staged files for secrets"), default to staged mode unless the user says "full codebase", "everything", or similar. Detect CI intent from phrases like "non-interactive", "for the pipeline", "block on findings".

---

## Step 2: Detect Available Tools

Run these checks before scanning. Record which tools are present.

```bash
# SAST tool (prefer semgrep, fall back to opengrep)
command -v semgrep  && echo "semgrep_available"
command -v opengrep && echo "opengrep_available"

# Secrets scanner
command -v trufflehog && echo "trufflehog_available"

# SCA / container tool (prefer trivy, fall back to grype)
command -v trivy && echo "trivy_available"
command -v grype  && echo "grype_available"
```

**Decision logic:**
- SAST: semgrep preferred → opengrep fallback → skip with install message if neither found
- Secrets: trufflehog → skip with install message if not found
- SCA/container: trivy preferred → grype fallback → skip SCA with install message if neither found
- Note: grype handles SCA (dependency CVEs) but not IaC/Dockerfile misconfigurations — only trivy does both. If only grype is available, container/IaC scan is skipped.
- If no tools at all → abort with a clear install message listing all four tools.

**Also detect infrastructure files** (used later to decide whether to run container/IaC scan):
```bash
# Check for container and IaC files
find . -maxdepth 3 \( \
  -name "Dockerfile" -o -name "Dockerfile.*" \
  -o -name "docker-compose.yml" -o -name "docker-compose.yaml" \
  -o -name "*.tf" \
  -o -name "*.yaml" -o -name "*.yml" \
\) 2>/dev/null | grep -vE "(node_modules|\.git|vendor)" | head -20
```

Set `HAS_INFRA_FILES=true` if any of the above are found. K8s YAML can be distinguished by containing `apiVersion:` — check the first few lines if needed.

---

## Step 3: Collect Scan Targets

### Staged mode

```bash
git diff --cached --name-only --diff-filter=ACM
```

This returns only Added, Copied, or Modified files that are staged. If the output is empty, tell the user there are no staged files and suggest `git add` first.

Save the file list. Also note:
- **Extensions present** (e.g. `.py`, `.js`, `.go`) — used for SAST language hints
- **Dependency manifests staged** (`requirements.txt`, `package.json`, `go.mod`, `pom.xml`, `Cargo.toml`, `Gemfile`, `composer.json`, `Pipfile`, `pyproject.toml`) — set `SCA_STAGED=true` if any present
- **Infra files staged** (Dockerfile, `*.tf`, `docker-compose.*`, `*.yaml`) — set `INFRA_STAGED=true` if any present

### Full mode

The scan target is `.` (current working directory). `SCA_STAGED=true` and `INFRA_STAGED=true` are not applicable — always run all available scans.

---

## Step 4: Run SAST Scan

Use `--json` output for reliable parsing. The `--config=auto` ruleset detects language automatically — it covers Python, JS/TS, Go, Java, Ruby, C/C++, and more without manual configuration.

### Staged scan with semgrep

```bash
STAGED=$(git diff --cached --name-only --diff-filter=ACM)

# Run semgrep only on staged files (xargs passes them as explicit paths, avoiding whole-repo scan)
echo "$STAGED" | tr '\n' '\0' | xargs -0 semgrep scan --config=auto --json 2>/dev/null > semgrep-output.json
```

### Full scan with semgrep

```bash
semgrep scan --config=auto --json . 2>/dev/null > semgrep-output.json
```

> Semgrep exits with code 1 when findings exist — this is normal, not an error. Treat exit code 1 as success; only treat exit code 2+ as a tool failure.

Replace `semgrep` with `opengrep` if that is the available tool — the CLI interface is compatible.

---

## Step 5: Run Secrets Scan

### Staged scan (git mode — only new content since HEAD)

```bash
trufflehog git file://. --since-commit HEAD --only-verified --json 2>/dev/null > trufflehog-output.json
```

> `--only-verified` reduces noise by only reporting secrets that trufflehog can confirm are live/valid. This is the right default — unverified matches have high false positive rates.

If the repo has no prior commits (initial commit), fall back to:

```bash
trufflehog filesystem . --json 2>/dev/null > trufflehog-output.json
```

### Full scan (filesystem mode)

```bash
trufflehog filesystem . --json 2>/dev/null > trufflehog-output.json
```

---

## Step 6: Run SCA Scan (Dependency Vulnerabilities)

**When to run:**
- Staged mode: only if `SCA_STAGED=true` (a dependency manifest is in the staged file list). If no manifest is staged, note "SCA scan skipped — no dependency manifests in staged changes" in the report.
- Full mode: always run if trivy or grype is available.

### With trivy (preferred)

```bash
trivy fs --scanners vuln --format json --output trivy-sca-output.json . 2>/dev/null
```

This scans all dependency manifests found under `.` and reports known CVEs. It covers: pip, npm/yarn, Go modules, Maven/Gradle, Cargo, RubyGems, Composer, and more.

### With grype (fallback)

```bash
grype . --output json > grype-output.json 2>/dev/null
```

Grype auto-detects dependency manifests and SBOM files.

---

## Step 7: Run Container / IaC Scan

**When to run (trivy only — grype does not support this):**
- Staged mode: only if `INFRA_STAGED=true` AND trivy is available
- Full mode: only if `HAS_INFRA_FILES=true` AND trivy is available
- If only grype available: skip this step entirely, note in report

```bash
trivy config --format json --output trivy-config-output.json . 2>/dev/null
```

`trivy config` scans Dockerfiles for security misconfigurations, Terraform for cloud misconfigs, Kubernetes manifests for security policy violations, and docker-compose files for insecure settings. It does not require a built image — it analyses the configuration files directly.

---

## Step 8: Parse and Validate All Findings

Read all output JSON files that were produced. Parse into a unified finding structure.

### Semgrep JSON

Each finding has:
- `path` — file path
- `start.line` — line number
- `check_id` — rule ID
- `extra.message` — description
- `extra.severity` → map: `ERROR` → High, `WARNING` → Medium, `INFO` → Low

### Trufflehog JSON

Each finding has:
- `SourceMetadata.Data.Filesystem.file` or `.Git.file` — file path
- `SourceMetadata.Data.Filesystem.line` — line number
- `DetectorName` — secret type (e.g. `AWS`, `GitHub`, `Slack`)
- `Raw` — actual secret value (**REDACT — never include in report**)
- `Verified` → map: `true` → Critical, `false` → High

### Trivy SCA JSON

Results are in `Results[].Vulnerabilities[]`. Each vulnerability has:
- `VulnerabilityID` — CVE ID (e.g. `CVE-2023-1234`)
- `PkgName` — package name
- `InstalledVersion` — current version
- `FixedVersion` — version that fixes it (may be empty if no fix exists)
- `Severity` — `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `NEGLIGIBLE`
- `Title` — short description
- Parent `Results[].Target` — the manifest file (e.g. `requirements.txt`)

Map trivy severity → report severity directly (CRITICAL → Critical, HIGH → High, etc.). NEGLIGIBLE → Info.

### Grype JSON

Findings are in `matches[]`. Each has:
- `vulnerability.id` — CVE ID
- `vulnerability.severity` — severity string
- `vulnerability.fix.versions[]` — fix version(s)
- `artifact.name` + `artifact.version` — package info
- `artifact.type` — ecosystem (python, npm, go-module, etc.)

### Trivy Config JSON

Results are in `Results[].Misconfigurations[]`. Each has:
- `ID` — rule ID (e.g. `DS002`)
- `Title` — short description
- `Severity` — same scale as SCA
- `Message` — what was found
- `Resolution` — how to fix it
- Parent `Results[].Target` — the file (e.g. `Dockerfile`, `main.tf`)
- Parent `Results[].Type` — `dockerfile`, `terraform`, `kubernetes`, etc.

### Validation pass

Apply these filters across all finding types before writing the report:

1. **Test files** (`**/test/**`, `**/*_test.*`, `**/*.spec.*`, `**/fixtures/**`): downgrade severity one level or flag as likely false positive, especially hardcoded test credentials.
2. **Example/docs** (`**/examples/**`, `**/docs/**`, `README*`): flag as likely false positive.
3. **Duplicate rules**: same file + line in multiple semgrep rules → keep highest severity.
4. **Generic secrets in non-secret contexts**: `api_key = "placeholder"` or `"your-secret-here"` → false positive.
5. **Low-signal SAST** (`INFO`-level with no clear exploit path): group separately as Info.
6. **SCA — no fix available**: mark separately. These are known issues the developer cannot easily resolve — note them but don't count them as High priority blockers.
7. **SCA — dev/test dependencies**: vulnerabilities only in `devDependencies` or test packages → downgrade one severity level.

Build two lists: **confirmed findings** and **filtered false positives** (with reasons).

---

## Step 9: Generate Report

Create the `security-audit/` directory if it does not exist (`mkdir -p security-audit`). Save to `security-audit/security-scan-report.md`. If the file already exists, use `security-audit/security-scan-report-<timestamp>.md` (timestamp format: `YYYYMMDD-HHMMSS`).

Use this exact template:

```markdown
# Security Scan Report

**Date:** <date>
**Mode:** Staged files | Full codebase
**Tools:** semgrep <version> | opengrep <version>, trufflehog <version>, trivy <version> | grype <version>
**Staged files scanned:** <N> (staged mode only)
**Scans run:** SAST ✓ | Secrets ✓ | SCA ✓/skipped | Container/IaC ✓/skipped/N/A

---

## Summary

| Severity | SAST | Secrets | SCA | Container/IaC | Total |
|----------|------|---------|-----|---------------|-------|
| Critical | N | N | N | N | **N** |
| High     | N | N | N | N | **N** |
| Medium   | N | N | N | N | **N** |
| Low      | N | N | N | N | **N** |
| Info     | N | N | N | N | **N** |
| **Total**| N | N | N | N | **N** |

---

## SAST Findings

### <file path>

| Line | Rule | Severity | Description |
|------|------|----------|-------------|
| 42   | python.lang.security.dangerous-exec | High | User input passed to exec() |

_(Group findings by file. Omit section if no SAST findings.)_

---

## Secret / Credential Findings

| File | Line | Type | Verified | Value |
|------|------|------|----------|-------|
| config/settings.py | 12 | AWS Access Key | Yes | [REDACTED] |

**Important:** Actual secret values are never written to this report.

_(Omit section if no secret findings.)_

---

## SCA Findings (Dependency Vulnerabilities)

| Package | Installed | Fix Version | CVE | Severity | Manifest |
|---------|-----------|-------------|-----|----------|----------|
| requests | 2.28.0 | 2.31.0 | CVE-2023-38545 | High | requirements.txt |

_(Omit section if SCA was skipped or no findings. Note packages with no available fix separately.)_

---

## Container / IaC Findings

| File | Type | Rule | Severity | Issue | Resolution |
|------|------|------|----------|-------|------------|
| Dockerfile | dockerfile | DS002 | High | Running as root | Add USER directive |

_(Omit section if container/IaC scan was not run or no findings.)_

---

## False Positives Filtered

| File | Line | Rule | Reason Excluded |
|------|------|------|-----------------|
| tests/test_auth.py | 55 | generic-api-key | Hardcoded test credential in test fixture |

---

## Recommended Fixes

### Critical / High Priority
- <file>:<line> — <action>
- Upgrade `<package>` from `<version>` to `<fix-version>` (`pip install package==version` / `npm install package@version`)

### Medium Priority
- <description>

### General Recommendations
- Add `.env` to `.gitignore` if not already present.
- Review and rotate any verified secrets immediately.
- Consider adding this scan as a pre-commit hook.

---

_Generated by security-scan skill_
```

---

## Step 10: Close Out and Offer Remediation

**If `CI_MODE` is true:** Skip this step entirely. Proceed directly to the CI Exit Code section.

The skill run is now complete. No changes have been made to the codebase — only the report file was written.

Present a brief summary to the user:
- Total findings by severity
- Top 3 most critical findings with file:line references
- Path to the saved report

Then offer a follow-up remediation step:

> "The report is saved at `security-audit/security-scan-report.md`. No code has been changed.
>
> Would you like me to work through the fixable findings? I'll show you each proposed change before applying anything — you confirm, skip, or stop at each step."

### If yes — walk through fixes one by one

Work through confirmed High and Critical findings in order of severity. For each fixable item:

1. **Show the proposed change** — display the current code and the exact replacement:
   ```
   File: config/settings.py, line 12
   Before: api_key = "abc123xyz"
   After:  api_key = os.environ.get("API_KEY")
   (Also adds: import os — if not already present)
   Note: add API_KEY=abc123xyz to your .env file (do not commit it)
   ```
2. **Ask for confirmation:** "Apply this fix? [yes / no / stop]"
   - **yes** → apply the change, confirm it was made, move to next finding
   - **no** → skip this finding, move to next
   - **stop** → stop the remediation loop, summarise what was applied and what remains

**What is fixable (code changes):**
- Hardcoded secrets → env var references (Python, JS/TS, Go, Ruby)
- Missing `import os` / `require('process')` when adding env var references

**What is shown as commands, not applied automatically:**
- Dependency upgrades — show the exact command (`pip install pkg==x.y.z`, `npm install pkg@x.y.z`, etc.) for the user to run; do not modify lockfiles or manifests
- SAST issues requiring logic changes (SQL injection, `shell=True`, `eval`) — explain what needs to change and why, but do not rewrite logic

After the loop, summarise: how many fixes were applied, how many were skipped, and what commands remain to be run manually.

### If no — close out

Tell the user the top 3 most critical findings as a quick reference and where to find the full report.

---

## CI Exit Code

When `CI_MODE` is true, after the report is written, output a one-line summary to stdout:

```
SECURITY SCAN: N findings (C critical, H high, M medium, L low) — report: security-audit/security-scan-report.md
```

Then determine the exit outcome:
- **Critical or High findings exist** → signal failure: "CI mode: scan FAILED — Critical/High findings present. Fix before merging."
- **No Critical/High findings** → signal success: "CI mode: scan PASSED — no Critical/High findings."

If invoked from a shell hook, the caller greps for "FAILED" or "PASSED" to act on the outcome — Claude cannot set the shell exit code directly.

---

## Error Handling

- **semgrep exits non-zero on findings**: exit code 1 is normal. Only treat exit code 2+ as a tool failure.
- **Empty JSON output**: note "No findings from <tool>" rather than failing.
- **Not a git repo**: `git diff --cached` will fail — fall back to full filesystem scan and inform the user.
- **SCA scan produces no output**: trivy/grype may return empty results if no manifests are found — note this as "No dependency manifests detected" rather than an error.
- **Large repos in full mode**: warn if the directory has >10,000 files that scanning may take several minutes.
- **Trivy not available, grype not available**: skip SCA and container/IaC scans, note clearly in report and suggest install:
  ```
  brew install trivy   # preferred — covers SCA + container/IaC
  # or
  brew install grype   # SCA only
  ```
