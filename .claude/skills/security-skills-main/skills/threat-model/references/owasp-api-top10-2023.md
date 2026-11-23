# OWASP API Security Top 10 — 2023

Reference for API-specific threat modelling. Apply when the application exposes REST, GraphQL, gRPC, or other API interfaces.

---

## API1:2023 — Broken Object Level Authorization (BOLA)

**Description:** APIs tend to expose endpoints that handle object identifiers, creating a wide attack surface for BOLA. Object-level authorisation checks should be considered in every function that accesses a data source using an input from the user.

**Common examples:**
- `/api/orders/{orderId}` returns order data without checking if the caller owns the order
- `/api/users/{userId}/documents` accessible by any authenticated user
- Changing numeric ID in URL to access another user's record
- GraphQL queries that accept arbitrary IDs without ownership validation

**How to detect in code review:**
- Look for any route that takes an ID parameter and fetches a record
- Check if the ownership/permission check happens: `if record.owner_id != current_user.id: raise 403`
- Look for missing checks in PUT/DELETE routes especially
- Check GraphQL resolvers — are object IDs validated against the requesting user?

**Remediations:**
- Implement proper authorisation checks that rely on user policies and hierarchy
- Use random, non-guessable IDs (UUIDs) — but this is not a substitute for authorisation
- Write tests to verify that authorisation checks work correctly

---

## API2:2023 — Broken Authentication

**Description:** Authentication mechanisms are often implemented incorrectly, allowing attackers to compromise authentication tokens or to exploit implementation flaws to assume other users' identities temporarily or permanently.

**Common examples:**
- Weak passwords allowed
- No rate limiting on credential endpoints
- JWT tokens not validated (signature, expiry, algorithm)
- API keys transmitted in URL parameters (logged in server logs)
- Refresh tokens never expire
- `alg: none` JWT attack accepted

**How to detect in code review:**
- Check JWT verification: is signature verified? Is `exp` checked? Is `alg` allowlisted?
- Look for API keys in query strings: `?api_key=xxx` — should be in headers
- Check rate limiting on `/auth/token`, `/auth/login`, `/auth/refresh`
- Look for token expiry: access tokens should be short-lived (15 min), refresh tokens should expire too

**Remediations:**
- Ensure all possible flows for authentication are protected
- Ensure you know all the possible ways to authenticate to all APIs
- Use standard authentication, token generation, and storage
- Use short-lived access tokens
- Implement lockout or rate limiting on brute-force attacks

---

## API3:2023 — Broken Object Property Level Authorization (BOPLA)

**Description:** This category combines Excessive Data Exposure and Mass Assignment. APIs expose object properties to clients that they shouldn't — either returning too much data, or allowing clients to write properties they shouldn't be able to modify.

**Common examples:**
- API returns full user object including `is_admin`, `internal_score`, `password_hash`
- Mass assignment: `User.update(request.body)` — attacker sends `{"is_admin": true}`
- API accepts `role` or `admin` fields in registration endpoint
- Sensitive fields returned in list endpoints that aren't needed

**How to detect in code review:**
- Look for serializers or response objects that include all model fields
- Search for mass assignment patterns: `Model.create(params)`, `Object.assign(user, req.body)` without field filtering
- Check registration/profile update endpoints for writeable privileged fields
- Look for explicit field whitelisting in serializers

**Remediations:**
- Never rely on client-side filtering of sensitive data — filter server-side
- Review each API endpoint response for over-exposure
- Use explicit field allowlisting in serializers / response schemas
- Block client-supplied fields that should not be user-modifiable

---

## API4:2023 — Unrestricted Resource Consumption

**Description:** API requests consume resources such as network bandwidth, CPU, memory, and storage. Other resources such as emails/SMS, or biometric validation can be consumed via API calls. Lack of limits leads to DoS or financial damage.

**Common examples:**
- No pagination limit (or very high maximum) on list endpoints
- Missing rate limits on expensive operations (search, export, ML inference)
- File upload without size or type restrictions
- Email/SMS sending APIs with no per-user quota
- No timeout on long-running operations

**How to detect in code review:**
- Check pagination: is there a maximum `page_size` enforced server-side?
- Check file upload: is there a `MAX_CONTENT_LENGTH` or equivalent?
- Look for rate limiting on search, export, or compute-heavy endpoints
- Check for timeouts on external API calls and DB queries

**Remediations:**
- Define proper rate limiting for all endpoints
- Limit payload sizes
- Tailor rate limiting for API methods, clients, and addresses
- Add spend limits for operations with financial cost (SMS, email, cloud APIs)

---

## API5:2023 — Broken Function Level Authorization

**Description:** Complex access control policies with different hierarchies, groups, and roles, combined with unclear separation between administrative and regular functions, lead to authorisation flaws where users can access admin functionality.

**Common examples:**
- `/api/admin/users` accessible to regular users because there's no server-side check
- HTTP method differences: GET is public but DELETE is not protected
- Admin functionality exposed under `/api/v1/admin/` with no different auth
- Different API versions with inconsistent access control (`/api/v2/` stricter than `/api/v1/`)

