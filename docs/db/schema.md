# Tables

| Name | Columns |
|------|---------|
| [accounts](#accounts) | 13 |
| [artists](#artists) | 7 |
| [sessions](#sessions) | 8 |
| [users](#users) | 13 |
| [verifications](#verifications) | 6 |

---

## accounts

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | uuid | `uuidv7()` | NO | - | - |
| account_id | text | - | NO | - | - |
| provider_id | text | - | NO | - | - |
| access_token | text | - | YES | - | - |
| refresh_token | text | - | YES | - | - |
| id_token | text | - | YES | - | - |
| access_token_expires_at | timestamp | - | YES | - | - |
| refresh_token_expires_at | timestamp | - | YES | - | - |
| scope | text | - | YES | - | - |
| password | text | - | YES | - | - |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |
| user_id | uuid | - | NO | - | [users.id](#users) |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| accounts_user_id_users_id_fk | FOREIGN KEY | (user_id) → users(id) |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| accounts_user_id_index | user_id | NO | btree |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| [users.id](#users) | **[accounts.user_id](#accounts)** | Many to One |

---

## artists

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | serial | - | NO | - | - |
| resource_id | uuid | `uuidv7()` | NO | - | - |
| name | text | - | NO | - | - |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |
| created_by | uuid | - | NO | - | [users.id](#users) |
| updated_by | uuid | - | NO | - | [users.id](#users) |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| artists_created_by_users_id_fk | FOREIGN KEY | (created_by) → users(id) |
| artists_updated_by_users_id_fk | FOREIGN KEY | (updated_by) → users(id) |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| [users.id](#users) | **[artists.created_by](#artists)** | Many to One |
| [users.id](#users) | **[artists.updated_by](#artists)** | Many to One |

---

## sessions

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | uuid | `uuidv7()` | NO | - | - |
| token | text | - | NO | - | - |
| expires_at | timestamp | - | NO | - | - |
| ip_address | text | - | YES | - | - |
| user_agent | text | - | YES | - | - |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |
| user_id | uuid | - | NO | - | [users.id](#users) |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| sessions_user_id_users_id_fk | FOREIGN KEY | (user_id) → users(id) |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| sessions_user_id_index | user_id | NO | btree |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| [users.id](#users) | **[sessions.user_id](#sessions)** | Many to One |

---

## users

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | uuid | `uuidv7()` | NO | [accounts.user_id](#accounts), [artists.created_by](#artists), [artists.updated_by](#artists), [sessions.user_id](#sessions), [users.created_by](#users), [users.updated_by](#users) | - |
| email | text | - | NO | - | - |
| email_verified | boolean | `false` | NO | - | - |
| name | text | - | NO | - | - |
| first_name | text | - | YES | - | - |
| last_name | text | - | YES | - | - |
| role | text | `'user'` | NO | - | - |
| bio | text | - | YES | - | - |
| image | text | - | YES | - | - |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |
| created_by | uuid | - | YES | - | [users.id](#users) |
| updated_by | uuid | - | YES | - | [users.id](#users) |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| users_created_by_users_id_fk | FOREIGN KEY | (created_by) → users(id) |
| users_updated_by_users_id_fk | FOREIGN KEY | (updated_by) → users(id) |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| **[users.id](#users)** | [accounts.user_id](#accounts) | Many to One |
| **[users.id](#users)** | [artists.created_by](#artists) | Many to One |
| **[users.id](#users)** | [artists.updated_by](#artists) | Many to One |
| **[users.id](#users)** | [sessions.user_id](#sessions) | Many to One |
| **[users.id](#users)** | [users.created_by](#users) | Many to One |
| **[users.id](#users)** | [users.updated_by](#users) | Many to One |
| [users.id](#users) | **[users.created_by](#users)** | Many to One |
| [users.id](#users) | **[users.updated_by](#users)** | Many to One |

---

## verifications

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | uuid | `uuidv7()` | NO | - | - |
| identifier | text | - | NO | - | - |
| value | text | - | NO | - | - |
| expires_at | timestamp | - | NO | - | - |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| verifications_identifier_index | identifier | NO | btree |

---

## ER Diagram

```mermaid
erDiagram
    accounts }o--|| users : "user_id"
    artists }o--|| users : "created_by"
    artists }o--|| users : "updated_by"
    sessions }o--|| users : "user_id"
    users }o--o| users : "created_by"
    users }o--o| users : "updated_by"

    accounts {
        uuid id PK
        text account_id
        text provider_id
        text access_token
        text refresh_token
        text id_token
        timestamp access_token_expires_at
        timestamp refresh_token_expires_at
        text scope
        text password
        timestamp created_at
        timestamp updated_at
        uuid user_id FK
    }
    artists {
        serial id PK
        uuid resource_id UK
        text name
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
        uuid updated_by FK
    }
    sessions {
        uuid id PK
        text token UK
        timestamp expires_at
        text ip_address
        text user_agent
        timestamp created_at
        timestamp updated_at
        uuid user_id FK
    }
    users {
        uuid id PK
        text email UK
        boolean email_verified
        text name
        text first_name
        text last_name
        text role
        text bio
        text image
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
        uuid updated_by FK
    }
    verifications {
        uuid id PK
        text identifier
        text value
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }
```
