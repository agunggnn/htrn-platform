-- Migration: 20260926000000_chatwoot_mcp_schema.sql
-- Description: Chatwoot WhatsApp sync, conversation tracking, and MCP autonomous agent audit tables

-- 1. Create chatwoot_conversations table
create table if not exists chatwoot_conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references buyers(id) on delete set null,
  chatwoot_conversation_id integer not null,
  contact_phone varchar(30),
  contact_name varchar(255),
  channel varchar(50) default 'whatsapp',
  status varchar(20) default 'open',
  agent_mode varchar(20) default 'auto_pilot',
  last_buyer_message text,
  last_message_at timestamptz default now(),
  ai_confidence_score numeric(4,2) default 0.95,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Unique index to prevent duplicate conversation tracking
create unique index if not exists idx_chatwoot_conv_unique on chatwoot_conversations(chatwoot_conversation_id);
create index if not exists idx_chatwoot_conv_phone on chatwoot_conversations(contact_phone);
create index if not exists idx_chatwoot_conv_buyer on chatwoot_conversations(buyer_id);

-- 2. Create chatwoot_messages table
create table if not exists chatwoot_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references chatwoot_conversations(id) on delete cascade,
  chatwoot_message_id integer,
  sender_type varchar(30) default 'buyer',
  sender_name varchar(255),
  content text not null,
  message_type varchar(20) default 'incoming',
  ai_suggested_reply text,
  ai_reasoning text,
  mcp_tool_calls jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_chatwoot_msg_conv on chatwoot_messages(conversation_id);
create index if not exists idx_chatwoot_msg_type on chatwoot_messages(message_type);

-- 3. Create mcp_audit_logs table
create table if not exists mcp_audit_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references chatwoot_conversations(id) on delete set null,
  tool_name varchar(100) not null,
  tool_args jsonb,
  tool_result jsonb,
  status varchar(20) default 'success',
  execution_note text,
  created_at timestamptz default now()
);

create index if not exists idx_mcp_audit_conv on mcp_audit_logs(conversation_id);
create index if not exists idx_mcp_audit_tool on mcp_audit_logs(tool_name);

-- 4. Enable RLS and setup permissive policies for service role and authenticated app users
alter table chatwoot_conversations enable row level security;
alter table chatwoot_messages enable row level security;
alter table mcp_audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'chatwoot_conversations' and policyname = 'Allow all for authenticated users and service role'
  ) then
    create policy "Allow all for authenticated users and service role" on chatwoot_conversations
      for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'chatwoot_messages' and policyname = 'Allow all for authenticated users and service role'
  ) then
    create policy "Allow all for authenticated users and service role" on chatwoot_messages
      for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'mcp_audit_logs' and policyname = 'Allow all for authenticated users and service role'
  ) then
    create policy "Allow all for authenticated users and service role" on mcp_audit_logs
      for all using (true) with check (true);
  end if;
end $$;