**How to detect in code review:**
- Audit all routes for presence of authorisation middleware
- Look for admin-specific routes — are they behind an admin role check?
- Check if HTTP method-specific handlers have separate access checks
- Compare access control between API versions

**Remediations:**
- Deny all access by default and explicitly grant access based on roles
- Review API endpoints against the business logic to identify function-level access flaws
- Make all administrative controllers inherit from an administrative base controller

---

## API6:2023 — Unrestricted Access to Sensitive Business Flows

**Description:** APIs that expose business flows without considering how they could be abused at scale, or in unintended sequences, by automation.

**Common examples:**
- Scalper bots buying all limited-edition items
- Comment spam / content generation at scale
- Mass account creation for credential stuffing
- Bulk coupon / gift card redemption
- Voting manipulation

**How to detect in code review:**
- Identify high-value business flows: purchasing, voting, account creation, coupon use
- Check for per-user rate limits or quotas on these flows
- Look for idempotency checks: can the same action be repeated?
- Check for CAPTCHA or proof-of-work on sensitive entry points

**Remediations:**
- Identify critical business flows
- Implement device fingerprinting / CAPTCHA for sensitive flows
- Apply different rate limiting rules based on business sensitivity
- Consider temporary lockouts or step-up auth for unusual patterns

---

## API7:2023 — Server Side Request Forgery (SSRF)

**Description:** SSRF flaws occur when an API fetches a remote resource based on user-supplied input without sufficient validation. See also OWASP Top 10 A10:2021.

**Common examples:**
- Webhook endpoint that the server calls based on user-supplied URL
- URL-based file import
- Image fetch from user-supplied URL
- API proxying requests to user-specified destinations

**How to detect in code review:**
- Search for HTTP client calls where the URL is user-supplied
- Look for webhook registration endpoints
- Check for URL allowlist validation

**Remediations:**
- Validate and sanitise user-supplied URLs
- Enforce a strict allowlist of remote origins
- Disable HTTP redirections in outbound requests
- Block requests to internal IP ranges (RFC 1918, 169.254.x.x)

---

## API8:2023 — Security Misconfiguration

**Description:** APIs are often misconfigured — missing security headers, insecure defaults, open CORS policies, unnecessary HTTP methods enabled, or verbose error messages.

**Common examples:**
- Missing TLS
- CORS policy allows all origins (`Access-Control-Allow-Origin: *`) on credentialled endpoints
- Unnecessary HTTP methods enabled (TRACE, OPTIONS returning sensitive data)
- Missing security headers (Content-Security-Policy, X-Content-Type-Options)
- Stack traces returned in API error responses
- Permissive cloud storage bucket policies

**How to detect in code review:**
- Check CORS configuration
- Check HTTP methods enabled per endpoint
- Check error handling — does it return stack traces or internal details?
- Check security headers in API responses

**Remediations:**
- Implement a repeatable hardening process
- Review and update configurations regularly
- Automated configuration verification in CI/CD
- Restrict allowed HTTP methods per endpoint

---

## API9:2023 — Improper Inventory Management

**Description:** APIs tend to expose more endpoints than traditional web applications. Proper documentation and inventory is key. Old API versions, debug endpoints, and undocumented endpoints pose security risks.

**Common examples:**
- Old API versions still running in production (`/api/v1/` replaced by `/api/v2/` but v1 still accessible)
- Debug or test endpoints left in production
- Deprecated endpoints with weaker security still functional
- Microservices with different security postures reachable internally

**How to detect in code review:**
- Look for version prefixes in routes — are old versions still wired up?
- Search for `/debug/`, `/test/`, `/internal/`, `/dev/` endpoints
- Check if all documented endpoints actually exist and vice versa
- Look for commented-out routes that might be re-enabled

**Remediations:**
- Inventory all API hosts and document all APIs
- Retire old API versions or apply the same security controls
- Avoid using production data with non-production deployments
- Use API gateway to gain visibility

---

## API10:2023 — Unsafe Consumption of APIs

**Description:** Developers tend to trust data received from third-party APIs more than user input, but third-party APIs can be compromised and can return malicious data.

**Common examples:**
- Application processes data from third-party API without validating/sanitising it
- Third-party API response is rendered directly in HTML (XSS)
- SQL queries built using third-party API data without parameterisation
- Blind trust in third-party OAuth provider claims
- Processing arbitrary redirects from third-party APIs

**How to detect in code review:**
- Look for places where third-party API responses are used in SQL queries, shell commands, or HTML rendering
- Check if third-party data is validated before use
- Look for cases where third-party errors are exposed directly to users

**Remediations:**
- Evaluate the security of third-party APIs before integrating
- Validate and sanitise all data received from third-party APIs
- Maintain an allowlist of known redirects
- Do not blindly trust third-party integrations — apply the same scrutiny as user input
