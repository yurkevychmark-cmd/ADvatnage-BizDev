import { supabase } from './supabase';

/**
 * Угода очима агента (таск 1dcedada, BizDev-агент · 4/8): чати, розмова, пауза, таски.
 * Правило «чи може агент діяти» живе в базі (agent_may_act*, deploy/initdb/07-agent-portal.sql) —
 * агент з 5/8 питає лише його, щоб пауза з порталу діяла без жодного іншого коду.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CHAT_ID_RE = /^-?\d{1,20}$/;

const db = supabase as any;

export async function agentMayAct(projectId: string): Promise<boolean> {
  const { data, error } = await db.rpc('agent_may_act', { p_project: projectId });
  if (error) throw new Error(`agent_may_act: ${error.message}`);
  return data === true;
}

export async function agentMayActInChat(chatId: string): Promise<boolean> {
  const { data, error } = await db.rpc('agent_may_act_in_chat', { p_chat: chatId });
  if (error) throw new Error(`agent_may_act_in_chat: ${error.message}`);
  return data === true;
}

/** Таск агента на борді порталу: без приводу й дедлайну база його не прийме. */
export async function createAgentTask(t: { projectId: string; title: string; reason: string; dueDate: string; priority?: 'low' | 'medium' | 'high' }) {
  const { data: deal } = await db.from('projects').select('name').eq('id', t.projectId).single();
  const { error } = await db.from('tasks').insert({
    title: t.title,
    reason: t.reason,
    due_date: t.dueDate,
    priority: t.priority ?? 'medium',
    status: 'open',
    source: 'agent',
    entity_type: 'deal',
    entity_id: t.projectId,
    entity_name: deal?.name ?? null,
  });
  if (error) throw new Error(`agent task: ${error.message}`);
}
