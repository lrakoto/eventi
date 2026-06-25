import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export function useSavedEvents() {
  const { session } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session) {
      setSavedIds(new Set());
      return;
    }
    supabase
      .from('saved_events')
      .select('event_id')
      .then(({ data }) => {
        setSavedIds(new Set(data?.map((r) => r.event_id) ?? []));
      });
  }, [session]);

  async function toggle(eventId: string): Promise<boolean> {
    if (!session) return false;

    if (savedIds.has(eventId)) {
      await supabase.from('saved_events').delete().eq('event_id', eventId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    } else {
      await supabase.from('saved_events').insert({ event_id: eventId });
      setSavedIds((prev) => new Set([...prev, eventId]));
    }
    return true;
  }

  return { savedIds, toggle };
}
