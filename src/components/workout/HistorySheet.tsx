import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { db } from '../../lib/db';
import { exerciseName } from '../../lib/exercises';
import { capitalize, chrono, dateFromKey, fmt, fmtMax, longDate } from '../../lib/format';
import type { WorkoutSession } from '../../lib/types';
import { elapsedMs, sessionVolume, setsProgress } from '../../lib/workout';
import { GlassCard, Sheet } from '../ui';

export function HistorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sessions = useLiveQuery(() => db.sessions.where('status').equals('done').reverse().sortBy('endedAt'), []);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Sheet open={open} onClose={onClose} full title="Historique">
      {!sessions?.length ? (
        <div className="empty">Aucune séance terminée pour l’instant.</div>
      ) : (
        sessions.map((s) => <SessionItem key={s.id} s={s} open={openId === s.id} onToggle={() => setOpenId(openId === s.id ? null : s.id)} />)
      )}
    </Sheet>
  );
}

function SessionItem({ s, open, onToggle }: { s: WorkoutSession; open: boolean; onToggle: () => void }) {
  const p = setsProgress(s);
  return (
    <GlassCard className="ex-card">
      <button className="ex-head" onClick={onToggle} aria-expanded={open}>
        <span className="grow">
          <span className="body" style={{ display: 'block' }}>
            {s.name}
          </span>
          <span className="caption">
            {capitalize(longDate(dateFromKey(s.date)))} · {chrono(elapsedMs(s))} · {p.done} séries · {fmt(sessionVolume(s))} kg soulevés
          </span>
        </span>
      </button>
      {open && (
        <div className="ex-body">
          {s.exercises.map((se) => {
            const done = se.sets.filter((x) => x.done);
            const result = s.progression?.find((r) => r.exerciseId === se.exerciseId);
            return (
              <div key={se.uid} className="stack-sm" style={{ gap: 2 }}>
                <div className="body" style={{ fontSize: 14 }}>
                  {exerciseName(se.exerciseId)}
                </div>
                <div className="caption">
                  {done.length
                    ? done.map((x) => `${x.reps ?? '?'}×${fmtMax(x.load ?? 0)}${x.rpe ? ` @${String(x.rpe).replace('.', ',')}` : ''}`).join(' · ')
                    : 'Non réalisé'}
                </div>
                {result && <div className="caption accent">{result.message}</div>}
              </div>
            );
          })}
          <button
            className="btn-link"
            style={{ alignSelf: 'flex-start', color: 'var(--text-2)' }}
            onClick={() => {
              if (window.confirm('Supprimer cette séance de l’historique ? (la progression déjà calculée est conservée)')) void db.sessions.delete(s.id);
            }}
          >
            <Trash2 size={13} style={{ verticalAlign: -2 }} /> Supprimer
          </button>
        </div>
      )}
    </GlassCard>
  );
}
