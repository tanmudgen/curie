import type { RoomPulse } from '@workspace/api-client-react';

export function PulseCard({ pulse, roomCode }: { pulse?: RoomPulse; roomCode: string }) {
  const metrics = [
    { label: 'In the room', value: pulse?.memberCount },
    { label: 'Open questions', value: pulse?.openQuestions },
    { label: 'Answered today', value: pulse?.answeredToday },
  ];

  return (
    <aside className="hidden min-w-0 lg:block">
      <div className="rounded-xl bg-[var(--brand-slate)] p-5 text-[var(--brand-paper)]">
        <h2 className="mb-5 text-2xl font-semibold tracking-tight">Room pulse</h2>
        <dl>
          {metrics.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-2 border-t border-white/20 py-3">
              <dt className="text-sm">{label}</dt>
              <dd className="font-mono text-lg font-semibold tabular-nums text-[var(--brand-periwinkle)]">{value ?? '–'}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 border-t border-white/20 pt-5">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wide">Share this room</p>
          <b className="block break-words font-mono text-xl font-medium text-[var(--brand-yellow)]">{roomCode}</b>
        </div>
      </div>
    </aside>
  );
}
