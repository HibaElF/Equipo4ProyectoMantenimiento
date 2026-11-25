# OWASP Top 10 Proactive Controls — Code Review Reference

**Version:** 2024 (Top 10 Proactive Controls v4)
**Source:** https://owasp.org/www-project-proactive-controls/
**Purpose:** Code review evaluation standard for the security-review skill. Apply each control's checklist when reviewing code.

---

## Summary Mapping Table

| Control | Focus Area | Primary OWASP Top 10 | STRIDE |
|---|---|---|---|
| C1 | Access Control / Authorisation | A01: Broken Access Control | Elevation of Privilege |
| C2 | Cryptography & Data Protection | A02: Cryptographic Failures | Information Disclosure, Tampering |
| C3 | Input Validation & Injection Prevention | A03: Injection | Tampering, DoS, Info Disclosure |
| C4 | Secure Architecture & Design | A04: Insecure Design | All categories |
| C5 | Secure Default Configurations | A05: Security Misconfiguration | Info Disclosure, Tampering |
| C6 | Component & Dependency Security | A06: Vulnerable Components | Tampering, DoS |
| C7 | Digital Identity & Session Management | A07: Auth Failures | Spoofing, Repudiation |
| C8 | Browser Security Headers | A03: XSS | Tampering, Info Disclosure |
| C9 | Security Logging & Monitoring | A09: Logging Failures | Repudiation |
| C10 | SSRF Prevention | A10: SSRF | Info Disclosure, Tampering |

---

## C1 — Implement Access Control

### Why It Matters
Access control determines whether requests from users, programs, or processes should be allowed or denied. The critical distinction: authorisation (verifying access to features/resources) is not the same as authentication (verifying identity). Missing or inconsistent authorisation is the #1 OWASP vulnerability.

### Implementation Requirements
1. **Centralise access control logic** — one reusable procedure, not scattered checks
2. **Deny by default** — all requests denied unless explicitly permitted; applies to error handling, new accounts, new features
3. **Apply at every layer** — API, business logic, and database
4. **Use permission-based checks** over hard-coded role names
5. **Prevent IDOR** — validate that the authenticated user owns the resource they're requesting
6. **Least privilege** — grant only minimum access needed

### Code Review Checklist
- [ ] All routes/endpoints enforce authorisation checks before executing business logic
- [ ] Auth logic is centralised (middleware/decorator pattern), not copy-pasted per handler
- [ ] Default behaviour denies access (fail-secure)
- [ ] No hard-coded role names in business logic (`if user.role == "admin"`)
- [ ] Permission-based checks used (`user.hasPermission("DELETE_ACCOUNT")`)
- [ ] IDOR prevention: resource ownership validated, not just authentication
- [ ] Access control applied at database layer (row-level security or equivalent)
- [ ] Error handling paths do not grant unintended access
- [ ] Admin endpoints have additional verification beyond standard auth

### Pass / Partial / Fail Examples

**❌ FAIL — No authorisation on endpoint:**
```python
@app.route('/admin/users/<id>', methods=['DELETE'])
def delete_user(id):
    User.query.filter_by(id=id).delete()  # Any authenticated user can delete
```

**⚠️ PARTIAL — Auth present but inconsistent:**
```python
@app.route('/admin/users/<id>', methods=['DELETE'])
@login_required  # Authentication only, no role check
def delete_user(id):
    User.query.filter_by(id=id).delete()
```

**✅ PASS — Centralised permission check:**
```python
@app.route('/admin/users/<id>', methods=['DELETE'])
@require_permission('users:delete')
def delete_user(id):
    User.query.filter_by(id=id).delete()
```

---

## C2 — Use Cryptography to Protect Data

### Why It Matters
Sensitive data (passwords, tokens, PII, financial data) must be protected both in transit and at rest. Weak or missing cryptography renders all other controls ineffective if storage or network is compromised.

