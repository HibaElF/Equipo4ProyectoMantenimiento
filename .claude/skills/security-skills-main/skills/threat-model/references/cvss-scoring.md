# CVSS Scoring Reference

This skill uses a simplified Likelihood × Impact scoring model for speed and clarity. This file explains how it maps to CVSS v3, how to apply it consistently, and includes worked examples.

---

## Simplified Scoring Model

### Score = Likelihood (1–5) × Impact (1–5) = Risk Score (1–25)

| Risk Score | Severity | Action |
|---|---|---|
| 20–25 | **Critical** | Immediate remediation required |
| 12–19 | **High** | Remediation in current sprint |
| 6–11 | **Medium** | Remediation planned, tracked |
| 1–5 | **Low** | Accept or monitor |

---

### Likelihood Scale (1–5)

| Score | Label | Meaning |
|---|---|---|
| 5 | Almost Certain | Any unauthenticated user could exploit this with basic tooling |
| 4 | Likely | An authenticated user or someone with basic knowledge could exploit this |
| 3 | Possible | Requires specific conditions or moderate skill |
| 2 | Unlikely | Requires significant skill, insider access, or unusual conditions |
| 1 | Rare | Theoretical — requires very specific and unlikely circumstances |

**Factors that increase likelihood:**
- No authentication required
- Exploit code publicly available
- Exposed to the internet
- No rate limiting or detection
- Simple to reproduce

**Factors that decrease likelihood:**
- Requires authenticated access
- Requires admin or insider access
- Complex exploit chain
- Multiple conditions must align

---

### Impact Scale (1–5)

| Score | Label | Meaning |
|---|---|---|
| 5 | Catastrophic | Full system compromise, all data exposed, service destroyed |
| 4 | Major | Significant data breach, major functionality lost, regulatory impact |
| 3 | Moderate | Partial data exposure, degraded service, limited breach |
| 2 | Minor | Minimal data exposure, limited functionality affected |
| 1 | Negligible | No sensitive data, no meaningful functionality affected |

**Factors that increase impact:**
- Sensitive data involved (PII, credentials, payment, health)
- Regulatory exposure (GDPR, HIPAA, PCI-DSS)
- Financial loss possible
- Affects all users
- Service unavailability
- Irreversible damage (data deletion, credential exposure)

**Factors that decrease impact:**
- No sensitive data
- Only affects the attacker's own data
- Easily reversible
- Limited blast radius

---

## Mapping to CVSS v3

For formal security assessments or CVE reporting, use full CVSS v3. The simplified model above is a faster proxy.

### CVSS v3 Base Score Components

**Attack Vector (AV)**
- Network (N) — exploitable remotely → highest risk
- Adjacent (A) — requires network adjacency
- Local (L) — requires local access
- Physical (P) — requires physical access → lowest risk

**Attack Complexity (AC)**
- Low (L) — no special conditions required
- High (H) — requires specific configuration or race condition

**Privileges Required (PR)**
- None (N) — no authentication needed
- Low (L) — normal user privileges needed
- High (H) — admin privileges needed

**User Interaction (UI)**
- None (N) — no user interaction required
- Required (R) — victim must take action

**Scope (S)**
- Unchanged (U) — impact stays within the vulnerable component
- Changed (C) — impact extends beyond the vulnerable component (e.g. XSS affecting other users)

**Confidentiality / Integrity / Availability Impact (C/I/A)**
- None (N), Low (L), High (H)

### Approximate CVSS → Simplified Score Mapping

| CVSS v3 Score | Severity | Simplified Score Range |
|---|---|---|
| 9.0–10.0 | Critical | 20–25 |
| 7.0–8.9 | High | 12–19 |
| 4.0–6.9 | Medium | 6–11 |
| 0.1–3.9 | Low | 1–5 |

---

## 10 Worked Examples

### Example 1: Unauthenticated SQL Injection on Search Endpoint
- **Likelihood:** 5 — any external user, well-known exploit technique
- **Impact:** 5 — full database access including all user PII
- **Score:** 25 — Critical
- **CVSS approx:** AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8

### Example 2: Stored XSS in User Profile (affects other users)
- **Likelihood:** 4 — authenticated user, easy to exploit
- **Impact:** 4 — can steal session tokens of other users, affects all viewers
- **Score:** 16 — High
- **CVSS approx:** AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:L/A:N = 8.0

### Example 3: IDOR on Invoice Download (authenticated user)
- **Likelihood:** 4 — authenticated, just change the ID in the URL
- **Impact:** 3 — financial documents exposed, but only one at a time
- **Score:** 12 — High
- **CVSS approx:** AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N = 6.5

### Example 4: Missing Rate Limit on Password Reset
- **Likelihood:** 3 — requires targeting a specific user, some automation needed
- **Impact:** 4 — account takeover if successful
- **Score:** 12 — High
- **CVSS approx:** AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N = 9.1

### Example 5: Hardcoded API Key in Source Code
- **Likelihood:** 3 — requires code access (public repo = 5; private = 2)
- **Impact:** 4 — depends on what the API key controls
- **Score:** 12 — High (adjust if repo is public → score 20)
- **CVSS approx:** AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N = 9.1 (if exposed)

### Example 6: Missing CSRF Protection on State-Changing Endpoint
- **Likelihood:** 3 — requires tricking a user into visiting a malicious page
- **Impact:** 3 — can perform actions on behalf of the user
- **Score:** 9 — Medium
- **CVSS approx:** AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:H/A:N = 6.5

### Example 7: Verbose Error Messages Exposing Stack Traces
- **Likelihood:** 4 — trivial to trigger with a malformed request
- **Impact:** 2 — reveals internal paths and library versions, aids further attacks
- **Score:** 8 — Medium
- **CVSS approx:** AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N = 5.3

### Example 8: No Logging on Admin Actions
- **Likelihood:** 3 — an insider or compromised admin account could act without trace
- **Impact:** 3 — cannot detect or investigate incidents
- **Score:** 9 — Medium (note: this is a detection/response risk, not direct exploit)

### Example 9: Dependency with Known CVE (CVSS 7.5, no network exposure)
- **Likelihood:** 2 — requires authenticated access, specific conditions
- **Impact:** 3 — moderate data exposure possible
- **Score:** 6 — Medium
- Note: Always check if the vulnerable code path is actually reachable in this application

### Example 10: Theoretical Timing Attack on Password Comparison
- **Likelihood:** 1 — extremely difficult to exploit reliably, requires many requests
- **Impact:** 3 — could reveal password length or value in theory
- **Score:** 3 — Low
- **Remediation:** Use constant-time comparison (`hmac.compare_digest`) but not urgent

---

## Adjusting Scores for Context

**Increase score if:**
- The application handles regulated data (PII, health, financial) → +1 to Impact
- The endpoint is publicly accessible on the internet → +1 to Likelihood
- The exploit is being actively used in the wild (known CVE with active exploitation) → +1 to Likelihood
- The application has no WAF or IDS → +1 to Likelihood

**Decrease score if:**
- The application is internal-only, not internet-facing → -1 to Likelihood
- Requires insider/admin access already → -1 to Likelihood
- Compensating controls exist (WAF, monitoring, network segmentation) → -1 to Likelihood
- No sensitive data is involved → -1 to Impact
