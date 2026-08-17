import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useDisplayName } from '@/hooks/use-display-name';
import { useTaLogin } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export function LandingPage() {
  const [, setLocation] = useLocation();
  const [roomCode, setRoomCode] = useState('');
  const { name, setName } = useDisplayName();

  // Card flip state
  const [flipped, setFlipped] = useState(false);

  // TA login state
  const [taName, setTaName] = useState('');
  const [taPassword, setTaPassword] = useState('');
  const [taError, setTaError] = useState('');
  const login = useTaLogin();
  const queryClient = useQueryClient();

  const handleJoin = (e: React.FormEvent, code?: string) => {
    e.preventDefault();
    const target = (code ?? roomCode).trim().toUpperCase();
    if (!target || !name.trim()) return;
    setName(name.trim());
    setLocation(`/room/${target}`);
  };

  const handleTaLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setTaError('');
    login.mutate({ data: { name: taName, password: taPassword } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/ta/me'] });
        setLocation('/ta');
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        const msg = err?.response?.data?.error;
        setTaError(msg || 'Invalid credentials.');
      },
    });
  };

  const flip = () => {
    setFlipped(v => !v);
    setTaError('');
  };

  const canJoin = roomCode.trim().length > 0 && name.trim().length > 0;
  const canQuickJoin = name.trim().length > 0;

  return (
    <main className="world flex flex-col items-center justify-center p-6 text-center min-h-[100dvh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.18, 0.75, 0.2, 1] }}
        className="max-w-md w-full relative z-10"
      >
        {/* Logo */}
        <div className="uppercase tracking-[0.2em] text-[10px] font-[850] mb-4 flex items-center justify-center">
          <span className="w-[9px] h-[9px] mr-2 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--background)),0_0_0_4px_hsl(var(--primary))]" />
          /Curie
        </div>

        {/* Title crossfades on flip */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={flipped ? 'ta' : 'student'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="font-serif text-4xl md:text-5xl leading-tight tracking-tight mb-8"
          >
            {flipped ? 'TA sign-in.' : 'Pull up a chair.'}
          </motion.h1>
        </AnimatePresence>

        {/* ── 3-D FLIP CARD ── */}
        <div style={{ perspective: '1200px' }}>
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.65, ease: [0.18, 0.75, 0.2, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
            className="grid"
          >
            {/* FRONT — student join */}
            <form
              onSubmit={handleJoin}
              style={{ backfaceVisibility: 'hidden', gridArea: '1 / 1' }}
              className="relative border border-[rgba(65,55,40,0.16)] border-l-[6px] border-l-destructive rounded-[5px_17px_17px_6px] composer-bg shadow-[0_24px_48px_rgba(61,55,41,0.15),0_4px_9px_rgba(61,55,41,0.08)] p-6 md:p-8"
            >
              <span
                className="absolute w-[95px] h-[24px] left-1/2 -top-[8px] -translate-x-1/2 -rotate-[1.4deg] bg-[rgba(211,195,152,0.69)] shadow-[0_1px_2px_rgba(70,59,41,0.1)]"
                aria-hidden="true"
              />

              <label className="block text-left uppercase tracking-[0.15em] text-[#a9543e] text-[8px] font-black mb-4">
                Take a seat
              </label>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    autoComplete="name"
                    className="w-full border-0 border-b border-[rgba(33,49,43,0.24)] bg-transparent py-2 px-1 font-serif text-xl outline-none placeholder:text-[rgba(23,49,58,0.36)]"
                  />
                  {!name.trim() && (
                    <span className="text-[9px] text-[#a9543e] tracking-wide">
                      Required — your name appears on every question you ask
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={roomCode}
                    onChange={e => setRoomCode(e.target.value)}
                    placeholder="Room code — e.g. AGENTS-W4"
                    autoComplete="off"
                    className="flex-1 min-w-0 border-0 border-b border-[rgba(33,49,43,0.24)] bg-transparent py-2 px-1 font-serif text-xl outline-none placeholder:text-[rgba(23,49,58,0.36)] uppercase"
                  />
                  <button
                    type="submit"
                    disabled={!canJoin}
                    className="dark-button mt-4 sm:mt-0 whitespace-nowrap self-end sm:self-auto py-3 sm:py-0 disabled:opacity-40"
                  >
                    Join the table <b>→</b>
                  </button>
                </div>
              </div>
            </form>

            {/* BACK — TA login */}
            <form
              onSubmit={handleTaLogin}
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                gridArea: '1 / 1',
              }}
              className="relative border border-[rgba(65,55,40,0.16)] border-l-[6px] border-l-primary rounded-[5px_17px_17px_6px] composer-bg shadow-[0_24px_48px_rgba(61,55,41,0.15),0_4px_9px_rgba(61,55,41,0.08)] p-6 md:p-8 text-left"
            >
              <span
                className="absolute w-[95px] h-[24px] left-1/2 -top-[8px] -translate-x-1/2 rotate-[1.4deg] bg-[rgba(211,195,152,0.69)] shadow-[0_1px_2px_rgba(70,59,41,0.1)]"
                aria-hidden="true"
              />

              <label className="block uppercase tracking-[0.15em] text-primary text-[8px] font-black mb-5">
                TA credentials
              </label>

              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  value={taName}
                  onChange={e => setTaName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  required
                  className="w-full border-0 border-b border-[rgba(33,49,43,0.24)] bg-transparent py-2 px-1 font-serif text-xl outline-none placeholder:text-[rgba(23,49,58,0.36)]"
                />
                <input
                  type="password"
                  value={taPassword}
                  onChange={e => setTaPassword(e.target.value)}
                  placeholder="TA password"
                  autoComplete="current-password"
                  required
                  className="w-full border-0 border-b border-[rgba(33,49,43,0.24)] bg-transparent py-2 px-1 font-serif text-xl outline-none placeholder:text-[rgba(23,49,58,0.36)]"
                />

                <AnimatePresence>
                  {taError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] text-destructive tracking-wide"
                    >
                      {taError}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={login.isPending || !taName.trim() || !taPassword.trim()}
                  className="dark-button mt-1 w-full py-3 disabled:opacity-40"
                >
                  {login.isPending ? 'Signing in…' : 'Sign in to TA desk →'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Quick join — hidden when flipped */}
        <AnimatePresence>
          {!flipped && (
            <motion.div
              initial={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-12 flex flex-col items-center gap-3 overflow-hidden"
            >
              <span className="uppercase tracking-[0.1em] text-[9px] text-muted-foreground">Quick join</span>
              <button
                onClick={e => handleJoin(e as unknown as React.FormEvent, 'AGENTS-W4')}
                disabled={!canQuickJoin}
                className="border border-border rounded-full px-6 py-2 text-[10px] uppercase tracking-widest bg-[rgba(255,255,255,0.4)] hover:bg-foreground hover:text-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                AGENTS-W4
              </button>
              {!canQuickJoin && (
                <span className="text-[9px] text-muted-foreground">Enter your name above first</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* TA sign-in / back button */}
        <div className="mt-10 flex flex-col items-center">
          <button
            onClick={flip}
            className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            {flipped ? '← Back to student join' : 'Sign in as TA →'}
          </button>
        </div>
      </motion.div>
    </main>
  );
}
