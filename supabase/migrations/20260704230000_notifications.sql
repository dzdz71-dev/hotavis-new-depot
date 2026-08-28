-- Table notifications pour le système d'alertes
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Index pour récupérer rapidement les notifications non lues d'un utilisateur
create index if not exists idx_notifications_user_unread
  on notifications(user_id) where read = false;

create index if not exists idx_notifications_created_at
  on notifications(created_at desc);

-- RLS : l'utilisateur ne voit que ses propres notifications
alter table notifications enable row level security;

-- Politique SELECT : l'utilisateur ne peut lire que ses notifications
drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own"
  on notifications for select
  using (auth.uid() = user_id);

-- Politique UPDATE : l'utilisateur ne peut modifier que ses notifications
drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own"
  on notifications for update
  using (auth.uid() = user_id);

-- Politique INSERT : l'utilisateur ne peut insérer que pour lui-même
-- (les fonctions serveur utilisent supabaseAdmin qui bypass le RLS)
drop policy if exists "notifications_insert_own" on notifications;
create policy "notifications_insert_own"
  on notifications for insert
  with check (auth.uid() = user_id);

-- Politique DELETE : l'utilisateur ne peut supprimer que ses notifications
drop policy if exists "notifications_delete_own" on notifications;
create policy "notifications_delete_own"
  on notifications for delete
  using (auth.uid() = user_id);