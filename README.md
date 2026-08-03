# iterola

Command-line access to your [Iterola](https://www.iterola.com/) data on
[app.iterola.com](https://app.iterola.com): the businesses of your
organization, the clients who book with them, the services they offer, and
the appointments in their calendars — the same records the dashboard shows,
through the Iterola REST API at `https://api.iterola.com`.

## Install

```bash
npm install -g iterola   # global install
npx iterola --help       # or run without installing
```

Requires Node.js 18 or newer.

## Quick start

```bash
iterola login              # choose browser or API key login
iterola businesses list    # the businesses of your organization
iterola clients list --businessId 64a1f2c9e4b0a1b2c3d4e5f6 -n 10
iterola appointments list --startTime 2026-08-01T00:00:00.000Z
```

```
Found 1 business(es):
1. Example Studio [CRM, APPOINTMENTS] (64a1f2c9e4b0a1b2c3d4e5f6)
```

## Authentication

Two ways in, both stored in `~/.iterola/`:

- **Browser** — `iterola login --browser` opens
  [app.iterola.com](https://app.iterola.com) in your browser to log in with
  your Iterola account, then stores a token session. Tokens are refreshed
  automatically; requests carry `Authorization: Token base64(<jwt>)`.
- **API key** — `iterola login --with-key` prompts for an API key secret
  with a masked input. An administrator of your organization creates the
  key in the Iterola dashboard: open your business, go to **Appointments →
  Settings → API keys** (`/businesses/<businessId>/api-keys/new` on
  [app.iterola.com](https://app.iterola.com)). The secret is shown **once**,
  when the key is created, and never again — store it somewhere safe. It is
  never accepted as a command-line argument, so it cannot leak into your
  shell history. Requests carry `Authorization: Basic base64(<key secret>)`.

Plain `iterola login` in a terminal asks which method to use.
`iterola logout` deletes everything stored in `~/.iterola/`.

**Headless / CI / agents** — export `ITEROLA_API_KEY=<key secret>` and skip
`login` entirely: every command reads it at request time. When several
credentials exist the precedence is: stored browser session, then stored
key, then the environment variable — a stored login always wins over an
exported key, so a globally exported `ITEROLA_API_KEY` never hijacks an
interactive session.

Without a terminal the CLI never hangs and never opens a browser:
`iterola login` (and any command run without credentials) fails immediately
with exit code 1 and instructions on stderr.

A key belongs to a single organization, so the organization never has to be
named. A key can additionally be locked to one business — such a key reads
and writes only that business, and the `--businessId` options below become
unnecessary.

### Scopes

Each API key carries per-resource scopes: `appointments:read`,
`appointments:write`, `clients:read`, `clients:write`, `services:read`,
`services:write`, and `businesses:read`. New keys start read-only; an
administrator widens them in the dashboard. There is deliberately no
`businesses:write` — businesses are managed in the dashboard, not through
the API. A command hitting a scope the key lacks fails with
`403: API key is missing the "…" scope`. Requests are rate limited per key;
going over the limit returns `429`. A browser login carries your own user
permissions instead of key scopes.

## JSON output

Every subcommand accepts `--json` and prints real, parseable JSON on stdout
— plain `JSON.stringify`, no colors. Without the flag, `list` and `read`
print human summaries. Mutations with `--json` print a small result object:
`{ "ok": true, "id": "…" }` for `add`/`update`,
`{ "ok": true, "deleted": ["…"] }` for `delete`.

Errors always go to stderr with exit code 1; with `--json` the error is a
single JSON line — `{"error":{"message":"…","status":404}}` — so stdout
stays clean for parsing.

```bash
iterola clients list --json -n 100 | jq '.[] | {id: ._id, name, email}'
```

## Commands

### Session

```bash
iterola login                # interactive: choose browser or API key login
iterola login --browser      # log in through app.iterola.com
iterola login --with-key     # prompt for an API key secret (masked)
iterola logout               # clear everything stored in ~/.iterola/
```

### Schema

```bash
iterola schema                # the whole command tree as JSON
iterola schema clients list   # one subtree: its options and arguments
```

Machine-readable discovery of every command, option, and argument — for
agents and scripts that would otherwise scrape `--help` text.

### Businesses (read-only)

```bash
iterola businesses list              # businesses of the organization (--json)
iterola businesses get <businessId>  # raw JSON for one business
iterola businesses read <businessId> # formatted view: status, apps, currency
```

### Clients

```bash
iterola clients list                             # -n/--limit 25, --skip, --json
iterola clients list --businessId <businessId>   # only one business
iterola clients list --email jane@example.com    # exact-email lookup
iterola clients list --fields name,email,phone   # project fields
iterola clients get <clientId>                   # raw JSON for one client
iterola clients read <clientId>                  # formatted view
iterola clients add --name "Jane Fonda" --email jane@example.com \
  --phone 5551234567 --businessId <businessId>
iterola clients update <clientId> --phone 5559876543
iterola clients update <clientId> --body '{"language":"it"}'
iterola clients delete <clientId...>             # one or more ids
```

### Services

```bash
iterola services list                            # --businessId, --fields, --json
iterola services get <serviceId>                 # raw JSON for one service
iterola services read <serviceId>                # formatted view
iterola services add --name "Consultation" --price 50 --duration 30 \
  --businessId <businessId>
iterola services update <serviceId> --price 60
iterola services delete <serviceId...>           # one or more ids
```

### Appointments

```bash
iterola appointments list                        # -n/--limit 25, --skip, --json
iterola appointments list --businessId <businessId> --clientId <clientId>
iterola appointments list --startTime 2026-08-01T00:00:00.000Z \
  --endTime 2026-09-01T00:00:00.000Z            # time window
iterola appointments list --sortField startTime --sortDirection ASC
iterola appointments get <appointmentId>         # raw JSON
iterola appointments read <appointmentId>        # formatted view
iterola appointments add --startTime 2026-08-10T14:00:00.000Z \
  --endTime 2026-08-10T14:30:00.000Z --clientId <clientId> \
  --businessId <businessId>
iterola appointments update <appointmentId> --status CANCELED
iterola appointments delete <appointmentId...>   # one or more ids
```

Appointment `--status` accepts `SCHEDULED`, `CLIENT_ARRIVED`, `NO_SHOW`, or
`CANCELED`.

### Skills

```bash
iterola skills list          # names and descriptions of the bundled agent guides
iterola skills get iterola   # print a bundled SKILL.md to stdout
```

## Notes on writes

- Every create/update needs a `businessId`. Pass `--businessId`, or use a key
  locked to one business, which supplies it implicitly. On `update`, when
  neither is given, the CLI reads the record first and reuses its
  `businessId` — that path needs the matching `:read` scope too.
- `update` sends only the fields you pass (plus `--body` JSON); the API
  merges them into the stored record.
- Creates and updates fire the corresponding webhooks (`client.created`,
  `appointment.updated`, …) for the organization's webhook subscriptions,
  exactly as dashboard edits do.
- Deletes are permanent and accept multiple ids
  (`iterola clients delete <id1> <id2>`). Deleting an appointment also
  cancels its scheduled reminders.

## Configuration

`ITEROLA_API_URL` overrides the API endpoint (default
`https://api.iterola.com`) — only needed against a non-production
deployment. `ITEROLA_API_KEY` supplies an API key secret from the
environment for headless use. Stored credentials live only in `~/.iterola/`;
the CLI sends them to the Iterola API and nowhere else, and collects no
telemetry.

## Usage with AI agents

Install the Iterola agent skill for Claude Code, Cursor, Codex, and any
other agent that supports the Skills standard:

```bash
npx skills add iterola/skills
```

The same guide ships inside the npm package, version-matched to the
installed CLI:

```bash
iterola skills list          # what is bundled
iterola skills get iterola   # the CLI guide matching this version
```

Or paste this into your `AGENTS.md` / `CLAUDE.md`:

```markdown
## Iterola

Use the `iterola` CLI for Iterola data: businesses, clients, services, and
appointments. Run `npx iterola skills get iterola` for the full guide,
`iterola schema` for the command tree as JSON, and `iterola --help` for the
command reference. Log in once with `iterola login` (browser or API key),
or export ITEROLA_API_KEY for headless use. Every subcommand accepts
`--json`.
```

Prefer raw HTTP? The same API key authenticates the REST API directly —
`https://api.iterola.com` with `Authorization: Basic base64(<key secret>)`.

## License

[Apache-2.0](LICENSE)
