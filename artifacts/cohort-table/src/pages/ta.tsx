import { useState } from 'react';
import { useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useGetRoom,
  useGetRoomPulse,
  useListQuestions,
  ListQuestionsView,
  getGetRoomPulseQueryKey,
  getListQuestionsQueryKey,
  useGetTaMe,
  useGetTaDesk,
  useTaLogin,
  useTaLogout,
  useClaimQuestion,
  useReleaseQuestion,
  useResolveQuestion,
  useSendToLiveQueue,
  getGetTaDeskQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDeviceId } from '@/hooks/use-device-id';
import { RoomHeader } from '@/components/room/room-header';
import { PulseCard } from '@/components/room/pulse-card';
import { QuestionComposer } from '@/components/room/question-composer';
import { FilterTabs } from '@/components/room/filter-tabs';
import { QuestionCard } from '@/components/room/question-card';
import { useToast } from '@/hooks/use-toast';

// ── Root: gate on auth ────────────────────────────────────────────────────────

export function TaPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { data: taMe, isLoading: meLoading } = useGetTaMe({ query: { retry: false } });
  const isTa = taMe?.loggedIn;

  if (meLoading) {
    return (
      <main className="world flex items-center justify-center min-h-[100dvh]">
        <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
      </main>
    );
  }

  if (!isTa) {
    return <TaLoginPage roomCode={roomCode!} />;
  }

  return <TaRoomPage roomCode={roomCode!} taName={taMe!.taName} />;
}

// ── Login page ────────────────────────────────────────────────────────────────

function TaLoginPage({ roomCode }: { roomCode: string }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useTaLogin();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    login.mutate({ data: { name, password } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/ta/me'] });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg || 'Invalid credentials.');
        toast({ title: 'Login failed', variant: 'destructive' });
      },
    });
  };

  return (
    <main className="world min-h-[100dvh] flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/40">
        <div className="flex items-center gap-2 uppercase tracking-[0.18em] text-[9px] font-[850]">
          <span className="w-[8px] h-[8px] rounded-full bg-primary shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_3px_hsl(var(--primary))]" />
          Cohort Table
        </div>
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{roomCode}</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.18, 0.75, 0.2, 1] }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <span className="inline-block uppercase tracking-[0.15em] text-[9px] font-black text-primary mb-3">
              TA Desk · {roomCode}
            </span>
            <h1 className="font-serif text-3xl tracking-tight">Sign in to your desk.</h1>
          </div>

          <form
            onSubmit={handleLogin}
            className="relative border border-[rgba(65,55,40,0.16)] border-l-[6px] border-l-primary rounded-[5px_17px_17px_6px] composer-bg shadow-[0_24px_48px_rgba(61,55,41,0.15),0_4px_9px_rgba(61,55,41,0.08)] p-8"
          >
            <span className="absolute w-[80px] h-[22px] left-1/2 -top-[7px] -translate-x-1/2 -rotate-[1.2deg] bg-[rgba(211,195,152,0.69)] shadow-[0_1px_2px_rgba(70,59,41,0.1)]" aria-hidden="true" />
            <label className="block uppercase tracking-[0.15em] text-primary text-[8px] font-black mb-5">TA Credentials</label>

            <div className="flex flex-col gap-5">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
                className="w-full border-0 border-b border-[rgba(33,49,43,0.24)] bg-transparent py-2 px-1 font-serif text-xl outline-none placeholder:text-[rgba(23,49,58,0.36)]"
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="TA password"
                autoComplete="current-password"
                required
                className="w-full border-0 border-b border-[rgba(33,49,43,0.24)] bg-transparent py-2 px-1 font-serif text-xl outline-none placeholder:text-[rgba(23,49,58,0.36)]"
              />
              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-[10px] text-destructive tracking-wide -mt-2">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <button type="submit" disabled={!name.trim() || !password || login.isPending}
                className="dark-button py-3 mt-2 disabled:opacity-40">
                {login.isPending ? 'Signing in…' : 'Sign in →'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </main>
  );
}

