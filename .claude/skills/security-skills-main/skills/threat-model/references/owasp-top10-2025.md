# OWASP Top 10 — 2025

Reference for web application threat modelling. Cross-reference each item against the codebase during threat enumeration.

**Source:** https://owasp.org/Top10/2025/
**Previous version:** 2021

---

## Changes from 2021 → 2025

| 2025 | Category | Change |
|------|----------|--------|
| A01 | Broken Access Control | Same position |
| A02 | Security Misconfiguration | ↑ from #5 — cloud era impact |
| A03 | Software Supply Chain Failures | ↑ expanded scope (was "Using Components with Known Vulnerabilities") |
| A04 | Cryptographic Failures | ↓ from #2 — improved baseline practices |
| A05 | Injection | ↓ from #3 — better tooling |
| A06 | Insecure Design | ↓ from #4 |
| A07 | Authentication Failures | Same position |
| A08 | Software or Data Integrity Failures | Refined scope (distinct from A03) |
| A09 | Security Logging and Alerting Failures | Same — renamed (alerting emphasised) |
| A10 | Mishandling of Exceptional Conditions | **NEW** — replaces SSRF |

---

## A01:2025 — Broken Access Control

**Description:** Users can act outside their intended permissions. Leads to unauthorised data access, modification, destruction, or execution of business functions.

**Key threats:**
- Insecure Direct Object References (IDOR) — manipulating resource IDs to access other users' data
- Missing server-side authorisation checks (frontend-only guards)
- Privilege escalation via API endpoints (missing PUT/DELETE checks)
- CORS misconfiguration allowing cross-origin data access
- JWT/token abuse — manipulation, replay, missing audience validation
- Missing session invalidation post-logout

**Key CWEs:** CWE-284, CWE-285, CWE-639, CWE-352 (CSRF), CWE-918 (SSRF)

**Threat model focus:** Map every resource type to user roles. Verify trust boundaries enforce server-side checks. Check for cross-tenant data access in multi-tenant systems.

---

## A02:2025 — Security Misconfiguration

**Description:** Systems lack proper security hardening. Elevated from #5 reflecting complexity of cloud infrastructure, containers, and microservices configuration.

**Key threats:**
- Default credentials unchanged (admin/admin, default API keys)
- Exposed admin interfaces (Jenkins, Kubernetes dashboard, AWS console) without auth
- Unnecessary features/services enabled in production
- Stack traces and internal paths disclosed in error responses
- Missing security headers (HSTS, CSP, X-Frame-Options)
- Overly permissive cloud IAM / S3 buckets / security groups
- Debug code active in production

**Key CWEs:** CWE-16, CWE-489 (debug code), CWE-547 (hardcoded constants), CWE-614 (cookie without Secure), CWE-942 (permissive CORS)

**Threat model focus:** Review infrastructure configuration surface area. Check default security posture — is security on by default? Map all exposed admin interfaces and their access controls.

---

## A03:2025 — Software Supply Chain Failures

**Description:** Significantly expanded from A9:2021 "Using Components with Known Vulnerabilities". Now covers the entire supply chain: dependency management, CI/CD pipeline security, access controls, update integrity, and component sourcing trust.

**Key threats:**
- Vulnerable third-party dependencies (transitive included)
- Dependency confusion attacks — malicious packages matching internal names on public registries
- Compromised CI/CD pipelines — injected build steps
- Typosquatting — misspelled package names containing malware
- Unsigned package installation without verification
- Unmaintained / abandoned components with no security updates
- Insufficient access controls on repos/build systems

**Key CWEs:** CWE-1035 (components with known vulns), CWE-1104 (unmaintained components), CWE-494 (download without integrity check)

**Threat model focus:** Generate SBOM. Assess trust model for package registries. Evaluate CI/CD pipeline access controls. Consider transitive dependency exposure. Review update and patch velocity.

---

## A04:2025 — Cryptographic Failures

**Description:** Failures in cryptographic implementation including weak/absent encryption, poor key management, deprecated algorithms, and password handling. Dropped from #2 due to improved baseline practices (TLS adoption, modern frameworks).

