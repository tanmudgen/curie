import { RoomPulse } from '@workspace/api-client-react';

export function PulseCard({ pulse, roomCode }: { pulse?: RoomPulse, roomCode: string }) {
  return (
    <aside className="hidden lg:block pt-2">
      <span className="uppercase tracking-[0.16em] text-primary text-[8px] font-black">Room pulse</span>
      <h2 className="font-serif font-normal text-[25px] leading-none tracking-[-0.03em] my-[12px] mb-[10px]">
        The questions behind the chat.
      </h2>
      <p className="text-[11px] leading-[1.55] text-muted-foreground">
        Votes gather repeated confusion into one visible place, while TAs divide the work.
      </p>
      
      <div className="mt-[25px] p-[17px] border border-border rounded-[8px] bg-[rgba(250,245,233,0.48)] shadow-[0_9px_18px_rgba(58,55,43,0.06)]">
        <div className="flex justify-between py-[10px] border-b border-border text-[9px] uppercase tracking-[0.08em] items-center">
          <span>In the room</span>
          <strong className="font-serif font-normal text-[18px] text-primary leading-none">{pulse?.memberCount ?? '-'}</strong>
        </div>
        <div className="flex justify-between py-[10px] border-b border-border text-[9px] uppercase tracking-[0.08em] items-center">
          <span>Open questions</span>
          <strong className="font-serif font-normal text-[18px] text-primary leading-none">{pulse?.openQuestions ?? '-'}</strong>
        </div>
        <div className="flex justify-between py-[10px] text-[9px] uppercase tracking-[0.08em] items-center">
          <span>Answered today</span>
          <strong className="font-serif font-normal text-[18px] text-primary leading-none">{pulse?.answeredToday ?? '-'}</strong>
        </div>
      </div>
      
      <div className="mt-[18px] pt-[15px] border-t border-border text-[9px] text-muted-foreground uppercase tracking-[0.05em]">
        Share this room
        <b className="block mt-[5px] font-serif font-normal text-[19px] tracking-[0.12em] text-foreground">
          {roomCode}
        </b>
      </div>
    </aside>
  );
}
