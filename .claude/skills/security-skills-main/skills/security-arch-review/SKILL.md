---
name: security-arch-review
description: "Use this skill to conduct a structured security architecture and code review against the OWASP Top 10 Proactive Controls. Reviews staged files or the full codebase, reads existing security-audit/threat-model.md and security-audit/security-scan-report.md to focus and contextualise findings, and produces a security-audit/security-arch-review-report.md with Pass/Partial/Fail per control and code-level evidence. Invoke as `/security-arch-review` for staged files only, or `/security-arch-review full` for the full codebase. Trigger whenever the user wants to: review code for security issues, check if security controls are correctly implemented, do a manual security code review, validate implementation against OWASP Proactive Controls, audit authentication or authorisation logic, check cryptography usage, review session management, assess logging and monitoring coverage, or get a structured security assessment beyond what automated tools produce."
---

# Security Review Skill

Conduct a structured, evidence-based security code review using the OWASP Top 10 Proactive Controls as the evaluation framework. Every finding must reference specific code — file paths and line numbers where possible. This is the implementation layer: not "what could go wrong" (that's the threat model) but "is it actually built correctly?"

---

## Step 1: Determine Scope and Load Context

**Scope detection:**
- `/security-arch-review` → **staged mode**: review only git-staged files (`git diff --cached --name-only --diff-filter=ACM`)
- `/security-arch-review full` → **full mode**: review entire codebase
- If no staged files are found in staged mode, inform the user and offer to switch to full mode

**Load existing context — read these files if present:**

1. **`security-audit/threat-model.md`** — If it exists, read it fully. Note which threats are rated High or Critical (Risk Score ≥ 12). The review will prioritise OWASP controls that directly address those threats. For example: if T-001 is "no rate limiting on login" (Spoofing/EoP), C7 (Digital Identity) gets deeper scrutiny.

2. **`security-audit/security-scan-report.md`** — If it exists, read the findings. Do not re-report what the scanner already found. Instead, use scan findings as evidence within the relevant control review. For example: if semgrep found SQL injection at `db.py:47`, cite that under C3 (Input Validation) rather than raising it as a new finding.

**Why this matters:** The security review fills the gap between automated scanning (which catches known patterns) and architecture analysis (which identifies structural risks). It answers: given what we know about this application's risks, are the security controls actually implemented correctly?

---

## Step 2: Read Reference Material

Read `references/owasp-proactive-controls.md` before reviewing any code. This contains the full OWASP Top 10 Proactive Controls (2024) with:
- Implementation requirements per control
- Code-level review checklists
- Pass/Partial/Fail examples
- OWASP Top 10 and STRIDE mappings

Use this as the evaluation standard throughout Steps 4–5.

---

## Step 3: Detect Tech Stack

Read dependency manifests to identify languages and frameworks — this determines which controls are most relevant and what implementation patterns to look for:

| File | Stack detected |
|---|---|
| `package.json` | Node.js / JavaScript / TypeScript |
| `requirements.txt` / `pyproject.toml` | Python |
| `go.mod` | Go |
| `pom.xml` / `build.gradle` | Java / Kotlin |
| `Gemfile` | Ruby |
| `Cargo.toml` | Rust |
| `composer.json` | PHP |

Also check for frameworks (Express, Django, Spring, Rails, FastAPI, etc.) — framework choice determines where to look for auth middleware, input validation, session handling, and security headers.

---

## Step 4: Collect Code to Review

### Staged mode
Review the staged files in full. Additionally, read enough surrounding context to evaluate each control meaningfully — for example, if a staged file adds a new route, read the auth middleware it should use.

### Full mode
Systematically read the codebase focusing on security-sensitive areas:
- Auth and session handling (`auth/`, `middleware/`, `login`, `session`)
- Route handlers and controllers
- Database access layer (ORM models, raw queries)
- External HTTP clients and integrations
- Configuration files
- Logging setup
- Cryptographic operations

You do not need to read every file — focus on the files most relevant to each control.

---

## Step 5: Evaluate Each OWASP Proactive Control

Work through all 10 controls systematically. For each control:

1. Identify the relevant code for that control in the scope
2. Apply the checklist from `references/owasp-proactive-controls.md`
3. Rate the implementation: **Pass** / **Partial** / **Fail** / **N/A**
4. Record specific evidence — quote the file path and line number (or function name) for every finding
5. Note severity of any gap: **Critical** (exploitable, direct impact) / **High** (significant weakness) / **Medium** (defence-in-depth gap) / **Low** (best practice deviation)

**Rating definitions:**
- **Pass** — Control is implemented correctly and consistently
- **Partial** — Control exists but has gaps (e.g., applied in some places but not all, or implemented weakly)
- **Fail** — Control is absent or implemented in a way that provides no real protection
- **N/A** — Control is not applicable to this application (e.g., C10/SSRF for an app that makes no outbound HTTP calls)

**Prioritisation from threat model:** If a `security-audit/threat-model.md` was loaded, flag controls that address high/critical threats with `⚠️ Priority` — these get deeper analysis and appear first in the report.

**Controls to evaluate:**

- **C1** — Access Control: Are authz checks present at all entry points? Centralised? Deny-by-default? No IDOR?
- **C2** — Cryptography: Secrets in vaults not code? TLS configured? Password hashing correct? Keys rotatable?
- **C3** — Input Validation: Server-side validation on all inputs? Prepared statements? Output encoding? No mass assignment?
- **C4** — Secure Design: Are trust boundaries enforced in code? Secure defaults? Attack surface minimal?
- **C5** — Secure Defaults: Debug off in production? No hardcoded credentials? Security headers present?
- **C6** — Component Security: Are dependencies current? Vulnerable versions in use? SCA integrated?
- **C7** — Digital Identity: Password storage correct? Session management secure? MFA where needed? Cookie flags set?
- **C8** — Browser Security: CSP configured? HSTS present? X-Frame-Options? SameSite cookies?
- **C9** — Logging & Monitoring: Security events logged? No sensitive data in logs? Centralised? Log injection prevented?
- **C10** — SSRF Prevention: User-controlled URLs validated? Allowlists used? Internal IPs blocked?

---

## Step 6: Generate Report

Create the `security-audit/` directory if it does not exist (`mkdir -p security-audit`). Save to `security-audit/security-arch-review-report.md`. If the file already exists, save as `security-audit/security-arch-review-report-YYYYMMDD-HHMMSS.md`.

Use this exact structure:

```markdown
# Security Review Report

**Date:** <date>
**Mode:** Staged files | Full codebase
**Tech stack:** <detected stack>
**Context loaded:** security-audit/threat-model.md ✓/✗ | security-audit/security-scan-report.md ✓/✗

---

## Executive Summary

<2–3 sentences: overall security posture, most critical gaps, whether the codebase is improving or regressing if prior report exists>

| Severity | Count |
|---|---|
| Critical | N |
| High | N |
| Medium | N |
| Low | N |

---

## Controls Overview

| Control | Rating | Severity of Gaps | Key Finding |
|---|---|---|---|
| C1 — Access Control | Pass / Partial / Fail / N/A | Critical/High/Medium/Low/— | One-line summary |
| C2 — Cryptography | ... | ... | ... |
| C3 — Input Validation | ... | ... | ... |
| C4 — Secure Design | ... | ... | ... |
| C5 — Secure Defaults | ... | ... | ... |
| C6 — Component Security | ... | ... | ... |
| C7 — Digital Identity | ... | ... | ... |
| C8 — Browser Security | ... | ... | ... |
| C9 — Logging & Monitoring | ... | ... | ... |
| C10 — SSRF Prevention | ... | ... | ... |

---

## Detailed Findings

### ⚠️ C1 — Access Control [Partial — High]

> Maps to: OWASP A01:2021 | STRIDE: Elevation of Privilege
> Threat model ref: T-003 (if applicable)

**What was checked:** <brief description of what code was reviewed>

**Findings:**

#### GAP: No authorisation check on admin endpoint
- **File:** `src/routes/admin.js:23`
- **Severity:** Critical
- **Detail:** `router.delete('/users/:id', deleteUser)` has no middleware verifying the caller has admin role. Any authenticated user can call this endpoint.
- **Remediation:** Add `requireRole('admin')` middleware before the handler, consistent with the pattern used in `src/middleware/auth.js:45`.

#### PASS: Route-level auth middleware applied consistently
- **Evidence:** `src/app.js:67` — all `/api/*` routes pass through `authenticate` middleware before handlers.

---

_(Repeat detailed section for each control with findings. Skip controls rated N/A with a one-line explanation.)_

---

## Priority Gaps (Threat Model Cross-Reference)

_(Only present if security-audit/threat-model.md was loaded)_

| Threat ID | Threat Scenario | Risk Score | Related Control | Control Rating | Gap |
|---|---|---|---|---|---|
| T-001 | Brute-force on login | 20 | C7 — Digital Identity | Partial | No account lockout or rate limiting in auth handler |

---

## Scan Findings Cross-Reference

_(Only present if security-audit/security-scan-report.md was loaded)_

| Scan Finding | File | Control | Notes |
|---|---|---|---|
| SQL injection (semgrep) | `db.py:47` | C3 — Input Validation | Confirmed: raw string concatenation in `get_user()`. Remediation: parameterised query. |

---

## Recommended Actions

### Critical / High (address before next release)
- `src/routes/admin.js:23` — Add admin role check (C1)
- `config/settings.py:12` — Move `SECRET_KEY` to environment variable (C2, C5)

### Medium (address within sprint)
- `src/auth/login.js:34` — Add account lockout after 5 failed attempts (C7)

### Low / Best Practice
- Add `Strict-Transport-Security` header to Express middleware (C8)
- Enable structured logging for auth events (C9)

---

_Generated by security-arch-review skill | OWASP Top 10 Proactive Controls 2024_
```

---

## Step 7: Summary to User

The skill run is now complete. No changes have been made to the codebase — only the report file was written.

After saving, present:
- Overall rating (controls that Passed / Partial / Failed)
- Count of Critical and High gaps
- Top 3 most important findings with file references
- Whether gaps correlate to high-risk items in the threat model
- Path to the saved report

Then offer a follow-up remediation step:

> "The report is saved at `security-audit/security-arch-review-report.md`. No code has been changed.
>
> Would you like me to work through the Critical and High gaps? I'll show you each proposed change before applying anything — you confirm, skip, or stop at each step."

### If yes — walk through fixes one by one

Work through Critical and High gaps in order. For each finding:

1. **Show the proposed change** — display the current code and the exact replacement, or the specific action needed:
   ```
   Finding: C1 — No authorisation check on admin endpoint
   File: src/routes/admin.js, line 23
   Before: router.delete('/users/:id', deleteUser)
   After:  router.delete('/users/:id', requireRole('admin'), deleteUser)
   (requireRole middleware already exists at src/middleware/auth.js:45)
   ```
2. **Ask for confirmation:** "Apply this fix? [yes / no / stop]"
   - **yes** → apply the change, confirm it was made, move to next finding
   - **no** → skip this finding, move to next
   - **stop** → stop the loop, summarise what was applied and what remains

**What is fixable (code changes):**
- Missing middleware calls where the middleware already exists
- Incorrect security header configuration
- Cookie flag additions (`HttpOnly`, `Secure`, `SameSite`)
- Adding missing `import`/`require` for security libraries already in the project

**What is guidance only, not auto-applied:**
- Architectural gaps (e.g. "centralise authorisation logic") — explain the pattern and relevant files, but do not restructure the code
- Dependency or configuration changes requiring design decisions
- Any finding where the correct fix depends on business logic

After the loop, summarise: how many fixes were applied, how many were skipped, and what guidance items remain.

### If no — close out

Direct the user to the Recommended Actions section of the saved report for a prioritised list of what to address next.