**Key threats:**
- Cleartext transmission of sensitive data (HTTP, unencrypted protocols)
- Weak or deprecated algorithms (MD5, SHA1 for hashing; DES, RC4; CBC without authentication)
- Hardcoded or default encryption keys in source code
- Poor key management — keys alongside encrypted data, no rotation
- Weak random number generation (PRNG with insufficient entropy)
- Passwords hashed without salt or with insufficient work factor
- Certificate validation bypassed (self-signed accepted in production)
- TLS protocol downgrade allowed

**Key CWEs:** CWE-259 (hardcoded password), CWE-321 (hardcoded key), CWE-326 (inadequate strength), CWE-327 (broken algorithm), CWE-916 (insufficient work factor), CWE-319 (cleartext transmission)

**Threat model focus:** Classify all data by sensitivity. Map transport channels — is all sensitive data encrypted in transit? Review key lifecycle (generation, storage, rotation, retirement).

---

## A05:2025 — Injection

**Description:** Untrusted user input sent to an interpreter causes it to execute parts of that input as commands. All injection attacks share the same root cause: violation of the data/code boundary.

**Key threats:**
- SQL injection via string concatenation in queries
- NoSQL injection via query operator manipulation (`$ne`, `$where`)
- OS command injection via unsanitised shell arguments
- LDAP injection breaking filter expressions
- XPath/XML injection
- Template/Expression Language injection
- ORM injection via raw query parameters
- XXE (XML External Entity) injection

**Key CWEs:** CWE-89 (SQL), CWE-78 (OS command), CWE-79 (XSS), CWE-90 (LDAP), CWE-91 (XML), CWE-94 (code injection), CWE-643 (XPath)

**Threat model focus:** Map all entry points where untrusted input enters. Identify every interpreter invoked (database, OS, template engine). Verify data/code separation at each boundary.

---

## A06:2025 — Insecure Design

**Description:** Missing or ineffective control design at the architectural level. Distinct from implementation defects — an insecure design cannot be fixed by a perfect implementation. Encompasses requirements management, threat modelling, and secure development lifecycle.

**Key threats:**
- Business logic flaws (unexpected state transitions, negative payment amounts)
- Missing multi-step transaction validation (payment without approval)
- Weak tenant segregation in multi-tenant architectures
- Custom authentication not aligned with NIST 800-63b
- Unprotected critical workflows (payment, approval, privilege escalation)
- No rate limiting enabling resource exhaustion and brute force
- Missing compensating controls when primary controls fail

**Key CWEs:** CWE-272 (least privilege violation), CWE-284, CWE-799 (interaction frequency), CWE-657 (secure design principles violation)

**Threat model focus:** Verify threat model exists and has been used in design decisions. Review business logic workflows for state bypass possibilities. Check privilege escalation paths. Validate multi-tenant data segregation.

---

## A07:2025 — Authentication Failures

**Description:** Systems incorrectly recognise invalid or unauthorised users as legitimate. Includes automated attacks, insufficient MFA, poor session management, and exposed credentials.

**Key threats:**
- Brute force and credential stuffing without rate limiting
- Weak or common passwords accepted (no policy or breach-database check)
- Missing or bypassable MFA
- Session fixation — users forced into known session IDs
- Session ID reuse after logout
- Session tokens exposed in URLs (browser history, logs)
- Hardcoded or default credentials in production
- Weak password recovery mechanisms

**Key CWEs:** CWE-287 (improper authentication), CWE-384 (session fixation), CWE-521 (weak password requirements), CWE-640 (weak password recovery), CWE-798 (hardcoded credentials)

**Threat model focus:** Review authentication mechanism strength. Test attack resistance (brute force, credential stuffing, MFA bypass). Verify session lifecycle (creation, invalidation, protection). Review password recovery flows.

---

## A08:2025 — Software or Data Integrity Failures

**Description:** Failures to verify integrity of software and data artifacts. Focuses on **lower-level trust verification** (deserialization, plugins, updates) rather than supply chain concerns (A03). Core issue: treating untrusted code/data as trusted.

