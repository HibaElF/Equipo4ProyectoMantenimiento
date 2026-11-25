# STRIDE Reference

STRIDE is a threat modelling framework developed by Microsoft. Each letter represents a category of threat. Apply every category to every significant component — skipping a category means assuming it has no threats, which is rarely true.

---

## S — Spoofing

**Definition:** An attacker pretends to be someone or something they are not — a user, a service, or a system component.

**What to look for:**
- Authentication mechanisms: are they present, enforced, and strong?
- Token validation: are JWTs verified (signature, expiry, audience, issuer)?
- Service-to-service auth: do internal services authenticate each other?
- Password policies: minimum length, hashing algorithm (bcrypt/argon2 preferred)
- Session management: are session tokens unpredictable and rotated after login?

**Common examples:**
- No rate limiting on login → credential stuffing / brute force
- JWT accepted without signature verification
- Weak or default credentials on admin accounts
- Trusting X-Forwarded-For or X-User-ID headers without validation
- Service endpoints that accept any caller without auth

**Typical controls:**
- Multi-factor authentication
- Rate limiting on auth endpoints
- Strong password hashing (bcrypt, argon2id)
- JWT validation (signature + claims)
- mTLS for service-to-service

**Questions to ask:**
- How does the system know who the caller is?
- What happens if a token is stolen?
- Can an internal service call be made by an external party?

**CWEs:** CWE-287 (Improper Authentication), CWE-294 (Auth Bypass by Capture-Replay), CWE-307 (Improper Restriction of Excessive Auth Attempts)

---

## T — Tampering

**Definition:** An attacker modifies data — in transit, at rest, in memory, or in a log — without authorisation and without detection.

**What to look for:**
- Data in transit: is TLS used everywhere, including internal traffic?
- Data at rest: is sensitive data encrypted in the database?
- Input validation: is user input validated and sanitised before use?
- Integrity checks: are critical data objects signed or checksummed?
- Log integrity: can logs be modified by an attacker who has partial access?

