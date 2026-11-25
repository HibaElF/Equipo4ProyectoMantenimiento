---
name: security-audit
description: "Orchestrates a full security audit by running all three security sub-skills in sequence: security-scan (SAST + secrets), threat-model (STRIDE architecture analysis), and security-arch-review (OWASP Proactive Controls code review). Produces individual reports from each sub-skill plus a consolidated report in the `security-audit/` folder. Invoke as `/security-audit` for staged files, `/security-audit full` for the full codebase, or `/security-audit release` for a pre-release assessment. Trigger whenever the user wants to: run a full security audit, do a complete security assessment, run all security checks, prepare for a release from a security perspective, get a comprehensive security report, or run security-scan + threat-model + security-arch-review together."
---

# Security Audit Orchestrator

Run a complete, layered security assessment by invoking three specialised sub-skills in sequence, each building on the output of the previous. This skill does not duplicate their logic — it coordinates them and synthesises their findings into a unified executive summary.

---

## Step 1: Determine Audit Scope

Check the invocation argument and set the scope for all sub-skills:

| Argument | Scope | Description |
|---|---|---|
| _(none)_ | **staged** | Staged files only — fast pre-commit audit |
| `full` | **full** | Entire codebase — thorough assessment |
| `release` | **full** | Full codebase with elevated rigour — pre-release gate |

Announce the scope to the user before starting:
> "Starting security audit in **[staged / full / release]** mode. This will run three assessments in sequence — security scan, threat model, and security review. Reports will be saved individually as each completes."

For **release mode**: apply full scope to all sub-skills. After all three complete, additionally check:
- Are all High/Critical threat model items (`security-audit/threat-model.md`) either Mitigated or have an accepted-risk entry?
- Are all Critical/High scan findings from `security-audit/security-scan-report.md` addressed or suppressed?
- Are all Critical/High security review gaps from `security-audit/security-arch-review-report.md` addressed?
- If any of these are open, flag the audit as **FAIL — not release-ready** in the summary.

---

## Step 2: Run Security Scan

Invoke the `security-scan` skill, passing the scope:
- staged mode → invoke as `/security-scan`
- full or release mode → invoke as `/security-scan full`

Wait for completion. The sub-skill will:
- Run semgrep/opengrep (SAST), trufflehog (secrets), and trivy or grype (SCA + container/IaC)
- Validate and deduplicate findings across all four scan types
- Save `security-audit/security-scan-report.md`
- Offer remediation as a follow-up — **for the audit orchestrator, decline this offer** and continue. Remediation is offered once at the end of the full audit in Step 6, not mid-pipeline.

Note: if the user has already run `/security-scan` recently and `security-audit/security-scan-report.md` exists and is fresh (same day), ask the user: "A security scan report from today already exists. Re-run the scan, or use the existing report?" Proceed based on their answer.

---

## Step 3: Run Threat Model

Invoke the `threat-model` skill, passing the scope:
- staged mode → invoke as `/threat-model` (incremental if security-audit/threat-model.md exists, full if not)
- full or release mode → invoke as `/threat-model full`

Wait for completion. The sub-skill will:
- Analyse architecture, data flows, and trust boundaries
- Enumerate threats using STRIDE, OWASP, and the pytm library
- Cross-reference with `security-audit/security-scan-report.md` (it does this automatically)
- Save `security-audit/threat-model.md`

---

## Step 4: Run Security Review

Invoke the `security-arch-review` skill, passing the scope:
- staged mode → invoke as `/security-arch-review`
- full or release mode → invoke as `/security-arch-review full`

Wait for completion. The sub-skill will:
- Evaluate all 10 OWASP Proactive Controls against the code
- Load `security-audit/threat-model.md` and `security-audit/security-scan-report.md` for context (automatically)
- Save `security-audit/security-arch-review-report.md`

---

## Step 5: Synthesise and Write Summary

Read all three output files:
- `security-audit/security-scan-report.md`
- `security-audit/threat-model.md`
- `security-audit/security-arch-review-report.md`

Create the `security-audit/` directory if it does not exist (`mkdir -p security-audit`). Synthesise a consolidated `security-audit/security-audit-summary.md`.