### Implementation Requirements
1. **Classify data sensitivity** — map categories to protection requirements
2. **Never store plaintext passwords** — use key-derivation functions with salts
3. **Secrets in vaults** — never in code, config files, or environment variables committed to repos
4. **TLS 1.2+ for data in transit** — disable older protocols; enforce HTTPS redirects
5. **Key lifecycle management** — log access, support rotation, design for algorithm change
6. **Peer-reviewed libraries** — no homebrew cryptography (use bcrypt, libsodium, Tink)
7. **Secure cookie flags** — `Secure`, `HttpOnly`, `SameSite`

### Code Review Checklist
- [ ] No plaintext passwords stored in database or logs
- [ ] Password hashing uses bcrypt, PBKDF2, or Argon2 (not MD5/SHA1/SHA256 alone)
- [ ] No secrets (API keys, DB passwords, tokens) in source code or committed config
- [ ] Repository scanned for accidentally committed secrets (trufflehog/gitleaks)
- [ ] TLS 1.2+ configured; HTTP redirects to HTTPS
- [ ] `Strict-Transport-Security` header present
- [ ] Cookies marked `Secure`, `HttpOnly`, `SameSite=Strict` or `Lax`
- [ ] Key rotation procedure exists and is documented/testable
- [ ] Peer-reviewed crypto library used (not custom implementation)
- [ ] SSL compression disabled
- [ ] Sensitive data excluded from logs

### Pass / Partial / Fail Examples

**❌ FAIL — Plaintext password + secret in code:**
```python
DATABASE_PASSWORD = "prod_db_pass_12345"  # Secret in source
user.password = request.form['password']  # Plaintext storage
```

**❌ FAIL — Weak hashing:**
```python
import hashlib
user.password = hashlib.md5(password.encode()).hexdigest()  # Broken algorithm
```

**✅ PASS — bcrypt with vault-sourced secret:**
```python
import bcrypt, os
db_password = os.environ['DB_PASSWORD']  # From secrets manager
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
```

---

## C3 — Validate All Input & Handle Exceptions

### Why It Matters
All user-controlled input is potentially malicious. Input validation prevents injection attacks (SQL, command, template, path traversal, XSS) by ensuring only properly formatted data enters the system. Defence-in-depth: validate input, use parameterised queries, encode output.

### Implementation Requirements
1. **Server-side validation always** — client-side is UX only, never a security control
2. **Allowlist over denylist** — define what is valid, reject everything else
3. **Parameterised queries** for all database access — no string concatenation
4. **Contextual output encoding** — HTML, URL, JS, CSS contexts each need different encoding
5. **Mass assignment prevention** — use DTOs or explicit field allowlists
6. **Safe deserialization** — type enforcement, integrity checks, logging of failures
7. **HTML sanitisation** — use a library (not regex) for rich text content

### Code Review Checklist
- [ ] All user inputs validated server-side before processing
- [ ] Allowlist regex or schema defined for each input type
- [ ] Parameterised statements / prepared queries for all database calls
- [ ] No raw string concatenation in SQL, shell commands, or template rendering
- [ ] Output encoding applied contextually (not just HTML-escaping everywhere)
- [ ] Mass assignment prevented — ORM models use explicit field lists, not `**kwargs`
- [ ] File upload validation: file type checked by content (magic bytes), not extension
- [ ] Deserialization includes type enforcement and exception logging
- [ ] Error messages do not reveal internal implementation details
- [ ] Regular expressions tested for ReDoS vulnerability (catastrophic backtracking)

### Pass / Partial / Fail Examples

**❌ FAIL — SQL injection via concatenation:**
```python
query = f"SELECT * FROM users WHERE id = {user_id}"  # Direct concatenation
cursor.execute(query)
```

**❌ FAIL — Mass assignment:**
```python
user = User(**request.json)  # Attacker adds role=admin
db.session.add(user)
```

**✅ PASS — Parameterised query + field allowlist:**
```python
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

user = User(
    name=request.json['name'],
    email=request.json['email']
    # role not settable via API
)
```

---

## C4 — Address Security from the Start

### Why It Matters
Security flaws introduced at design are the most expensive to fix. This control focuses on secure architecture: clear trust boundaries, minimal attack surface, secure defaults, and avoiding security-by-obscurity. Applies to architectural review more than line-by-line code review.