**Common examples:**
- SQL injection (user input modifies query structure)
- Mass assignment vulnerabilities (user sets fields they shouldn't)
- Parameter tampering in unsigned URL parameters or cookies
- HTTP request smuggling
- File upload without type/content validation

**Typical controls:**
- Parameterised queries / ORM with proper escaping
- Input validation and output encoding
- Signed tokens for data integrity (HMAC, JWT)
- TLS everywhere
- Write-once audit logs

**Questions to ask:**
- Can a user modify data belonging to another user?
- Is any critical decision based on user-supplied input that isn't validated?
- What happens if a database record is modified directly?

**CWEs:** CWE-89 (SQL Injection), CWE-915 (Mass Assignment), CWE-345 (Insufficient Verification of Data Authenticity)

---

## R — Repudiation

**Definition:** An actor performs an action and later denies doing it. The system cannot prove otherwise because it lacks sufficient audit trails.

**What to look for:**
- Audit logging: are security-relevant actions logged (login, data changes, admin actions)?
- Log content: do logs capture who, what, when, and from where?
- Log protection: can logs be modified or deleted by users or attackers?
- Non-repudiation: are critical transactions signed?

**Common examples:**
- No audit log for admin actions (user deletion, config changes)
- Logs stored in the same database as application data (attackers can edit both)
- Log entries missing user ID or IP address
- No logging of failed authentication attempts
- Financial transactions with no signed receipt

**Typical controls:**
- Append-only audit logs shipped to a separate system (SIEM, S3)
- Log every auth event (success and failure)
- Include user ID, IP, timestamp, action, and resource in every log entry
- Digital signatures on critical transactions

**Questions to ask:**
- If a user claims they didn't delete that record, can we prove they did?
- Are admin actions traceable to specific individuals?
- Could an attacker cover their tracks by modifying logs?

**CWEs:** CWE-778 (Insufficient Logging), CWE-223 (Omission of Security-Relevant Information)

---

## I — Information Disclosure

**Definition:** Sensitive data is exposed to parties who should not have access to it — through the UI, APIs, logs, errors, or side channels.

**What to look for:**
- Error messages: do they expose stack traces, internal paths, or DB schema?
- API responses: do they return more data than the caller needs?
- Logging: are secrets, tokens, or PII written to logs?
- Data in transit: is anything sent over HTTP instead of HTTPS?
- Data at rest: is PII stored in plaintext?
- Directory listing, backup files, debug endpoints left in production

**Common examples:**
- Stack traces returned to end users
- API returns all user fields including internal ones (over-fetching)
- Passwords or tokens logged
- `.env` file or `config.json` exposed via web server misconfiguration
- Verbose SQL error messages
- Cache-control headers missing on sensitive responses
- IDOR: user can access another user's data by changing an ID in the URL

**Typical controls:**
- Generic error messages to users, detailed errors to internal logs only
- Response filtering / field whitelisting in APIs
- Scrub secrets from logs
- HTTPS everywhere with HSTS
- Encrypt PII at rest
- IDOR prevention: authorisation checks on every resource access

**Questions to ask:**
- What does an unauthenticated user see if they hit an error?
- What does an API response include that the frontend doesn't display?
- Could an attacker enumerate users, files, or IDs?

**CWEs:** CWE-200 (Exposure of Sensitive Information), CWE-209 (Error Message Info Leak), CWE-639 (IDOR)

---

## D — Denial of Service

**Definition:** An attacker disrupts the availability of a system, making it slow, unavailable, or unusable for legitimate users.

**What to look for:**
- Rate limiting: are endpoints protected against high-volume requests?
- Resource limits: are file uploads, query sizes, and request bodies bounded?
- Expensive operations: are computationally heavy endpoints (search, export, image processing) protected?
- Database: can a single query return unbounded results?
- Dependency availability: what happens if a third-party service goes down?

**Common examples:**
- No rate limiting on public API endpoints
- File upload with no size limit
- Regex with catastrophic backtracking (ReDoS)
- N+1 queries triggered by crafted input
- Unbounded pagination (page size = 1,000,000)
- Memory exhaustion via deeply nested JSON
- Slowloris / connection exhaustion

**Typical controls:**
- Rate limiting (per IP, per user, per endpoint)
- Request size limits (body, file upload)
- Query result pagination with maximum page size
- Timeouts on all external calls
- Circuit breakers for downstream dependencies
- Resource quotas

**Questions to ask:**
- What is the most expensive operation in the system? Is it protected?
- What happens if a user sends 10,000 requests per second?
- Is there any input that could cause the server to allocate unbounded memory?

**CWEs:** CWE-400 (Uncontrolled Resource Consumption), CWE-770 (Allocation Without Limits), CWE-1333 (ReDoS)

---

## E — Elevation of Privilege

**Definition:** A user or process gains capabilities beyond what they are authorised for — accessing admin functions, other users' data, or system-level resources.

**What to look for:**
- Authorisation checks: are they present on every sensitive endpoint?
- Horizontal privilege escalation: can user A access user B's data?
- Vertical privilege escalation: can a regular user access admin functions?
- Role checks: are roles enforced server-side, not just in the UI?
- Path traversal: can users access files outside their permitted directory?
- Indirect object references: are resource IDs validated against the current user?

**Common examples:**
- Admin endpoint only hidden in the UI but not protected on the server
- IDOR: `/api/invoices/1234` returns data regardless of who's logged in
- JWT with `role` claim that can be self-modified
- Path traversal: `../../etc/passwd`
- Insecure direct object reference on file downloads
- Missing function-level access control on API routes

**Typical controls:**
- Authorisation middleware applied to all routes
- Object-level authorisation: verify the requesting user owns/can access the resource
- Server-side role enforcement (never trust client-supplied roles)
- Path canonicalisation before file access
- Principle of least privilege for service accounts

**Questions to ask:**
- If I change the user ID in this API request, do I get someone else's data?
- Is there any admin functionality that only requires knowing the URL?
- What prevents a user from modifying their JWT payload?

**CWEs:** CWE-285 (Improper Authorisation), CWE-22 (Path Traversal), CWE-269 (Improper Privilege Management), CWE-639 (IDOR)

---

## STRIDE × Component Type Matrix

Use this as a quick checklist when analysing each component.

| Component | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| **Login / Auth endpoint** | Brute force, credential stuffing | Token tampering | No auth audit log | Password/token leak in errors | Auth DoS | Privilege via weak token |
| **REST API endpoint** | Spoofed caller identity | Parameter/body tampering | No request logging | Over-fetching, IDOR | No rate limit | Missing authz check |
| **Database** | Unauthorised DB user | SQL injection, direct edits | No query audit | Plaintext PII, schema exposure | Resource exhaustion queries | Privilege via DB role |
| **File storage (S3/disk)** | Spoofed download URL | File overwrite, path traversal | No access log | Public bucket, directory listing | Storage exhaustion | Access to other users' files |
| **Message queue** | Forged message source | Message body tampering | No message audit | Sensitive data in queue messages | Queue flooding | Consuming messages intended for others |
| **Admin panel** | Weak admin credentials | Config tampering | No admin action log | Internal data exposure | Admin DoS | Horizontal: admin A sees admin B's actions |
| **Third-party integration** | Spoofed webhook caller | Response tampering | Third party denies action | Data sent to wrong endpoint | Third party outage | Elevated scope via OAuth |
| **Background job / worker** | Job spoofing | Job payload tampering | No job execution log | Sensitive data in job args | Job flooding | Escalated permissions in job context |

---

## App-Type Specific Patterns

### Web Applications
Focus on: XSS (T+I), CSRF (T+E), session fixation (S), clickjacking (E), open redirect (S+I).

### REST APIs
Focus on: IDOR (E+I), broken function-level auth (E), mass assignment (T), excessive data exposure (I), lack of rate limiting (D).

### Mobile App Backends
Focus on: certificate pinning bypass (S+T), insecure local storage on device (I), API key hardcoded in app binary (I+S).

### AI / LLM Applications
Focus on: prompt injection (T+E), excessive agency (E), sensitive data in prompts (I), model denial of service (D), output integrity (T).
