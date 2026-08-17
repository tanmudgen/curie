import { useState } from 'react';
import { useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useGetTaMe,
  useGetTaDesk,
  useTaLogin,
  useTaLogout,
  useClaimQuestion,
  useReleaseQuestion,
  useSendToLiveQueue,
  getGetTaDeskQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetRoom } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

export function TaPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { data: room } = useGetRoom(roomCode!);
  const { data: taMe, isLoading: meLoading } = useGetTaMe({
    query: { retry: false },
  });
  const isTa = taMe?.loggedIn;

  return (
    <main className="world min-h-[100dvh] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/40">
        <div className="flex items-center gap-2 uppercase tracking-[0.18em] text-[9px] font-[850]">
          <span className="w-[8px] h-[8px] rounded-full bg-primary shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_3px_hsl(var(--primary))]" />
          Cohort Table
        </div>
        {room && (
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
            {room.code}
          </span>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {meLoading ? (
          <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
        ) : isTa ? (
          <TaDeskView roomCode={roomCode!} taName={taMe!.taName} />
        ) : (
          <TaLoginForm roomCode={roomCode!} />
        )}
      </div>
    </main>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────

function TaLoginForm({ roomCode }: { roomCode: string }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const login = useTaLogin();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState('');

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
      }
    });
  };

  const canSubmit = name.trim().length > 0 && password.length > 0;

  return (
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

        <label className="block uppercase tracking-[0.15em] text-primary text-[8px] font-black mb-5">
          TA Credentials
        </label>

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
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-destructive tracking-wide -mt-2"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={!canSubmit || login.isPending}
            className="dark-button py-3 mt-2 disabled:opacity-40"
          >
            {login.isPending ? 'Signing in…' : 'Sign in →'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

// ── Desk view ─────────────────────────────────────────────────────────────────

function TaDeskView({ roomCode, taName }: { roomCode: string; taName: string }) {
  const logout = useTaLogout();
  const claim = useClaimQuestion();
  const release = useReleaseQuestion();
  const sendLive = useSendToLiveQueue();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: desk } = useGetTaDesk(roomCode, {
    query: {
      refetchInterval: 6000,
      queryKey: getGetTaDeskQueryKey(roomCode),
    },
  });

  const refreshDesk = () => {
    queryClient.invalidateQueries({ queryKey: getGetTaDeskQueryKey(roomCode) });
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-4xl"
    >
      {/* Desk header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="uppercase tracking-[0.16em] text-primary text-[8px] font-black">TA Desk</span>
          <h2 className="font-serif font-normal text-[28px] leading-none tracking-[-0.03em] mt-1">
            Hey, {taName}.
          </h2>
        </div>
        <button
          onClick={handleLogout}
          className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
        >
          Log out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* My Claims */}
        <Section title="My Claims" accent="primary">
          {desk?.myClaims.length === 0 ? (
            <EmptyState label="No active claims" />
          ) : (
            desk?.myClaims.map((q, i) => (
              <DeskCard key={q.id} title={q.title} badge="Claimed" badgeColor="primary" index={i}>
                <div className="flex gap-2 mt-3">
                  <ActionButton onClick={() => release.mutate({ id: q.id }, { onSuccess: refreshDesk })}>
                    Release
                  </ActionButton>
                  {!q.isInLiveQueue && (
                    <ActionButton
                      filled
                      onClick={() =>
                        sendLive.mutate({ id: q.id }, {
                          onSuccess: () => { toast({ title: 'Sent to Live Queue' }); refreshDesk(); },
                        })
                      }
                    >
                      Send Live
                    </ActionButton>
                  )}
                </div>
              </DeskCard>
            ))
          )}
        </Section>

        {/* Needs a TA */}
        <Section title="Needs a TA" accent="destructive">
          {desk?.needsATa.length === 0 ? (
            <EmptyState label="All caught up" />
          ) : (
            desk?.needsATa.slice(0, 5).map((q, i) => (
              <DeskCard key={q.id} title={q.title} badge="Unanswered" badgeColor="destructive" index={i}>
                <div className="mt-3">
                  <ActionButton onClick={() => claim.mutate({ id: q.id }, { onSuccess: refreshDesk })}>
                    Claim
                  </ActionButton>
                </div>
              </DeskCard>
            ))
          )}
        </Section>

        {/* Live Queue + Groups */}
        <div className="flex flex-col gap-6">
          {(desk?.liveQueue?.length ?? 0) > 0 && (
            <Section title="Live Queue" accent="primary">
              <div className="p-5 border border-dashed border-primary/30 rounded-lg text-center bg-[rgba(44,114,93,0.03)]">
                <strong className="block font-serif font-normal text-[48px] leading-none text-primary">
                  {desk!.liveQueue.length}
                </strong>
                <span className="text-[8px] uppercase tracking-[0.1em] text-muted-foreground font-black">
                  in queue
                </span>
              </div>
            </Section>
          )}

          {(desk?.questionGroups?.length ?? 0) > 0 && (
            <Section title="Groups" accent="accent">
              {desk!.questionGroups.map((g) => (
                <DeskCard key={g.id} title={g.title} badge={`${g.questionCount} questions`} badgeColor="muted" index={0} />
              ))}
            </Section>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className={`text-[8px] uppercase tracking-widest font-black text-${accent}`}>{title}</span>
      {children}
    </div>
  );
}

function DeskCard({
  title, badge, badgeColor, index, children,
}: {
  title: string; badge: string; badgeColor: string; index: number; children?: React.ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0, rotate: (index - 0.5) * 0.6 }}
      transition={{ delay: index * 0.04 }}
      className={`p-4 border border-border border-l-[4px] border-l-${badgeColor} rounded-[5px_9px_9px_5px] bg-[#faf4e7] shadow-[0_8px_14px_rgba(58,55,43,0.07)]`}
    >
      <span className={`text-[7px] uppercase tracking-[0.1em] text-${badgeColor} font-black`}>{badge}</span>
      <b className="block font-serif font-normal text-[15px] leading-[1.25] mt-1 line-clamp-3">{title}</b>
      {children}
    </motion.article>
  );
}

function ActionButton({ children, onClick, filled }: { children: React.ReactNode; onClick?: () => void; filled?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-full text-[7px] uppercase tracking-[0.09em] border border-border transition-colors
        ${filled
          ? 'bg-foreground text-background hover:opacity-80'
          : 'bg-transparent text-primary hover:bg-white/40'}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="p-4 border border-dashed border-border rounded-lg text-center text-[9px] uppercase tracking-widest text-muted-foreground">
      {label}
    </div>
  );
}