**Key threats:**
- Insecure deserialization — untrusted serialised objects executed as code
- Untrusted plugin loading without signature verification
- Auto-update functionality lacking cryptographic verification
- Unvalidated configuration from untrusted sources
- Build artifacts lacking integrity checks
- Trusting cookie data without HMAC validation
- Prototype pollution / dynamic object attribute manipulation

**Key CWEs:** CWE-345 (insufficient authenticity verification), CWE-494 (download without integrity check), CWE-502 (deserialization of untrusted data), CWE-565 (cookie reliance without validation), CWE-915 (improperly controlled object attribute modification)

**Threat model focus:** Identify all deserialization points. Review plugin/extension architecture for trust model. Verify update mechanism uses cryptographic signatures. Map trust boundaries around configuration sources.

---

## A09:2025 — Security Logging and Alerting Failures

**Description:** Without logging and monitoring, attacks and breaches cannot be detected. Renamed from "Monitoring" to "Alerting" to emphasise the response function. Low CVE count but critical operational impact.

**Key threats:**
- Missing audit logs for authentication, privilege escalation, data access
- Insufficient log detail for incident investigation
- Sensitive data (PII, passwords, tokens) accidentally logged
- Logs writable by attacker — cover tracks by deleting entries
- Log injection — attacker inserts false entries
- No real-time alerting on suspicious activity
- Logs not aggregated — scattered across systems, hard to correlate

**Key CWEs:** CWE-117 (log injection), CWE-223 (omission of security-relevant info), CWE-532 (sensitive info in logs), CWE-778 (insufficient logging)

**Threat model focus:** Define audit requirements — which events must be logged? Verify detection mechanisms and alerting. Review incident response playbook existence. Check log protection (tamper resistance, retention).

---

## A10:2025 — Mishandling of Exceptional Conditions *(NEW)*

**Description:** New category for 2025. Applications fail to prevent, detect, or respond appropriately to exceptional situations. Three failure modes: not preventing unusual situations, failing to identify them, and responding poorly.

**Key threats:**
- NULL pointer dereference causing crashes or undefined behaviour
- Unhandled exceptions propagating with information disclosure (stack traces to users)
- Resource exhaustion — no limits on input size, connection count, memory allocation
- Improper resource cleanup (file handles, DB connections left open after errors)
- Failing open — security controls that allow access when they should deny on error
- Incomplete transactions — multi-step operations partially completing on error
- Arithmetic overflow/underflow in security-relevant calculations

**Key CWEs:** CWE-476 (null pointer dereference), CWE-248 (uncaught exception), CWE-400 (uncontrolled resource consumption), CWE-636 (not failing securely), CWE-209 (info exposure via error message), CWE-460 (improper cleanup on exception), CWE-190/191 (integer overflow/underflow)

**Threat model focus:** Map failure modes for each component. Verify resource limits exist. Check that security controls fail securely (deny by default). Review error message exposure — do users see internals?

---

## Quick Reference Checklist

| Category | Key Question for Threat Review |
|----------|-------------------------------|
| A01 Broken Access Control | Can any user access resources they shouldn't? Are checks server-side? |
| A02 Security Misconfiguration | Are defaults secure? Any exposed admin interfaces or debug features? |
| A03 Supply Chain | Is the SBOM known? Are CI/CD pipelines and deps verified? |
| A04 Cryptographic Failures | Is all sensitive data encrypted in transit and at rest with strong algorithms? |
| A05 Injection | Is all user input validated and escaped before reaching interpreters? |
| A06 Insecure Design | Has this been threat modelled? Can business logic be bypassed? |
| A07 Authentication Failures | Is MFA available? Are brute force and credential stuffing prevented? |
| A08 Integrity Failures | Are deserialized objects, plugins, and updates cryptographically verified? |
| A09 Logging & Alerting | Are security events logged? Are there real-time alerts? |
| A10 Exceptional Conditions | Are errors handled securely? Do controls fail open or closed? |