**Do not repeat the full detail from each sub-report.** The summary is an executive view that:
- Aggregates severity counts across all three assessments
- Surfaces the top findings that appear in multiple assessments (a finding that shows up in both the scan and the threat model is higher priority)
- Identifies cross-cutting themes (e.g. "input validation is weak — flagged in SAST scan, in threat model as T-003/T-007, and as Fail in C3 of the security review")
- Provides a single prioritised action list
- States a clear overall posture: **Secure / Needs Attention / At Risk / Not Release-Ready**

Use this exact template:

```markdown
# Security Audit Summary

**Date:** <date>
**Mode:** Staged / Full / Release
**Overall Posture:** ✅ Secure | ⚠️ Needs Attention | 🔴 At Risk | 🚫 Not Release-Ready

---

## Findings at a Glance

| Source | Critical | High | Medium | Low |
|---|---|---|---|---|
| Security Scan (SAST + Secrets) | N | N | N | N |
| Threat Model (STRIDE) | N | N | N | N |
| Security Review (OWASP Controls) | N | N | N | N |
| **Total unique** | **N** | **N** | **N** | **N** |

_Note: totals deduplicated where the same issue appears across multiple assessments._

---

## Cross-Cutting Issues

Issues corroborated by more than one assessment — highest confidence, highest priority.

### 🔴 [Issue name] — Confirmed by [scan + threat model / scan + review / all three]
- **Scan:** `<finding and file reference>`
- **Threat model:** `T-00X: <threat scenario>, Risk Score N`
- **Review:** `C3 — Fail: <specific gap>`
- **Remediation:** <unified action in one sentence>

_(Repeat for each cross-cutting issue)_

---

## Top Priorities

Ordered by risk. Address before the next commit / sprint / release.

### Critical
1. `<file>:<line>` — <what and why> _(Source: scan / threat model / review)_

### High
1. <description> _(Source: threat model T-00X)_
2. <description> _(Source: review C7 — Partial)_

### Medium
_(Summarise as a bullet list, not individual entries)_

---

## Sub-Report Index

| Report | Saved At | Top Finding |
|---|---|---|
| Security Scan | `security-audit/security-scan-report.md` | <one-liner> |
| Threat Model | `security-audit/threat-model.md` | <one-liner> |
| Security Review | `security-audit/security-arch-review-report.md` | <one-liner> |

---

## Release Gate Assessment
_(Only present in release mode)_

| Gate | Status | Blocker |
|---|---|---|
| No open Critical/High scan findings | ✅ Pass / ❌ Fail | <finding ref if fail> |
| No open Critical/High threat model risks | ✅ Pass / ❌ Fail | <threat ref if fail> |
| No Critical security review gaps | ✅ Pass / ❌ Fail | <control ref if fail> |
| **Overall gate** | ✅ PASS / ❌ FAIL | |

---

_Generated by security-audit orchestrator_
_Sub-skills: security-scan · threat-model · security-arch-review_
```

---

## Step 6: Present Results

After saving `security-audit/security-audit-summary.md`, present to the user:

1. The **Overall Posture** rating with a one-line explanation
2. The **cross-cutting issues** count (issues found by multiple assessments)
3. The **top 3 priorities** with file references
4. In release mode: whether the release gate **passed or failed**, and what is blocking it
5. Paths to all four saved files

The audit is now complete. No changes have been made to the codebase — only the report files were written.

Then offer a follow-up remediation step:

> "All reports are saved in `security-audit/`. No code has been changed.
>
> Would you like me to work through the findings? I'll start with the highest-priority items, show you each proposed change before applying anything, and you confirm, skip, or stop at each step."

If the user says yes, work through Critical and High findings from all three reports in priority order. For each finding, show the proposed change and wait for explicit confirmation before modifying any file. Follow the same per-fix confirmation loop described in the `security-scan` and `security-arch-review` skills.

If the user says no, direct them to `security-audit/security-audit-summary.md` for the full prioritised action list.

---

## Error Handling

- **Sub-skill fails or produces no output:** Note the failure in the summary, mark that assessment as "Not completed", and continue with the remaining sub-skills rather than aborting the whole audit.
- **No git repo:** Security scan will fall back to filesystem mode; threat model and review will use full codebase. Inform the user.
- **No staged files in staged mode:** Ask the user whether to switch to full mode or abort.
- **Tools not installed (semgrep, trufflehog):** The security-scan sub-skill handles this gracefully — the audit continues with whatever tools are available.