### Implementation Requirements
1. **Define and enforce trust boundaries** — code should reflect them (middleware, gateways)
2. **Secure by design and by default** — insecure configurations require explicit opt-in
3. **No security through obscurity** — obfuscated keys or hidden endpoints are not security
4. **Minimise attack surface** — unused endpoints, services, and features removed
5. **Well-known patterns** — use established patterns (RBAC, ABAC) not homebrew schemes
6. **Threat model** — architectural changes should have associated threat model updates

### Code Review Checklist
- [ ] Trust boundaries are enforced in code (not just documented)
- [ ] Secure defaults — new accounts, features, and routes are restrictive by default
- [ ] No secrets or auth bypasses hidden via obfuscation (base64, ROT13, etc.)
- [ ] Unused routes, feature flags, and debug endpoints removed from production builds
- [ ] Auth and authorisation patterns are consistent — not reinvented per feature
- [ ] New architectural additions (new services, new external integrations) reflect threat model

### Pass / Partial / Fail Examples

**❌ FAIL — Obscurity instead of access control:**
```javascript
const adminKey = Buffer.from('admin:password').toString('base64');
// Attacker decodes in seconds; base64 is not encryption
```

**❌ FAIL — Debug endpoint left in production:**
```python
@app.route('/debug/env')
def show_env():
    return jsonify(dict(os.environ))  # Exposes all secrets
```

**✅ PASS — Secure default + explicit opt-in:**
```python
DEBUG_ENABLED = os.getenv('DEBUG_ENABLED', 'false').lower() == 'true'
if DEBUG_ENABLED and app.config['ENV'] == 'development':
    register_debug_routes(app)
```

---

## C5 — Secure By Default Configurations

### Why It Matters
Products must be secure without requiring explicit hardening steps. Misconfiguration is consistently in the OWASP Top 10 because developers ship debug modes, default credentials, and overly permissive settings to production. Secure defaults lower the floor for all deployments.

### Implementation Requirements
1. **Debug and verbose modes off in production** — require explicit enablement
2. **No hardcoded or default credentials** — fail on missing required config
3. **Least-privilege IaC** — cloud resources private by default
4. **Security headers set by default** in web framework middleware
5. **Encryption enabled** by default for storage and transit
6. **Unused services disabled** — no demo accounts, admin tools, or sample data in production

### Code Review Checklist
- [ ] `DEBUG=False` (or equivalent) is the default; production cannot accidentally enable it
- [ ] No hardcoded credentials, default passwords, or placeholder secrets
- [ ] Application fails to start if required secrets are missing (not silently falls back)
- [ ] Security headers set in default middleware (X-Frame-Options, X-Content-Type-Options, etc.)
- [ ] Cloud storage (S3, GCS, Azure Blob) defaults to private, not public
- [ ] Error responses do not expose stack traces, internal paths, or version info
- [ ] Unnecessary HTTP methods disabled (TRACE, OPTIONS where not needed)
- [ ] File permissions on config and secret files are restrictive

### Pass / Partial / Fail Examples

**❌ FAIL — Debug on by default, silent fallback on missing secret:**
```python
app.config['DEBUG'] = os.getenv('DEBUG', 'True')  # Default is True!
app.secret_key = os.getenv('SECRET_KEY', 'dev-fallback-key')  # Silent fallback
```

**✅ PASS — Fail-secure defaults:**
```python
app.config['DEBUG'] = os.getenv('DEBUG', 'false').lower() == 'true'
secret_key = os.environ['SECRET_KEY']  # KeyError if not set — intentional
if not secret_key or len(secret_key) < 32:
    raise ValueError("SECRET_KEY must be at least 32 characters")
```

---

## C6 — Keep Your Components Secure

### Why It Matters
Third-party libraries and frameworks introduce vulnerabilities that are disclosed continuously. Using outdated or unmonitored dependencies is equivalent to knowingly shipping known vulnerabilities. Supply chain attacks via compromised packages are increasing.

