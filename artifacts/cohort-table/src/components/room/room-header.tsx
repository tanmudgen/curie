import type { ReactNode } from 'react';
import type { Room } from '@workspace/api-client-react';
import { BrandLogo } from '@/components/brand-logo';

export function RoomHeader({ room, extra }: { room?: Room; extra?: ReactNode }) {
  return (
    <header className="relative z-10 border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 sm:px-8">
        <BrandLogo className="w-[118px] shrink-0 sm:w-[132px]" />
        {room && (
          <div className="min-w-0 flex-1 border-l border-border pl-4 sm:pl-5">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              <span aria-hidden="true" className="size-2 shrink-0 bg-[var(--brand-purple)]" />
              <span className="truncate">
                {room.isLive ? 'Live' : 'Room'} · <span className="sm:hidden">{room.roomCode}</span>
                <span className="hidden sm:inline">{room.cohortName}</span>
              </span>
            </div>
            <h1 className="truncate text-sm font-semibold text-foreground">{room.sessionName}</h1>
          </div>
        )}
        {extra && <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">{extra}</div>}
      </div>
    </header>
  );
}
