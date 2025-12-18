-- Supabase Schema for AI Language Predictor App
-- This matches the current production schema

-- Users Profile
create table if not exists user_profile (
  id bigint primary key generated always as identity,
  total_xp integer default 0,
  current_level integer default 1,
  longest_streak integer default 0,
  languages_used text default '',
  updated_at bigint,
  user_id uuid default auth.uid()
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
  user_id uuid default auth.uid()
);

-- User Stats (Activity Log)
create table if not exists user_stats (
  id bigint primary key generated always as identity,
  date text,
  type text,
  score integer,
  user_id uuid default auth.uid()
);

-- Conversations
create table if not exists conversations (
  id bigint primary key generated always as identity,
  scenario text,
  language text,
  messages_json text,
  created_at bigint,
  user_id uuid default auth.uid()
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
  user_id uuid default auth.uid()
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
  user_id uuid default auth.uid()
);
