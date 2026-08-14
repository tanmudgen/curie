import { Room } from '@workspace/api-client-react';

export function RoomHeader({ room }: { room?: Room }) {
  return (
    <header className="h-[70px] px-[clamp(18px,4vw,58px)] flex items-center justify-between border-b border-border relative z-10 bg-[rgba(238,230,216,0.72)] backdrop-blur-[10px]">
      <div className="uppercase tracking-[0.2em] text-[10px] font-[850] flex items-center">
        <span className="w-[9px] h-[9px] mr-[10px] rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--background)),0_0_0_4px_hsl(var(--primary))]" />
        Cohort Table
      </div>
      <div className="hidden sm:flex items-center gap-[9px] text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        <i className="w-[7px] h-[7px] rounded-full bg-[#d85a4a] shadow-[0_0_0_5px_rgba(216,90,74,0.1)] relative">
          <span className="absolute inset-0 rounded-full animate-ping bg-[#d85a4a] opacity-75"></span>
        </i>
        Live {room ? `· ${room.cohortName} · ${room.sessionName}` : ''}
      </div>
      <div className="uppercase tracking-[0.2em] text-[8px] font-[850] text-muted-foreground justify-self-end">
        Gen Academy
      </div>
    </header>
  );
}
