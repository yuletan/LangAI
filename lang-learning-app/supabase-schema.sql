
-- Users Profile
create table if not exists user_profile (
  id bigint primary key generated always as identity,
  total_xp integer default 0,
  current_level integer default 1,
  longest_streak integer default 0,
  languages_used text default '',
  updated_at bigint,
  user_id uuid references auth.users(id) on delete cascade
);

-- Phrases (Flashcards)
create table if not exists phrases (
  id bigint primary key generated always as identity,
  original text not null,
  translated text not null,
  pronunciation text,
  next_review bigint not null,
  ease_factor float default 2.5,
  interval integer default 1,
  created_at bigint not null,
  user_id uuid references auth.users(id) on delete cascade
);

-- User Stats (Activity Log)
create table if not exists user_stats (
  id bigint primary key generated always as identity,
  date text,
  type text,
  score integer,
  user_id uuid references auth.users(id) on delete cascade
);

-- Conversations
create table if not exists conversations (
  id bigint primary key generated always as identity,
  scenario text,
  language text,
  messages_json text,
  created_at bigint,
  user_id uuid references auth.users(id) on delete cascade
);

-- API Cache
create table if not exists api_cache (
  hash_key text primary key,
  response_json text,
  timestamp bigint
);

-- Achievements
create table if not exists achievements (
  id bigint primary key generated always as identity,
  badge_id text,
  unlocked_at bigint,
  user_id uuid references auth.users(id) on delete cascade
);

-- Challenges
create table if not exists challenges (
  id bigint primary key generated always as identity,
  title text,
  description text,
  goal integer,
  progress integer default 0,
  xp_reward integer,
  type text,
  expires_at bigint,
  completed integer default 0,
  user_id uuid references auth.users(id) on delete cascade
);

-- Function to create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profile (user_id, total_xp, current_level, longest_streak, languages_used, updated_at)
  values (new.id, 0, 1, 0, '', extract(epoch from now()) * 1000);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create profile on user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Enable Row Level Security
alter table user_profile enable row level security;
alter table phrases enable row level security;
alter table user_stats enable row level security;
alter table conversations enable row level security;
alter table achievements enable row level security;
alter table challenges enable row level security;

-- RLS Policies for user_profile
create policy "Users can view own profile"
  on user_profile for select
  using (auth.uid() = user_id);

create policy "Users can update own profile"
  on user_profile for update
  using (auth.uid() = user_id);

-- RLS Policies for phrases
create policy "Users can view own phrases"
  on phrases for select
  using (auth.uid() = user_id);

create policy "Users can insert own phrases"
  on phrases for insert
  with check (auth.uid() = user_id);

create policy "Users can update own phrases"
  on phrases for update
  using (auth.uid() = user_id);

create policy "Users can delete own phrases"
  on phrases for delete
  using (auth.uid() = user_id);

-- RLS Policies for user_stats
create policy "Users can view own stats"
  on user_stats for select
  using (auth.uid() = user_id);

create policy "Users can insert own stats"
  on user_stats for insert
  with check (auth.uid() = user_id);

-- RLS Policies for conversations
create policy "Users can view own conversations"
  on conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on conversations for delete
  using (auth.uid() = user_id);

-- RLS Policies for achievements
create policy "Users can view own achievements"
  on achievements for select
  using (auth.uid() = user_id);

create policy "Users can insert own achievements"
  on achievements for insert
  with check (auth.uid() = user_id);

-- RLS Policies for challenges
create policy "Users can view own challenges"
  on challenges for select
  using (auth.uid() = user_id);

create policy "Users can insert own challenges"
  on challenges for insert
  with check (auth.uid() = user_id);

create policy "Users can update own challenges"
  on challenges for update
  using (auth.uid() = user_id);

-- API Cache is shared (no RLS needed)
