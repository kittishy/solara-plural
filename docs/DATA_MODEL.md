# DATA_MODEL.md — Solara Plural

> Database schema documentation. Reflects the Drizzle schema in `lib/db/schema.ts`.

---

## Tables

### systems

Represents a plural system (user account).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PRIMARY KEY | CUID/UUID |
| name | text | NOT NULL | System display name |
| description | text | nullable | System description |
| avatarMode | text | NOT NULL DEFAULT `emoji` | System avatar mode (`emoji` or `url`) |
| avatarEmoji | text | NOT NULL DEFAULT `☀️` | Emoji avatar fallback/preset |
| avatarUrl | text | nullable | Optional profile avatar image URL |
| email | text | UNIQUE NOT NULL | Login email |
| passwordHash | text | NOT NULL | bcrypt hash |
| createdAt | integer | NOT NULL | Unix timestamp |
| updatedAt | integer | NOT NULL | Unix timestamp |

---

### members

Represents a headmate/system member.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PRIMARY KEY | CUID/UUID |
| systemId | text | FK → systems.id | Owner system |
| name | text | NOT NULL | Display name |
| pronouns | text | nullable | e.g. "she/her" |
| avatarUrl | text | nullable | URL or null |
| description | text | nullable | Free-form description |
| color | text | nullable | Hex color string |
| role | text | nullable | e.g. "protector", "host" |
| tags | text | nullable | JSON array of strings |
| notes | text | nullable | Private notes |
| isArchived | integer | DEFAULT 0 | Soft delete flag |
| createdAt | integer | NOT NULL | Unix timestamp |
| updatedAt | integer | NOT NULL | Unix timestamp |

**Notes:**
- `tags` stored as JSON string in SQLite, parsed on read
- `isArchived = 1` hides member from main lists but preserves data

---

### front_entries

Records a front session (who was fronting, when).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PRIMARY KEY | CUID/UUID |
| systemId | text | FK → systems.id | Owner system |
| memberIds | text | NOT NULL | JSON array of member IDs |
| startedAt | integer | NOT NULL | Unix timestamp |
| endedAt | integer | nullable | Unix timestamp (null = currently fronting) |
| note | text | nullable | Optional note for this entry |
| createdAt | integer | NOT NULL | Unix timestamp |

**Notes:**
- `memberIds` stored as JSON string — multiple members can front simultaneously
- Active front entry: `endedAt IS NULL`
- Only one active front entry per system at a time (enforced at application layer)

---

### system_notes

Internal notes, optionally linked to a member.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | text | PRIMARY KEY | CUID/UUID |
| systemId | text | FK → systems.id | Owner system |
| memberId | text | nullable, FK → members.id | Linked member (optional) |
| title | text | nullable | Note title |
| content | text | NOT NULL | Note body |
| createdAt | integer | NOT NULL | Unix timestamp |
| updatedAt | integer | NOT NULL | Unix timestamp |

---

## Relationships

```
systems (1) ──── (many) members
systems (1) ──── (many) front_entries
systems (1) ──── (many) system_notes
members (1) ──── (many) system_notes [optional]
```

---

## Index Strategy

```sql
-- Fast member lookups by system
CREATE INDEX idx_members_systemId ON members(systemId);

-- Fast front history queries
CREATE INDEX idx_front_entries_systemId ON front_entries(systemId);
CREATE INDEX idx_front_entries_endedAt ON front_entries(endedAt);

-- Fast note queries
CREATE INDEX idx_system_notes_systemId ON system_notes(systemId);
CREATE INDEX idx_system_notes_memberId ON system_notes(memberId);
```

---

## Import/Export JSON Format

```json
{
  "version": 1,
  "exportedAt": "2026-04-25T00:00:00Z",
  "system": {
    "id": "...",
    "name": "...",
    "description": "..."
  },
  "members": [
    {
      "id": "...",
      "name": "...",
      "pronouns": "she/her",
      "color": "#a78bfa",
      "tags": ["protector", "co-host"],
      "description": "...",
      "role": "host",
      "notes": "...",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "frontHistory": [
    {
      "id": "...",
      "memberIds": ["id1", "id2"],
      "startedAt": "2026-04-25T10:00:00Z",
      "endedAt": "2026-04-25T12:00:00Z",
      "note": "..."
    }
  ],
  "notes": [
    {
      "id": "...",
      "memberId": null,
      "title": "...",
      "content": "...",
      "createdAt": "2026-04-25T00:00:00Z"
    }
  ]
}
```

