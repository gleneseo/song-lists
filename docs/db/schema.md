# Tables

| Name | Columns | Comment |
|------|---------|---------|
| [accounts](#accounts) | 13 |  |
| [artists](#artists) | 7 |  |
| [sessions](#sessions) | 8 |  |
| [users](#users) | 13 |  |
| [verifications](#verifications) | 6 |  |

---

## accounts

### Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
|------|------|---------|----------|----------|---------|---------|
| **id** | uuid | `uuidv7()` | NO | - | - | - |
| accountId | text | - | NO | - | - | - |
| providerId | text | - | NO | - | - | - |
| accessToken | text | - | YES | - | - | - |
| refreshToken | text | - | YES | - | - | - |
| idToken | text | - | YES | - | - | - |
| accessTokenExpiresAt | timestamp | - | YES | - | - | - |
| refreshTokenExpiresAt | timestamp | - | YES | - | - | - |
| scope | text | - | YES | - | - | - |
| password | text | - | YES | - | - | - |
| createdAt | timestamp | `now()` | NO | - | - | - |
| updatedAt | timestamp | `now()` | NO | - | - | - |
| userId | uuid | - | NO | - | [users.id](#users) | - |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| fk_userId_users | FOREIGN KEY | (userId) → users(id) |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_userId | userId | NO | - |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| [users.id](#users) | **[accounts.userId](#accounts)** | Many to One |

---

## artists

### Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
|------|------|---------|----------|----------|---------|---------|
| **id** | serial | - | NO | - | - | - |
| resource_id | uuid | `uuidv7()` | NO | - | - | - |
| name | text | - | NO | - | - | - |
| createdAt | timestamp | `now()` | NO | - | - | - |
| updatedAt | timestamp | `now()` | NO | - | - | - |
| createdBy | uuid | - | NO | - | [users.id](#users) | - |
| updatedBy | uuid | - | NO | - | [users.id](#users) | - |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| fk_createdBy_users | FOREIGN KEY | (createdBy) → users(id) |
| fk_updatedBy_users | FOREIGN KEY | (updatedBy) → users(id) |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| [users.id](#users) | **[artists.createdBy](#artists)** | Many to One |
| [users.id](#users) | **[artists.updatedBy](#artists)** | Many to One |

---

## sessions

### Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
|------|------|---------|----------|----------|---------|---------|
| **id** | uuid | `uuidv7()` | NO | - | - | - |
| token | text | - | NO | - | - | - |
| expiresAt | timestamp | - | NO | - | - | - |
| ipAddress | text | - | YES | - | - | - |
| userAgent | text | - | YES | - | - | - |
| createdAt | timestamp | `now()` | NO | - | - | - |
| updatedAt | timestamp | `now()` | NO | - | - | - |
| userId | uuid | - | NO | - | [users.id](#users) | - |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| fk_userId_users | FOREIGN KEY | (userId) → users(id) |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_userId | userId | NO | - |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| [users.id](#users) | **[sessions.userId](#sessions)** | Many to One |

---

## users

### Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
|------|------|---------|----------|----------|---------|---------|
| **id** | uuid | `uuidv7()` | NO | [users.createdBy](#users), [users.updatedBy](#users), [artists.createdBy](#artists), [artists.updatedBy](#artists), [sessions.userId](#sessions), [accounts.userId](#accounts) | - | - |
| email | text | - | NO | - | - | - |
| emailVerified | boolean | `false` | NO | - | - | - |
| name | text | - | NO | - | - | - |
| firstName | text | - | YES | - | - | - |
| lastName | text | - | YES | - | - | - |
| role | text | `'user'` | NO | - | - | - |
| bio | text | - | YES | - | - | - |
| image | text | - | YES | - | - | - |
| createdAt | timestamp | `now()` | NO | - | - | - |
| updatedAt | timestamp | `now()` | NO | - | - | - |
| createdBy | uuid | - | YES | - | [users.id](#users) | - |
| updatedBy | uuid | - | YES | - | [users.id](#users) | - |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| fk_createdBy_users | FOREIGN KEY | (createdBy) → users(id) |
| fk_updatedBy_users | FOREIGN KEY | (updatedBy) → users(id) |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| **[users.id](#users)** | [users.createdBy](#users) | Many to One |
| **[users.id](#users)** | [users.updatedBy](#users) | Many to One |
| **[users.id](#users)** | [artists.createdBy](#artists) | Many to One |
| **[users.id](#users)** | [artists.updatedBy](#artists) | Many to One |
| **[users.id](#users)** | [sessions.userId](#sessions) | Many to One |
| **[users.id](#users)** | [accounts.userId](#accounts) | Many to One |

---

## verifications

### Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
|------|------|---------|----------|----------|---------|---------|
| **id** | uuid | `uuidv7()` | NO | - | - | - |
| identifier | text | - | NO | - | - | - |
| value | text | - | NO | - | - | - |
| expiresAt | timestamp | - | NO | - | - | - |
| createdAt | timestamp | `now()` | NO | - | - | - |
| updatedAt | timestamp | `now()` | NO | - | - | - |

### Indexes

| Name | Columns | Unique | Type |
|------|---------|--------|------|
| idx_identifier | identifier | NO | - |

---

## ER Diagram

```mermaid
erDiagram
    users }o--o| users : "createdBy"
    users }o--o| users : "updatedBy"
    artists }o--|| users : "createdBy"
    artists }o--|| users : "updatedBy"
    sessions }o--|| users : "userId"
    accounts }o--|| users : "userId"

    accounts {
        uuid id PK
        text accountId
        text providerId
        text accessToken
        text refreshToken
        text idToken
        timestamp accessTokenExpiresAt
        timestamp refreshTokenExpiresAt
        text scope
        text password
        timestamp createdAt
        timestamp updatedAt
        uuid userId FK
    }
    artists {
        serial id PK
        uuid resource_id UK
        text name
        timestamp createdAt
        timestamp updatedAt
        uuid createdBy FK
        uuid updatedBy FK
    }
    sessions {
        uuid id PK
        text token UK
        timestamp expiresAt
        text ipAddress
        text userAgent
        timestamp createdAt
        timestamp updatedAt
        uuid userId FK
    }
    users {
        uuid id PK
        text email UK
        boolean emailVerified
        text name
        text firstName
        text lastName
        text role
        text bio
        text image
        timestamp createdAt
        timestamp updatedAt
        uuid createdBy FK
        uuid updatedBy FK
    }
    verifications {
        uuid id PK
        text identifier
        text value
        timestamp expiresAt
        timestamp createdAt
        timestamp updatedAt
    }
```
