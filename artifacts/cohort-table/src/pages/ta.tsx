import { useParams } from 'wouter';
import { TaDesk } from '@/components/room/ta-desk';
import { RoomHeader } from '@/components/room/room-header';
import { useGetRoom } from '@workspace/api-client-react';

export function TaPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { data: room } = useGetRoom(roomCode!);

  return (
    <main className="world min-h-screen">
      <RoomHeader room={room} />
      <section className="w-[min(900px,95vw)] m-auto p-[36px_0_70px]">
        <TaDesk roomCode={roomCode!} />
      </section>
    </main>
  );
}
