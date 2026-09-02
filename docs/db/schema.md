# Tables

| Name | Columns |
|------|---------|
| [accounts](#accounts) | 13 |
| [artists](#artists) | 7 |
| [list_songs](#list_songs) | 8 |
| [lists](#lists) | 7 |
| [production_types](#production_types) | 7 |
| [productions](#productions) | 9 |
| [sessions](#sessions) | 8 |
| [song_advocates](#song_advocates) | 8 |
| [song_covers](#song_covers) | 8 |
| [song_featured_artists](#song_featured_artists) | 8 |
| [song_productions](#song_productions) | 8 |
| [songs](#songs) | 9 |
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
| **id** | serial | - | NO | [song_featured_artists.artist_id](#song_featured_artists), [songs.artist_id](#songs) | - |
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
| **[artists.id](#artists)** | [song_featured_artists.artist_id](#song_featured_artists) | Many to One |
| **[artists.id](#artists)** | [songs.artist_id](#songs) | Many to One |
| [users.id](#users) | **[artists.created_by](#artists)** | Many to One |
| [users.id](#users) | **[artists.updated_by](#artists)** | Many to One |

---

## list_songs

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | serial | - | NO | - | - |
| resource_id | uuid | `uuidv7()` | NO | - | - |
| list_id | integer | - | NO | - | [lists.id](#lists) |
| song_id | integer | - | NO | - | [songs.id](#songs) |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |
| created_by | uuid | - | NO | - | [users.id](#users) |
| updated_by | uuid | - | NO | - | [users.id](#users) |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| list_songs_list_id_lists_id_fk | FOREIGN KEY | (list_id) → lists(id) |
| list_songs_song_id_songs_id_fk | FOREIGN KEY | (song_id) → songs(id) |
| list_songs_created_by_users_id_fk | FOREIGN KEY | (created_by) → users(id) |
| list_songs_updated_by_users_id_fk | FOREIGN KEY | (updated_by) → users(id) |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| [users.id](#users) | **[list_songs.created_by](#list_songs)** | Many to One |
| [lists.id](#lists) | **[list_songs.list_id](#list_songs)** | Many to One |
| [songs.id](#songs) | **[list_songs.song_id](#list_songs)** | Many to One |
| [users.id](#users) | **[list_songs.updated_by](#list_songs)** | Many to One |

---

## lists

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | serial | - | NO | [list_songs.list_id](#list_songs) | - |
| resource_id | uuid | `uuidv7()` | NO | - | - |
| name | text | - | NO | - | - |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |
| created_by | uuid | - | NO | - | [users.id](#users) |
| updated_by | uuid | - | NO | - | [users.id](#users) |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| lists_created_by_users_id_fk | FOREIGN KEY | (created_by) → users(id) |
| lists_updated_by_users_id_fk | FOREIGN KEY | (updated_by) → users(id) |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| **[lists.id](#lists)** | [list_songs.list_id](#list_songs) | Many to One |
| [users.id](#users) | **[lists.created_by](#lists)** | Many to One |
| [users.id](#users) | **[lists.updated_by](#lists)** | Many to One |

---

## production_types

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | serial | - | NO | [productions.type_id](#productions) | - |
| resource_id | uuid | `uuidv7()` | NO | - | - |
| name | text | - | NO | - | - |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |
| created_by | uuid | - | NO | - | [users.id](#users) |
| updated_by | uuid | - | NO | - | [users.id](#users) |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| production_types_created_by_users_id_fk | FOREIGN KEY | (created_by) → users(id) |
| production_types_updated_by_users_id_fk | FOREIGN KEY | (updated_by) → users(id) |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| **[production_types.id](#production_types)** | [productions.type_id](#productions) | Many to One |
| [users.id](#users) | **[production_types.created_by](#production_types)** | Many to One |
| [users.id](#users) | **[production_types.updated_by](#production_types)** | Many to One |

---

## productions

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | serial | - | NO | [song_productions.production_id](#song_productions) | - |
| resource_id | uuid | `uuidv7()` | NO | - | - |
| name | text | - | NO | - | - |
| release_year | integer | - | NO | - | - |
| type_id | integer | - | NO | - | [production_types.id](#production_types) |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |
| created_by | uuid | - | NO | - | [users.id](#users) |
| updated_by | uuid | - | NO | - | [users.id](#users) |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| productions_type_id_production_types_id_fk | FOREIGN KEY | (type_id) → production_types(id) |
| productions_created_by_users_id_fk | FOREIGN KEY | (created_by) → users(id) |
| productions_updated_by_users_id_fk | FOREIGN KEY | (updated_by) → users(id) |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| **[productions.id](#productions)** | [song_productions.production_id](#song_productions) | Many to One |
| [users.id](#users) | **[productions.created_by](#productions)** | Many to One |
| [production_types.id](#production_types) | **[productions.type_id](#productions)** | Many to One |
| [users.id](#users) | **[productions.updated_by](#productions)** | Many to One |

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

## song_advocates

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | serial | - | NO | - | - |
| resource_id | uuid | `uuidv7()` | NO | - | - |
| song_id | integer | - | NO | - | [songs.id](#songs) |
| user_id | uuid | - | NO | - | [users.id](#users) |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |
| created_by | uuid | - | NO | - | [users.id](#users) |
| updated_by | uuid | - | NO | - | [users.id](#users) |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| song_advocates_song_id_songs_id_fk | FOREIGN KEY | (song_id) → songs(id) |
| song_advocates_user_id_users_id_fk | FOREIGN KEY | (user_id) → users(id) |
| song_advocates_created_by_users_id_fk | FOREIGN KEY | (created_by) → users(id) |
| song_advocates_updated_by_users_id_fk | FOREIGN KEY | (updated_by) → users(id) |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| [users.id](#users) | **[song_advocates.created_by](#song_advocates)** | Many to One |
| [songs.id](#songs) | **[song_advocates.song_id](#song_advocates)** | Many to One |
| [users.id](#users) | **[song_advocates.updated_by](#song_advocates)** | Many to One |
| [users.id](#users) | **[song_advocates.user_id](#song_advocates)** | Many to One |

---

## song_covers

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | serial | - | NO | - | - |
| resource_id | uuid | `uuidv7()` | NO | - | - |
| song_id | integer | - | NO | - | [songs.id](#songs) |
| original_song_id | integer | - | NO | - | [songs.id](#songs) |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |
| created_by | uuid | - | NO | - | [users.id](#users) |
| updated_by | uuid | - | NO | - | [users.id](#users) |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| song_covers_song_id_songs_id_fk | FOREIGN KEY | (song_id) → songs(id) |
| song_covers_original_song_id_songs_id_fk | FOREIGN KEY | (original_song_id) → songs(id) |
| song_covers_created_by_users_id_fk | FOREIGN KEY | (created_by) → users(id) |
| song_covers_updated_by_users_id_fk | FOREIGN KEY | (updated_by) → users(id) |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| [users.id](#users) | **[song_covers.created_by](#song_covers)** | Many to One |
| [songs.id](#songs) | **[song_covers.original_song_id](#song_covers)** | Many to One |
| [songs.id](#songs) | **[song_covers.song_id](#song_covers)** | Many to One |
| [users.id](#users) | **[song_covers.updated_by](#song_covers)** | Many to One |

---

## song_featured_artists

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | serial | - | NO | - | - |
| resource_id | uuid | `uuidv7()` | NO | - | - |
| song_id | integer | - | NO | - | [songs.id](#songs) |
| artist_id | integer | - | NO | - | [artists.id](#artists) |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |
| created_by | uuid | - | NO | - | [users.id](#users) |
| updated_by | uuid | - | NO | - | [users.id](#users) |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| song_featured_artists_song_id_songs_id_fk | FOREIGN KEY | (song_id) → songs(id) |
| song_featured_artists_artist_id_artists_id_fk | FOREIGN KEY | (artist_id) → artists(id) |
| song_featured_artists_created_by_users_id_fk | FOREIGN KEY | (created_by) → users(id) |
| song_featured_artists_updated_by_users_id_fk | FOREIGN KEY | (updated_by) → users(id) |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| [artists.id](#artists) | **[song_featured_artists.artist_id](#song_featured_artists)** | Many to One |
| [users.id](#users) | **[song_featured_artists.created_by](#song_featured_artists)** | Many to One |
| [songs.id](#songs) | **[song_featured_artists.song_id](#song_featured_artists)** | Many to One |
| [users.id](#users) | **[song_featured_artists.updated_by](#song_featured_artists)** | Many to One |

---

## song_productions

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | serial | - | NO | - | - |
| resource_id | uuid | `uuidv7()` | NO | - | - |
| song_id | integer | - | NO | - | [songs.id](#songs) |
| production_id | integer | - | NO | - | [productions.id](#productions) |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |
| created_by | uuid | - | NO | - | [users.id](#users) |
| updated_by | uuid | - | NO | - | [users.id](#users) |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| song_productions_song_id_songs_id_fk | FOREIGN KEY | (song_id) → songs(id) |
| song_productions_production_id_productions_id_fk | FOREIGN KEY | (production_id) → productions(id) |
| song_productions_created_by_users_id_fk | FOREIGN KEY | (created_by) → users(id) |
| song_productions_updated_by_users_id_fk | FOREIGN KEY | (updated_by) → users(id) |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| [users.id](#users) | **[song_productions.created_by](#song_productions)** | Many to One |
| [productions.id](#productions) | **[song_productions.production_id](#song_productions)** | Many to One |
| [songs.id](#songs) | **[song_productions.song_id](#song_productions)** | Many to One |
| [users.id](#users) | **[song_productions.updated_by](#song_productions)** | Many to One |

---

## songs

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | serial | - | NO | [list_songs.song_id](#list_songs), [song_advocates.song_id](#song_advocates), [song_covers.original_song_id](#song_covers), [song_covers.song_id](#song_covers), [song_featured_artists.song_id](#song_featured_artists), [song_productions.song_id](#song_productions) | - |
| resource_id | uuid | `uuidv7()` | NO | - | - |
| title | text | - | NO | - | - |
| artist_id | integer | - | NO | - | [artists.id](#artists) |
| bio | text | - | YES | - | - |
| created_at | timestamp | `now()` | NO | - | - |
| updated_at | timestamp | `now()` | NO | - | - |
| created_by | uuid | - | NO | - | [users.id](#users) |
| updated_by | uuid | - | NO | - | [users.id](#users) |

### Constraints

| Name | Type | Definition |
|------|------|------------|
| songs_artist_id_artists_id_fk | FOREIGN KEY | (artist_id) → artists(id) |
| songs_created_by_users_id_fk | FOREIGN KEY | (created_by) → users(id) |
| songs_updated_by_users_id_fk | FOREIGN KEY | (updated_by) → users(id) |

### Relations

| Parent | Child | Type |
|--------|-------|------|
| **[songs.id](#songs)** | [list_songs.song_id](#list_songs) | Many to One |
| **[songs.id](#songs)** | [song_advocates.song_id](#song_advocates) | Many to One |
| **[songs.id](#songs)** | [song_covers.original_song_id](#song_covers) | Many to One |
| **[songs.id](#songs)** | [song_covers.song_id](#song_covers) | Many to One |
| **[songs.id](#songs)** | [song_featured_artists.song_id](#song_featured_artists) | Many to One |
| **[songs.id](#songs)** | [song_productions.song_id](#song_productions) | Many to One |
| [artists.id](#artists) | **[songs.artist_id](#songs)** | Many to One |
| [users.id](#users) | **[songs.created_by](#songs)** | Many to One |
| [users.id](#users) | **[songs.updated_by](#songs)** | Many to One |

---

## users

### Columns

| Name | Type | Default | Nullable | Children | Parents |
|------|------|---------|----------|----------|---------|
| **id** | uuid | `uuidv7()` | NO | [accounts.user_id](#accounts), [artists.created_by](#artists), [artists.updated_by](#artists), [list_songs.created_by](#list_songs), [list_songs.updated_by](#list_songs), [lists.created_by](#lists), [lists.updated_by](#lists), [production_types.created_by](#production_types), [production_types.updated_by](#production_types), [productions.created_by](#productions), [productions.updated_by](#productions), [sessions.user_id](#sessions), [song_advocates.created_by](#song_advocates), [song_advocates.updated_by](#song_advocates), [song_advocates.user_id](#song_advocates), [song_covers.created_by](#song_covers), [song_covers.updated_by](#song_covers), [song_featured_artists.created_by](#song_featured_artists), [song_featured_artists.updated_by](#song_featured_artists), [song_productions.created_by](#song_productions), [song_productions.updated_by](#song_productions), [songs.created_by](#songs), [songs.updated_by](#songs), [users.created_by](#users), [users.updated_by](#users) | - |
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
| **[users.id](#users)** | [list_songs.created_by](#list_songs) | Many to One |
| **[users.id](#users)** | [list_songs.updated_by](#list_songs) | Many to One |
| **[users.id](#users)** | [lists.created_by](#lists) | Many to One |
| **[users.id](#users)** | [lists.updated_by](#lists) | Many to One |
| **[users.id](#users)** | [production_types.created_by](#production_types) | Many to One |
| **[users.id](#users)** | [production_types.updated_by](#production_types) | Many to One |
| **[users.id](#users)** | [productions.created_by](#productions) | Many to One |
| **[users.id](#users)** | [productions.updated_by](#productions) | Many to One |
| **[users.id](#users)** | [sessions.user_id](#sessions) | Many to One |
| **[users.id](#users)** | [song_advocates.created_by](#song_advocates) | Many to One |
| **[users.id](#users)** | [song_advocates.updated_by](#song_advocates) | Many to One |
| **[users.id](#users)** | [song_advocates.user_id](#song_advocates) | Many to One |
| **[users.id](#users)** | [song_covers.created_by](#song_covers) | Many to One |
| **[users.id](#users)** | [song_covers.updated_by](#song_covers) | Many to One |
| **[users.id](#users)** | [song_featured_artists.created_by](#song_featured_artists) | Many to One |
| **[users.id](#users)** | [song_featured_artists.updated_by](#song_featured_artists) | Many to One |
| **[users.id](#users)** | [song_productions.created_by](#song_productions) | Many to One |
| **[users.id](#users)** | [song_productions.updated_by](#song_productions) | Many to One |
| **[users.id](#users)** | [songs.created_by](#songs) | Many to One |
| **[users.id](#users)** | [songs.updated_by](#songs) | Many to One |
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
    list_songs }o--|| users : "created_by"
    list_songs }o--|| lists : "list_id"
    list_songs }o--|| songs : "song_id"
    list_songs }o--|| users : "updated_by"
    lists }o--|| users : "created_by"
    lists }o--|| users : "updated_by"
    production_types }o--|| users : "created_by"
    production_types }o--|| users : "updated_by"
    productions }o--|| users : "created_by"
    productions }o--|| production_types : "type_id"
    productions }o--|| users : "updated_by"
    sessions }o--|| users : "user_id"
    song_advocates }o--|| users : "created_by"
    song_advocates }o--|| songs : "song_id"
    song_advocates }o--|| users : "updated_by"
    song_advocates }o--|| users : "user_id"
    song_covers }o--|| users : "created_by"
    song_covers }o--|| songs : "original_song_id"
    song_covers }o--|| songs : "song_id"
    song_covers }o--|| users : "updated_by"
    song_featured_artists }o--|| artists : "artist_id"
    song_featured_artists }o--|| users : "created_by"
    song_featured_artists }o--|| songs : "song_id"
    song_featured_artists }o--|| users : "updated_by"
    song_productions }o--|| users : "created_by"
    song_productions }o--|| productions : "production_id"
    song_productions }o--|| songs : "song_id"
    song_productions }o--|| users : "updated_by"
    songs }o--|| artists : "artist_id"
    songs }o--|| users : "created_by"
    songs }o--|| users : "updated_by"
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
    list_songs {
        serial id PK
        uuid resource_id UK
        integer list_id FK
        integer song_id FK
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
        uuid updated_by FK
    }
    lists {
        serial id PK
        uuid resource_id UK
        text name
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
        uuid updated_by FK
    }
    production_types {
        serial id PK
        uuid resource_id UK
        text name
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
        uuid updated_by FK
    }
    productions {
        serial id PK
        uuid resource_id UK
        text name
        integer release_year
        integer type_id FK
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
    song_advocates {
        serial id PK
        uuid resource_id UK
        integer song_id FK,UK
        uuid user_id FK,UK
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
        uuid updated_by FK
    }
    song_covers {
        serial id PK
        uuid resource_id UK
        integer song_id FK,UK
        integer original_song_id FK,UK
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
        uuid updated_by FK
    }
    song_featured_artists {
        serial id PK
        uuid resource_id UK
        integer song_id FK,UK
        integer artist_id FK,UK
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
        uuid updated_by FK
    }
    song_productions {
        serial id PK
        uuid resource_id UK
        integer song_id FK,UK
        integer production_id FK,UK
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
        uuid updated_by FK
    }
    songs {
        serial id PK
        uuid resource_id UK
        text title
        integer artist_id FK
        text bio
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
        uuid updated_by FK
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
