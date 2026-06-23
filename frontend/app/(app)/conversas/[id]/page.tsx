'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ErrorState, Loading, PageHeader, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  sentByAi: boolean;
  createdAt: string;
}
interface Conversation {
  id: string;
  channel: string;
  status: string;
  professional?: { fullName: string } | null;
  vacancy?: { title: string } | null;
  messages: Message[];
}

export default function ConversaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: c, loading, error, reload } = useApi<Conversation>(`/conversations/${id}`);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post(`/conversations/${id}/messages`, { body: text });
      setText('');
      reload();
    } finally {
      setSending(false);
    }
  }

  if (error) return <ErrorState message={error} />;
  if (loading || !c) return <Loading />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={c.professional?.fullName ?? 'Conversa'}
        subtitle={`${c.channel}${c.vacancy ? ` · ${c.vacancy.title}` : ''}`}
        action={<StatusBadge status={c.status} />}
      />
      <div className="card flex h-[60vh] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {c.messages.length === 0 && <p className="text-center text-sm text-hm-text-subtle">Nenhuma mensagem ainda.</p>}
          {c.messages.map((m) => (
            <div key={m.id} className={`flex ${m.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-hm-md px-3 py-2 text-sm ${m.direction === 'OUTBOUND' ? 'bg-hm-primary text-white' : 'bg-hm-surface-muted text-hm-text'}`}>
                <p>{m.body}</p>
                <p className={`mt-1 text-[10px] ${m.direction === 'OUTBOUND' ? 'text-white/70' : 'text-hm-text-subtle'}`}>
                  {m.sentByAi ? '🤖 IA · ' : ''}{new Date(m.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-hm-border p-3">
          <input className="input flex-1" placeholder="Digite uma mensagem…" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn-primary" disabled={sending || !text.trim()}>{sending ? 'Enviando…' : 'Enviar'}</button>
        </form>
      </div>
    </div>
  );
}