// ── Main TA room view ─────────────────────────────────────────────────────────

function TaRoomPage({ roomCode, taName }: { roomCode: string; taName: string }) {
  const deviceId = useDeviceId();
  const [filter, setFilter] = useState<ListQuestionsView>(ListQuestionsView.rising);
  const [deskOpen, setDeskOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: room, isLoading: roomLoading } = useGetRoom(roomCode);
  const { data: pulse } = useGetRoomPulse(roomCode, {
    query: { refetchInterval: 10000, queryKey: getGetRoomPulseQueryKey(roomCode) },
  });
  const { data: questions, refetch: refetchQuestions } = useListQuestions(
    roomCode,
    { view: filter, deviceId },
    { query: { refetchInterval: 4000, queryKey: getListQuestionsQueryKey(roomCode, { view: filter, deviceId }) } },
  );

  const refreshAll = () => {
    refetchQuestions();
    queryClient.invalidateQueries({ queryKey: getGetTaDeskQueryKey(roomCode) });
  };

  if (roomLoading) {
    return (
      <main className="world flex items-center justify-center min-h-[100dvh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </main>
    );
  }

  return (
    <main className="world">
      <RoomHeader room={room} />

      <section className="w-[min(1200px,95vw)] m-auto grid grid-cols-1 lg:grid-cols-[minmax(180px,210px)_1fr_280px] gap-[clamp(18px,3vw,40px)] p-[22px_0_70px] lg:p-[36px_0_70px]">

        {/* Left — Pulse */}
        <PulseCard pulse={pulse} roomCode={roomCode} />

        {/* Centre — Question list */}
        <section className="flex flex-col min-w-0">
          <QuestionComposer roomCode={roomCode} onSuccess={refetchQuestions} />
          <FilterTabs filter={filter} setFilter={setFilter} />

          <div className="grid gap-[12px]">
            <AnimatePresence mode="popLayout">
              {questions?.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={i}
                  roomCode={roomCode}
                  isTaMode
                  onTaAction={refreshAll}
                />
              ))}
            </AnimatePresence>
            {questions?.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-8 text-center text-muted-foreground text-[11px] uppercase tracking-widest border border-dashed border-border rounded-lg bg-[rgba(255,255,255,0.4)]">
                No questions on the table.
              </motion.div>
            )}
          </div>
        </section>

        {/* Right — TA Desk panel */}
        <TaDeskPanel roomCode={roomCode} taName={taName} onRefreshQuestions={refetchQuestions} />
      </section>

      {/* Mobile desk toggle */}
      <button
        onClick={() => setDeskOpen(v => !v)}
        className="fixed bottom-5 right-5 z-50 lg:hidden dark-button py-2 px-4 text-[9px] uppercase tracking-widest shadow-lg"
      >
        {deskOpen ? 'Close desk' : 'TA Desk'}
      </button>
    </main>
  );
}

// ── TA Desk panel ─────────────────────────────────────────────────────────────