### Implementation Requirements
1. **Maintain a dependency inventory** — SBOM generated automatically in CI/CD
2. **Pin versions** — no floating `^` or `~` for production dependencies
3. **Continuous vulnerability scanning** — SCA tool in CI/CD (Snyk, Grype, OWASP Dependency-Check)
4. **Update policy** — security patches applied within defined SLA
5. **Source verification** — download from official registries; prefer signed packages
6. **Minimise dependency count** — fewer dependencies = smaller attack surface

### Code Review Checklist
- [ ] All dependencies pinned to specific versions in lock files
- [ ] No known-vulnerable versions currently in use (check against CVE databases)
- [ ] SCA / dependency scanning integrated in CI/CD pipeline
- [ ] Dependency update process documented and followed
- [ ] Transitive dependencies reviewed, not just direct
- [ ] No use of abandoned or unmaintained packages
- [ ] Package integrity verification enabled where supported (npm audit, pip-audit)

### Pass / Partial / Fail Examples

**❌ FAIL — Floating versions, no scanning:**
```json
{
  "dependencies": {
    "express": "^4.0.0",
    "lodash": "*"
  }
}
```

**✅ PASS — Pinned with automated scanning:**
```json
{
  "dependencies": {
    "express": "4.18.2",
    "lodash": "4.17.21"
  }
}
```
```yaml
# CI pipeline includes:
- name: Dependency audit
  run: npm audit --audit-level=high
```

---

## C7 — Secure Digital Identities

### Why It Matters
Weak authentication and session management enable account takeover. This control covers the full lifecycle: credential storage, login security, session creation, MFA, and session termination. Session hijacking exploits weak session tokens; session fixation exploits unregenerated IDs.

### Implementation Requirements (NIST 800-63b aligned)

**Authentication strength by risk level:**
- **Level 1** (low risk): single-factor with secure password storage
- **Level 2** (medium risk): multi-factor (password + OTP/push/hardware)
- **Level 3** (high risk): cryptographic hardware (WebAuthn/FIDO2/PassKey)

**Password requirements:**
- Minimum 8 chars with MFA; 10+ without
- Block breached passwords (check against known breach lists)
- No complexity rules that frustrate passphrases
- Periodic rotation for high-value accounts

**Session management:**
- High-entropy session identifiers (≥128 bits of randomness)
- Regenerate session ID on login, privilege elevation, and logout
- Idle timeout and absolute session lifetime enforced
- Server-side session storage preferred over client-side tokens for sensitive applications

**Cookie security:**
- `Secure` flag — HTTPS only
- `HttpOnly` flag — no JS access
- `SameSite=Strict` or `Lax` — CSRF protection
- Appropriate `Path` and `Domain` scope
- Reasonable expiration

### Code Review Checklist
- [ ] Password storage uses bcrypt, PBKDF2, or Argon2 (with appropriate work factor)
- [ ] Breached password check integrated into registration and password change
- [ ] Session ID regenerated on authentication (prevents session fixation)
- [ ] Session has idle timeout AND absolute lifetime
- [ ] MFA enforced for sensitive operations or admin access
- [ ] JWT tokens: algorithm explicitly specified and allowlisted (prevents `alg:none` attacks)
- [ ] JWT tokens: expiry (`exp`) and issuer (`iss`) claims validated
- [ ] Cookies: `Secure`, `HttpOnly`, `SameSite` flags all set
- [ ] Account lockout or rate limiting on authentication endpoints
- [ ] Logout invalidates server-side session (not just deletes cookie)
- [ ] Password reset uses secure, time-limited tokens (not security questions)

### Pass / Partial / Fail Examples

**❌ FAIL — Weak hashing, no session regeneration, missing flags:**
```python
user.password = hashlib.sha256(password.encode()).hexdigest()
session['user_id'] = user.id  # No regeneration after login
response.set_cookie('session', session_id)  # No Secure/HttpOnly/SameSite
```

