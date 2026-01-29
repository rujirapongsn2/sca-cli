# Example Use Cases

Practical examples demonstrating how to use the Softnix Code Agent for common development tasks.

## Example 1: Fix a Bug in the Codebase

### Scenario

You've encountered a bug where user authentication fails intermittently. The logs show a null reference error.

### Workflow

```bash
# Start SCA in interactive mode
$ sca

# Describe the problem and let the agent analyze
> scan src/auth/ for null references in the authenticate function
```

The agent will:

1. Scan the authentication code for potential null reference issues
2. Identify the problematic code paths
3. Propose fixes with explanations
4. Apply changes after your approval

### Sample Output

```
🔍 Scanning src/auth/authenticator.ts...

Found 3 potential issues:
1. Line 45: user?.profile may be undefined
2. Line 78: session.tokens could be null
3. Line 112: Missing null check on request.user

I'll fix all three issues. Proceed? (yes/no/all)
> all

✅ Fixed 3 null reference issues
📝 Changes applied to src/auth/authenticator.ts
```

---

## Example 2: Add a New Feature

### Scenario

You need to add rate limiting to your API endpoints.

### Workflow

```bash
$ sca

> create a rate limiter middleware in src/middleware/rate-limit.ts
> The limiter should:
> - Allow 100 requests per minute per IP
> - Return 429 Too Many Requests when exceeded
> - Include X-RateLimit headers in response
```

The agent will:

1. Analyze existing middleware structure
2. Create a new rate limiter implementation
3. Add necessary dependencies
4. Write unit tests

---

## Example 3: Run Tests and Fix Failures

### Scenario

Your CI pipeline failed because 5 tests are breaking after a refactor.

### Workflow

```bash
$ sca

> run tests and fix failures
> npm run test
```

### Sample Interaction

```
$ sca

> run npm test

📋 Running test suite...

FAILED: src/utils/parser.test.ts
  Expected: 42
  Received: null

FAILED: src/api/routes.test.ts
  Timeout exceeded

> Fix the failing tests
```

The agent will:

1. Analyze test failures
2. Identify the root causes
3. Fix the underlying code issues
4. Re-run tests to verify fixes

---

## Example 4: Refactor Legacy Code

### Scenario

You have a 2000-line utility file that needs modernization.

### Workflow

```bash
$ sca

> refactor src/utils/legacy-helpers.ts:
> - Extract pure functions
> - Add TypeScript types
> - Remove duplicate code
> - Add JSDoc comments
```

### Safety Commands

```bash
# Before refactoring, create a snapshot
> run git checkpoint before-refactor

# After refactoring, review changes
> diff src/utils/legacy-helpers.ts

# If issues arise, restore
> run git restore src/utils/legacy-helpers.ts
```

---

## Example 5: Generate Commit Messages

### Scenario

You've made several changes and want descriptive commit messages.

### Workflow

```bash
$ sca

> create commit messages for staged changes
```

### Sample Output

```
Analyzed 12 file changes:

Suggested commits:

feat(auth): Add JWT token refresh mechanism
- Implements automatic token refresh on 401 responses
- Stores refresh token in httpOnly cookie

fix(api): Resolve race condition in user creation
- Adds database transaction for user+profile creation
- Validates email uniqueness before insert

chore(deps): Upgrade dependencies
- Update Express to 4.18.2
- Update TypeScript to 5.1

Apply these commits? (yes/no/edit)
> yes

✅ Created 3 commits
```

---

## Example 6: Security Audit

### Scenario

You want to verify your codebase for security issues before a release.

### Workflow

```bash
$ sca

> run security audit
```

### Sample Output

```
🔒 Security Audit Report

✅ No secrets detected
✅ No hardcoded credentials found
✅ SQL injection patterns: None found
✅ XSS vulnerable patterns: None found

📋 File Analysis:
   src/config/: 3 files reviewed
   src/api/: 7 files reviewed
   src/utils/: 5 files reviewed

⚠️  Warnings:
   - src/api/users.ts: Line 23 uses eval() - review necessity
   - src/utils/logger.ts: File permissions too permissive (0644)

✅ Audit complete. 0 critical, 1 high, 1 medium severity issues.
```

