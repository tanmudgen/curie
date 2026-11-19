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
  getGetTaMeQueryKey,
  useTaLogin,
  useTaLogout,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDeviceId } from '@/hooks/use-device-id';
import { BrandLogo } from '@/components/brand-logo';
import { RoomHeader } from '@/components/room/room-header';
import { PulseCard } from '@/components/room/pulse-card';
import { QuestionComposer } from '@/components/room/question-composer';
import { FilterTabs } from '@/components/room/filter-tabs';
import { QuestionCard } from '@/components/room/question-card';
import { SpotlightModal } from '@/components/room/spotlight-modal';
import { useToast } from '@/hooks/use-toast';

// ── Root: gate on auth ────────────────────────────────────────────────────────

export function TaPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { data: taMe, isLoading: meLoading } = useGetTaMe({ query: { retry: false, queryKey: getGetTaMeQueryKey() } });

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
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <BrandLogo className="w-[125px]" />
        <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground font-bold">{roomCode}</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.18, 0.75, 0.2, 1] }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <span className="inline-block font-mono uppercase tracking-wider text-xs font-semibold text-primary mb-3">
              TA Desk · {roomCode}
            </span>
            <h1 className="font-sans text-4xl font-semibold tracking-tight">Sign in to your desk.</h1>
          </div>

          <form
            onSubmit={handleLogin}
            className="relative border border-border border-t-[5px] border-t-accent rounded-xl composer-bg shadow-sm p-8"
          >
            <label className="block font-mono uppercase tracking-wider text-primary text-[11px] font-semibold mb-5">TA Credentials</label>

            <div className="flex flex-col gap-5">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                aria-label="Your name"
                placeholder="Your name"
                autoComplete="name"
                required
                className="w-full border-0 border-b border-input bg-transparent py-2 px-1 font-sans text-xl outline-none focus:border-primary placeholder:text-muted-foreground"
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                aria-label="TA password"
                placeholder="TA password"
                autoComplete="current-password"
                required
                className="w-full border-0 border-b border-input bg-transparent py-2 px-1 font-sans text-xl outline-none focus:border-primary placeholder:text-muted-foreground"
              />
              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-sm text-destructive tracking-wide -mt-2">
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
  const [spotlightedId, setSpotlightedId] = useState<number | null>(null);
  const [spotlightOrigin, setSpotlightOrigin] = useState<DOMRect | null>(null);
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mr-1">
            TA · {taName}
          </span>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="text-[11px] font-mono uppercase tracking-wide border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
          >
            {downloading ? 'Exporting…' : '↓ Export'}
          </button>
          <button
            onClick={handleLogout}
            className="text-[11px] font-mono uppercase tracking-wide border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
          >
            Log out
          </button>
        </div>
      } />

      <section className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-6 px-4 pt-6 pb-16 sm:px-8 lg:grid-cols-[minmax(200px,248px)_minmax(0,1fr)] lg:gap-10 lg:pt-10">

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
                  isSpotlighted={spotlightedId === q.id}
                  onSpotlight={(rect) => {
                    if (spotlightedId === q.id) {
                      setSpotlightedId(null);
                    } else {
                      setSpotlightedId(q.id);
                      setSpotlightOrigin(rect);
                    }
                  }}
                />
              ))}
            </AnimatePresence>
            {questions?.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-8 text-center text-muted-foreground text-sm font-mono uppercase tracking-wide border border-dashed border-border rounded-lg bg-card">
                No questions on the table.
              </motion.div>
            )}
          </div>
        </section>
      </section>

      <SpotlightModal
        question={spotlightedId !== null ? (questions?.find(q => q.id === spotlightedId) ?? null) : null}
        originRect={spotlightOrigin}
        onClose={() => setSpotlightedId(null)}
      />
    </main>
  );
}
