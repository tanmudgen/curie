import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useGetRoom,
  useGetRoomPulse,
  useListQuestions,
  ListQuestionsView,
  getGetRoomPulseQueryKey,
  getListQuestionsQueryKey,
  useGetTaMe,
  useTaLogin,
  useTaLogout,
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

  if (meLoading) {
    return (
      <main className="world flex items-center justify-center min-h-[100dvh]">
        <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
      </main>
    );
  }

  if (!taMe?.loggedIn) {
    return <TaLoginPage roomCode={roomCode!} />;
  }

  return <TaRoomPage roomCode={roomCode!} taName={taMe.taName} />;
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
          /Curie
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
  const queryClient = useQueryClient();
  const logout = useTaLogout();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: room, isLoading: roomLoading } = useGetRoom(roomCode);
  const { data: pulse } = useGetRoomPulse(roomCode, {
    query: { refetchInterval: 10000, queryKey: getGetRoomPulseQueryKey(roomCode) },
  });
  const { data: questions, refetch: refetchQuestions } = useListQuestions(
    roomCode,
    { view: filter, deviceId },
    { query: { refetchInterval: 4000, queryKey: getListQuestionsQueryKey(roomCode, { view: filter, deviceId }) } },
  );

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/ta/me'] });
        setLocation('/');
      },
    });
  };

  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/ta/rooms/${roomCode}/export`, { credentials: 'include' });
      if (!res.ok) { toast({ title: 'Export failed', variant: 'destructive' }); return; }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `cohort-${roomCode}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
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
      <RoomHeader room={room} extra={
        <div className="flex items-center gap-2">
          <span className="text-[8px] uppercase tracking-widest text-muted-foreground mr-1">
            TA · {taName}
          </span>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="text-[8px] uppercase tracking-widest border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
          >
            {downloading ? 'Exporting…' : '↓ Export'}
          </button>
          <button
            onClick={handleLogout}
            className="text-[8px] uppercase tracking-widest border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
          >
            Log out
          </button>
        </div>
      } />

      <section className="w-[min(1100px,95vw)] m-auto grid grid-cols-1 lg:grid-cols-[minmax(180px,210px)_minmax(0,790px)] justify-center gap-[clamp(22px,3vw,48px)] p-[22px_0_70px] lg:p-[36px_0_70px] max-w-[1100px]">

        <PulseCard pulse={pulse} roomCode={roomCode} />

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
                  onTaAction={refetchQuestions}
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
      </section>
    </main>
  );
}