function TaDeskPanel({ roomCode, taName, onRefreshQuestions }: {
  roomCode: string; taName: string; onRefreshQuestions: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logout = useTaLogout();
  const claim = useClaimQuestion();
  const release = useReleaseQuestion();
  const resolve = useResolveQuestion();
  const sendLive = useSendToLiveQueue();

  const { data: desk } = useGetTaDesk(roomCode, {
    query: { refetchInterval: 5000, queryKey: getGetTaDeskQueryKey(roomCode) },
  });

  const refreshDesk = () => {
    queryClient.invalidateQueries({ queryKey: getGetTaDeskQueryKey(roomCode) });
    onRefreshQuestions();
  };

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/ta/me'] });
        toast({ title: 'Logged out' });
      },
    });
  };

  return (
    <aside className="hidden lg:flex flex-col gap-5 pt-1">
      {/* Desk header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="uppercase tracking-[0.16em] text-primary text-[8px] font-black">TA Desk</span>
          <p className="font-serif font-normal text-[20px] leading-none mt-1">{taName}</p>
        </div>
        <button onClick={handleLogout}
          className="text-[8px] uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors mt-1">
          Log out
        </button>
      </div>

      {/* My Claims */}
      <DeskSection title="My Claims">
        {!desk || desk.myClaims.length === 0 ? (
          <EmptySlot label="No active claims" />
        ) : (
          desk.myClaims.map((q, i) => (
            <DeskCard key={q.id} title={q.title} accent="primary" index={i}>
              <div className="flex flex-wrap gap-2 mt-3">
                <MiniButton onClick={() => release.mutate({ id: q.id }, { onSuccess: refreshDesk })}>
                  Release
                </MiniButton>
                <MiniButton filled onClick={() => resolve.mutate({ id: q.id }, {
                  onSuccess: () => { toast({ title: 'Resolved ✓' }); refreshDesk(); }
                })}>
                  ✓ Resolve
                </MiniButton>
                {!q.isInLiveQueue && (
                  <MiniButton onClick={() => sendLive.mutate({ id: q.id }, {
                    onSuccess: () => { toast({ title: 'Sent to Live Queue' }); refreshDesk(); }
                  })}>
                    Send live
                  </MiniButton>
                )}
              </div>
            </DeskCard>
          ))
        )}
      </DeskSection>

      {/* Needs a TA */}
      <DeskSection title="Needs a TA">
        {!desk || desk.needsATa.length === 0 ? (
          <EmptySlot label="All caught up" />
        ) : (
          desk.needsATa.slice(0, 4).map((q, i) => (
            <DeskCard key={q.id} title={q.title} accent="destructive" index={i}>
              <div className="flex gap-2 mt-3">
                <MiniButton filled onClick={() => claim.mutate({ id: q.id }, { onSuccess: refreshDesk })}>
                  Claim
                </MiniButton>
                <MiniButton onClick={() => resolve.mutate({ id: q.id }, {
                  onSuccess: () => { toast({ title: 'Resolved ✓' }); refreshDesk(); }
                })}>
                  ✓ Resolve
                </MiniButton>
              </div>
            </DeskCard>
          ))
        )}
      </DeskSection>

      {/* Live queue count */}
      {(desk?.liveQueue?.length ?? 0) > 0 && (
        <div className="p-4 border border-dashed border-primary/30 rounded-lg text-center bg-[rgba(44,114,93,0.03)]">
          <strong className="block font-serif font-normal text-[36px] leading-none text-primary">
            {desk!.liveQueue.length}
          </strong>
          <span className="text-[8px] uppercase tracking-[0.1em] text-muted-foreground font-black">in live queue</span>
        </div>
      )}
    </aside>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function DeskSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[8px] uppercase tracking-widest font-black text-muted-foreground">{title}</span>
      {children}
    </div>
  );
}

function DeskCard({ title, accent, index, children }: {
  title: string; accent: string; index: number; children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0, rotate: (index - 0.5) * 0.5 }}
      transition={{ delay: index * 0.04 }}
      className={`p-3 border border-border border-l-[3px] border-l-${accent} rounded-[4px_8px_8px_4px] bg-[#faf4e7] shadow-[0_5px_10px_rgba(58,55,43,0.07)]`}
    >
      <b className="block font-serif font-normal text-[13px] leading-[1.25] line-clamp-2">{title}</b>
      {children}
    </motion.div>
  );
}

function MiniButton({ children, onClick, filled }: {
  children: React.ReactNode; onClick?: () => void; filled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-[5px] rounded-full text-[7px] uppercase tracking-[0.09em] border border-border transition-colors
        ${filled ? 'bg-foreground text-background hover:opacity-80' : 'bg-transparent text-primary hover:bg-white/60'}`}
    >
      {children}
    </button>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div className="p-3 border border-dashed border-border rounded-lg text-center text-[8px] uppercase tracking-widest text-muted-foreground">
      {label}
    </div>
  );
}