---

## Example 7: Create Documentation

### Scenario

You need API documentation for your REST endpoints.

### Workflow

```bash
$ sca

> generate API documentation from route files
> Output to docs/api.md with OpenAPI format
```

### Sample Output

````markdown
# API Documentation

## Users

### GET /api/users

Returns list of all users.

**Response:**

```json
{
  "users": [{ "id": 1, "name": "John", "email": "john@example.com" }]
}
```
````

### POST /api/users

Create a new user.

**Request Body:**

```json
{
  "name": "string",
  "email": "string"
}
```

````

---

## Example 8: Database Migration

### Scenario
You need to add a new column and update the schema.

### Workflow

```bash
$ sca

> create migration: add created_at and updated_at to users table
> The migration should be compatible with SQLite and PostgreSQL
````

### Sample Interaction

```
> create migration for users table timestamps

📝 Generating migration...

Created: migrations/20260129_add_timestamps.sql

-- Up Migration
ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN updated_at DATETIME;

-- Down Migration
ALTER TABLE users DROP COLUMN created_at;
ALTER TABLE users DROP COLUMN updated_at;

Apply migration? (yes/no)
> yes

✅ Migration applied to development database
```

---

## Example 9: Code Review Automation

### Scenario

You want automated code review for a pull request.

### Workflow

```bash
$ sca

> review src/api/v2/new-endpoint.ts:
> - Check for best practices
> - Identify potential bugs
> - Suggest performance improvements
> - Verify security patterns
```

### Sample Output

```
📋 Code Review: src/api/v2/new-endpoint.ts

✅ Passed: Error handling present
✅ Passed: Input validation implemented
✅ Passed: Authentication middleware used

⚠️  Suggestions:
   - Line 45: Consider using batch insert for multiple records
   - Line 78: Add rate limiting for public endpoints
   - Line 112: Add caching for frequently accessed data

🔒 Security:
   ✅ No hardcoded secrets
   ✅ SQL queries parameterized
   ✅ Output sanitized

📊 Complexity: Medium (complexity score: 12)
```

---

## Example 10: Project Setup

### Scenario

Setting up a new TypeScript project with best practices.

### Workflow

```bash
$ sca

> init project:
> - Setup TypeScript with strict mode
> - Configure ESLint with Airbnb style
> - Add Prettier formatting
> - Create docker-compose for local dev
> - Setup Jest testing
> - Configure CI/CD pipeline
```

### Sample Output

```
📦 Initializing new project...

✅ TypeScript configured with strict mode
✅ ESLint configured with Airbnb style
✅ Prettier configured with single quotes
✅ Jest configured with coverage threshold 80%
✅ Docker Compose created with postgres and redis
✅ GitHub Actions CI configured

📄 Generated files:
   - tsconfig.json
   - .eslintrc.js
   - .prettierrc
   - docker-compose.yml
   - jest.config.js
   - .github/workflows/ci.yml

🚀 Project ready for development!
```

---

## Tips for Effective Use

### Be Specific

```
❌ "Fix my code"
✅ "Fix the TypeError on line 42 in src/api/users.ts that causes login failures"
```

### Provide Context

```
❌ "Add authentication"
✅ "Add JWT authentication to the API using the existing auth service.
   User model already has auth_token field. Follow the pattern in
   src/auth/existing-auth.ts"
```

### Use Checkpoints Before Risky Operations

```bash
> run git checkpoint before-large-refactor
```

### Review Before Applying

```bash
> diff  # Review all pending changes
> apply  # Apply after review
```

---

## Next Steps

After reviewing these examples:

1. **Try your first task**: `sca` and start with a simple command
2. **Configure your LLM**: Run `sca init` if not already configured
3. **Explore commands**: `/help` to see all available commands
4. **Check documentation**: See `docs/commands.md` for detailed command reference

For questions or issues, see:

- [Architecture Documentation](architecture.md)
- [Security Policy](security.md)
- [Command Reference](commands.md)
