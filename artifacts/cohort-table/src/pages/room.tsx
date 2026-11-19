import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { 
  useGetRoom, 
  useGetRoomPulse, 
  useListQuestions,
  ListQuestionsView,
  getGetRoomPulseQueryKey,
  getListQuestionsQueryKey
} from '@workspace/api-client-react';
import { useDeviceId } from '@/hooks/use-device-id';
import { useDisplayName } from '@/hooks/use-display-name';
import { RoomHeader } from '@/components/room/room-header';
import { PulseCard } from '@/components/room/pulse-card';
import { QuestionComposer } from '@/components/room/question-composer';
import { FilterTabs } from '@/components/room/filter-tabs';
import { QuestionCard } from '@/components/room/question-card';
import { motion, AnimatePresence } from 'framer-motion';

export function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [, setLocation] = useLocation();
  const deviceId = useDeviceId();
  const { name } = useDisplayName();

  // Redirect nameless visitors to landing with room pre-filled
  useEffect(() => {
    if (!name.trim()) {
      setLocation(`/?room=${encodeURIComponent(roomCode ?? '')}`);
    }
  }, [name, roomCode, setLocation]);

  if (!name.trim()) return null;
  
  const [filter, setFilter] = useState<ListQuestionsView>(ListQuestionsView.rising);
  
  const { data: room, isLoading: roomLoading } = useGetRoom(roomCode!);
  const { data: pulse } = useGetRoomPulse(roomCode!, { 
    query: { 
      refetchInterval: 10000,
      queryKey: getGetRoomPulseQueryKey(roomCode!)
    } 
  });
  
  const { data: questions, refetch: refetchQuestions } = useListQuestions(
    roomCode!, 
    { view: filter, deviceId },
    { 
      query: { 
        refetchInterval: 4000,
        queryKey: getListQuestionsQueryKey(roomCode!, { view: filter, deviceId })
      } 
    }
  );

  if (roomLoading) {
    return (
      <main className="world flex items-center justify-center min-h-[100dvh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </main>
    );
  }

  if (!room) {
    return (
      <main className="world flex flex-col items-center justify-center min-h-[100dvh] gap-4 text-center p-6">
        <h1 className="font-sans text-3xl">Room not found</h1>
        <p className="text-muted-foreground">The room "{roomCode}" does not exist or is inactive.</p>
        <button onClick={() => window.history.back()} className="dark-button py-2">Go back</button>
      </main>
    );
  }

  return (
    <main className="world">
      <RoomHeader room={room} />
      
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-6 px-4 pt-6 pb-16 sm:px-8 lg:grid-cols-[minmax(200px,248px)_minmax(0,1fr)] lg:gap-10 lg:pt-10">
        
        <PulseCard pulse={pulse} roomCode={roomCode!} />
        
        <section className="flex flex-col min-w-0">
          <QuestionComposer roomCode={roomCode!} onSuccess={refetchQuestions} />
          
          <FilterTabs filter={filter} setFilter={setFilter} />
          
          <div className="grid gap-[12px]">
            <AnimatePresence mode="popLayout">
              {questions?.map((q, i) => (
                <QuestionCard key={q.id} question={q} index={i} roomCode={roomCode!} />
              ))}
            </AnimatePresence>
            {questions?.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 text-center text-muted-foreground text-sm font-mono uppercase tracking-wide border border-dashed border-border rounded-lg bg-card"
              >
                No questions on the table.
              </motion.div>
            )}
          </div>
        </section>
        
      </section>
    </main>
  );
}