---

## Reference-informed Future Tables

These are not implemented yet. They are tracked here so future schema work follows the Sheaf/PluralKit/PluralSpace research without rushing all features into the MVP.

### member_groups

Purpose: organize members into groups/subsystems, possibly nested later.

Likely fields:
- `id`
- `systemId`
- `parentGroupId`
- `name`
- `color`
- `sortOrder`
- `createdAt`
- `updatedAt`

### custom_fields

Purpose: define reusable per-member fields.

Likely fields:
- `id`
- `systemId`
- `name`
- `type` (`text`, `number`, `date`, `boolean`, `select`, `markdown`)
- `options` (JSON for select fields)
- `visibility` (future privacy label)
- `sortOrder`
- `createdAt`
- `updatedAt`

### member_field_values

Purpose: store values for custom fields per member.

Likely fields:
- `id`
- `systemId`
- `memberId`
- `fieldId`
- `value` (JSON or text)
- `updatedAt`

### front_tiers

Purpose: future support for primary front, co-front, co-conscious, or custom front states.

Do not add this until the current front history model has editing and retroactive entries. The current `front_entries.memberIds` field is enough for MVP cofronting.

### sharing_roles and visibility_rules

Purpose: future friend-system sharing.

Do not add this before:
- Account deletion is defined
- Export remains reliable
- Privacy labels are clear in the UI
- Sharing is opt-in and reversible

---

## 2026-04-27 Data Model Update (Implemented)

### Account Type Extension
- `systems.accountType` added with default `system`.
- Allowed values in current implementation: `system`, `singlet`.

### New Social Tables

#### system_friend_requests
- `id` (PK)
- `senderSystemId` (FK -> systems.id)
- `receiverSystemId` (FK -> systems.id)
- `status` (`pending` | `accepted` | `declined` | `canceled`)
- `message` (nullable)
- `createdAt`
- `respondedAt` (nullable)

Indexes:
- `idx_friend_requests_sender_system_id`
- `idx_friend_requests_receiver_system_id`
- `idx_friend_requests_status`

#### system_friendships
- `id` (PK)
- `systemAId` (FK -> systems.id)
- `systemBId` (FK -> systems.id)
- `createdAt`

Constraints:
- Canonical pair order at application layer (`systemAId < systemBId`)
- Unique pair index: `ux_friendships_pair(systemAId, systemBId)`

### Export Format Update
- Export JSON moved to `version: 2`.
- `system.accountType` is now included.
- New `social` payload included:
  - `social.friendRequests`
  - `social.friendships`

### Notes
- This keeps one account table (`systems`) while enabling both plural-system and singlet onboarding.
- Singlet accounts can self-upgrade to system via settings/API.

## 2026-04-27 Data Model Update (Safety + Sharing)

### Additional Social Tables

#### system_blocks
- `id` (PK)
- `blockerSystemId` (FK -> systems.id)
- `blockedSystemId` (FK -> systems.id)
- `createdAt`

Indexes and constraints:
- `idx_system_blocks_blocker_system_id`
- `idx_system_blocks_blocked_system_id`
- `ux_system_blocks_pair(blockerSystemId, blockedSystemId)`

Notes:
- Directional model (A blocks B is distinct from B blocks A).
- Used to prevent invites and acceptance while blocked.

#### system_friend_member_shares
- `id` (PK)
- `ownerSystemId` (FK -> systems.id)
- `friendSystemId` (FK -> systems.id)
- `memberId` (FK -> members.id)
- `visibility` (`hidden` | `profile` | `full`)
- `fieldVisibility` (DB column `field_visibility`, nullable JSON string)
- `createdAt`
- `updatedAt`

Notes:
- `field_visibility` stores field-level toggles for shared member data.
- Current field keys: `pronouns`, `description`, `avatarUrl`, `color`, `role`, `tags`, `notes`.

Indexes and constraints:
- `idx_friend_member_shares_owner_friend`
- `idx_friend_member_shares_member_id`
- `ux_friend_member_shares_owner_friend_member(ownerSystemId, friendSystemId, memberId)`

### Export Format Update
- Export JSON is now `version: 3`.
- `social` now includes:
  - `friendRequests`
  - `friendships`
  - `blocks`
  - `memberSharing`
- `social.memberSharing` rows include `visibility` plus optional `fieldVisibility` JSON for per-field sharing.
