-- Migracion base de Subsurface Production Allocation (esquema spa).
-- Portada desde server/schema.sql, con tres cambios:
--   1. Los usuarios ya no viven aqui: Supabase Auth gestiona credenciales en
--      auth.users. Esta tabla guarda solo el perfil, referenciado por uuid.
--   2. Se anaden restricciones que el esquema anterior no tenia: el modelo de
--      declinacion se valida contra los cuatro admitidos y el k h no puede ser
--      negativo.
--   3. Las marcas de tiempo pasan a timestamptz.

set search_path = spa, public;

-- Perfil de organizacion. Las credenciales las gestiona Supabase Auth.
create table if not exists user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  varchar(255) not null default '',
  role       varchar(50)  not null default 'engineer',
  is_active  boolean      not null default true,
  created_at timestamptz  not null default now(),
  constraint user_profiles_role_check check (role in ('admin', 'engineer'))
);

comment on table user_profiles is 'Perfil de organizacion; las credenciales viven en auth.users';

create table if not exists wells (
  id            serial primary key,
  user_id       uuid references user_profiles(id) on delete set null,
  name          varchar(200) not null,
  decline_model varchar(50)  not null default 'best_fit',
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),
  constraint wells_decline_model_check
    check (decline_model in ('exponential', 'hyperbolic', 'harmonic', 'best_fit'))
);

create index if not exists ix_wells_user on wells (user_id);

create table if not exists production_data (
  id               serial primary key,
  well_id          integer not null references wells(id) on delete cascade,
  date             date    not null,
  total_production double precision not null default 0,
  unique (well_id, date)
);

create index if not exists ix_production_well_date on production_data (well_id, date);

create table if not exists sand_properties (
  id        serial primary key,
  well_id   integer not null references wells(id) on delete cascade,
  sand_name varchar(100) not null,
  kh        double precision not null,
  unique (well_id, sand_name),
  constraint sand_properties_kh_check check (kh >= 0)
);

create index if not exists ix_sand_properties_well on sand_properties (well_id);

create table if not exists intervention_dates (
  id                serial primary key,
  well_id           integer not null references wells(id) on delete cascade,
  intervention_date date    not null,
  sort_order        integer not null default 0,
  unique (well_id, intervention_date)
);

create index if not exists ix_intervention_dates_well
  on intervention_dates (well_id, intervention_date);

create table if not exists intervention_matrix (
  id                serial primary key,
  well_id           integer not null references wells(id) on delete cascade,
  sand_name         varchar(100) not null,
  intervention_date date    not null,
  is_open           boolean not null default false,
  unique (well_id, sand_name, intervention_date)
);

create index if not exists ix_intervention_matrix_well on intervention_matrix (well_id);

create table if not exists allocation_results (
  id         serial primary key,
  well_id    integer not null unique references wells(id) on delete cascade,
  results    jsonb   not null,
  created_at timestamptz not null default now()
);