**✅ PASS — bcrypt, session regeneration, secure cookies, JWT allowlist:**
```python
import bcrypt, secrets
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))

# After login:
session.clear()                    # Invalidate old session
session['user_id'] = user.id       # Regenerated session ID by framework

response.set_cookie('session', session_id,
    secure=True, httponly=True, samesite='Strict', max_age=3600)

# JWT decode:
jwt.decode(token, SECRET, algorithms=['HS256'])  # Explicit allowlist
```

---

## C8 — Leverage Browser Security Features

### Why It Matters
HTTP security headers instruct browsers to enforce security policies that protect users from XSS, clickjacking, CSRF, and information leakage. These are defence-in-depth measures — they do not replace server-side controls but significantly reduce the impact of other vulnerabilities.

### Key Headers and Their Purpose

| Header | Protects Against | Key Value |
|---|---|---|
| `Content-Security-Policy` | XSS, data injection | `default-src 'self'; script-src 'self' 'nonce-...'` |
| `Strict-Transport-Security` | Protocol downgrade | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | Clickjacking | `DENY` or `SAMEORIGIN` |
| `X-Content-Type-Options` | MIME sniffing | `nosniff` |
| `Referrer-Policy` | Referrer leakage | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Browser feature abuse | `camera=(), microphone=(), geolocation=()` |

### Code Review Checklist
- [ ] `Content-Security-Policy` set — avoids `unsafe-inline` where possible; uses nonces/hashes
- [ ] `Strict-Transport-Security` header configured with `includeSubDomains`
- [ ] `X-Frame-Options: DENY` or `SAMEORIGIN` (or CSP `frame-ancestors`)
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `Referrer-Policy` set to limit referrer leakage
- [ ] `Permissions-Policy` restricts unnecessary browser capabilities
- [ ] Session cookies include `Secure`, `HttpOnly`, `SameSite`
- [ ] CORS configuration allowlists specific origins (not `*` for credentialed requests)
- [ ] CSP does not use `unsafe-eval` or `unsafe-inline` without nonces

### Pass / Partial / Fail Examples

**❌ FAIL — No headers, permissive CSP, missing cookie flags:**
```http
Content-Security-Policy: default-src *
Set-Cookie: session=abc123
```

**⚠️ PARTIAL — Some headers, but `unsafe-inline` weakens CSP:**
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
Strict-Transport-Security: max-age=31536000
Set-Cookie: session=abc123; Secure; HttpOnly
# Missing: X-Frame-Options, X-Content-Type-Options, SameSite
```

**✅ PASS — Full header suite with nonce-based CSP:**
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0m'; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Set-Cookie: session=abc123; Secure; HttpOnly; SameSite=Strict
```

---

## C9 — Implement Security Logging and Monitoring

### Why It Matters
Without logs, breaches go undetected. Without monitoring, logs go unread. Security logging enables intrusion detection, forensic investigation, and compliance. The average breach detection time is months — good logging reduces this. Repudiation attacks (users denying actions) are only countered by audit logs.

### What to Log (Security Events)
- Authentication events: login success, failure, MFA success/failure, logout
- Authorisation failures: access denied events
- Account management: creation, deletion, privilege changes, password resets
- Data access: reads/writes of sensitive records (PII, financial, health)
- Configuration changes: any system configuration modification
- Input validation failures: repeated validation errors (may indicate probing)
- System errors: exceptions that may indicate exploitation attempts

### What NOT to Log
- Passwords (any form)
- Session tokens or JWT values
- Full credit card numbers
- Encryption keys
- PII beyond what is necessary for the event record

### Log Entry Requirements
Every security log entry should capture: **who** (user ID, IP), **what** (event type, resource), **when** (timestamp, synchronised across nodes), **outcome** (success/failure), **context** (session ID, request ID for correlation).

### Code Review Checklist
- [ ] Authentication events (success and failure) logged with user ID and IP
- [ ] Authorisation failures logged — repeated failures should trigger alerts
- [ ] Sensitive data excluded from log entries (passwords, tokens, full card numbers)
- [ ] Log injection prevention — user input sanitised before inclusion in log messages
- [ ] Timestamps synchronised (NTP configured) across all services
- [ ] Logs protected from tampering — restricted write access, forwarded to centralised store
- [ ] Structured logging format (JSON) used for machine parseability
- [ ] Logging does not introduce performance bottlenecks on hot paths

### Pass / Partial / Fail Examples

**❌ FAIL — Sensitive data logged, no security event logging:**
```python
logger.info(f"Login: user={username} password={password}")  # Password in log!
# No logging of auth failures or access denials
```

**⚠️ PARTIAL — Some logging, unstructured, inconsistent:**
```python
logger.info("User logged in: " + str(user_id))
# Auth failures not logged; no IP; no structured format
```

**✅ PASS — Structured, complete, sanitised:**
```python
logger.info("auth.login.success", extra={
    "user_id": user.id,
    "source_ip": request.remote_addr,
    "timestamp": datetime.utcnow().isoformat(),
    "session_id": session.id  # Hashed, not raw token
})

logger.warning("auth.login.failure", extra={
    "username": sanitise_for_log(username),  # Sanitised, not password
    "source_ip": request.remote_addr,
    "failure_reason": "invalid_credentials",
    "attempt_count": get_failure_count(username)
})
```

---

## C10 — Stop Server Side Request Forgery (SSRF)

### Why It Matters
SSRF tricks a server into making requests to unintended destinations — typically internal services (metadata endpoints, databases, internal APIs) that are not externally accessible. Attackers use SSRF to bypass perimeter controls, steal cloud credentials (AWS metadata endpoint), and pivot into internal networks.

### Implementation Requirements
1. **Allowlist outbound destinations** — only permit explicitly approved hosts/URLs
2. **Validate and resolve hostnames** — check resolved IP, not just the hostname string
3. **Block private IP ranges** — 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 (link-local/metadata)
4. **Use a URL parsing library** — not regex (regex SSRF bypasses are well-documented)
5. **Disable XML external entities (XXE)** — in all XML parsers
6. **Account for URL encoding bypasses** — hex, octal, IPv6, unicode normalisations

### Code Review Checklist
- [ ] Any endpoint that accepts a URL parameter has allowlist validation
- [ ] Resolved IP address (not just hostname) checked against blocklist
- [ ] Private IP ranges and localhost explicitly blocked
- [ ] Cloud metadata endpoint (169.254.169.254) blocked
- [ ] URL parsing uses a library, not regex
- [ ] XML parsers configured to disable external entity resolution
- [ ] Redirects followed URLs re-validated after redirect
- [ ] DNS rebinding mitigated (re-check IP after DNS resolution, or use allowlist only)

### Pass / Partial / Fail Examples

**❌ FAIL — Raw user URL passed to HTTP client:**
```python
url = request.args.get('webhook_url')
response = requests.get(url)  # Attacker sends: http://169.254.169.254/latest/meta-data/
```

**⚠️ PARTIAL — Protocol check only (bypassable):**
```python
url = request.args.get('url')
if url.startswith('https://'):
    requests.get(url)  # Still vulnerable: https://127.0.0.1/internal
```

**✅ PASS — Allowlist + IP blocklist:**
```python
from urllib.parse import urlparse
import socket, ipaddress

ALLOWED_HOSTS = {'api.partner.com', 'webhooks.service.com'}
BLOCKED_RANGES = [
    ipaddress.ip_network('127.0.0.0/8'),
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('169.254.0.0/16'),  # Cloud metadata
]

def validate_url(url):
    parsed = urlparse(url)
    if parsed.netloc not in ALLOWED_HOSTS:
        raise ValueError(f"Host not in allowlist: {parsed.netloc}")
    resolved_ip = ipaddress.ip_address(socket.gethostbyname(parsed.hostname))
    for network in BLOCKED_RANGES:
        if resolved_ip in network:
            raise ValueError(f"Resolved IP {resolved_ip} is in blocked range")

validate_url(request.args.get('webhook_url'))
response = requests.get(request.args.get('webhook_url'), allow_redirects=False)
```
