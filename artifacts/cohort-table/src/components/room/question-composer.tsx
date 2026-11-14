import { useState, useEffect, useRef } from 'react';
import { useCreateQuestion } from '@workspace/api-client-react';
import { useDeviceId } from '@/hooks/use-device-id';
import { useDisplayName } from '@/hooks/use-display-name';
import { useParticipants } from '@/hooks/use-participants';
import { useToast } from '@/hooks/use-toast';
import { MentionInput } from './mention-input';
import { motion, AnimatePresence } from 'framer-motion';
import { countWords, MAX_CONTENT_WORDS } from '@/lib/word-count';

interface SimilarQuestion { id: number; title: string }

export function QuestionComposer({ roomCode, onSuccess }: { roomCode: string, onSuccess: () => void }) {
  const deviceId = useDeviceId();
  const { name: authorName } = useDisplayName();
  const participants = useParticipants(roomCode);
  const { toast } = useToast();
  const createQuestion = useCreateQuestion();

  const [title, setTitle] = useState('');
  const [similar, setSimilar] = useState<SimilarQuestion[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced similarity check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (title.trim().length < 6) { setSimilar([]); setDismissed(false); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        const base = import.meta.env.BASE_URL.replace(/\/$/, '');
        const res = await fetch(`${base}/api/rooms/${roomCode}/similar-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: title.trim() }),
        });
        if (res.ok) {
          const data: SimilarQuestion[] = await res.json();
          setSimilar(data);
          setDismissed(false);
        }
      } catch { /* ignore */ }
    }, 550);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title, roomCode]);

  const showSimilar = similar.length > 0 && !dismissed;
  const wordCount = countWords(title);
  const tooManyWords = wordCount > MAX_CONTENT_WORDS;

  const submit = () => {
    if (!title.trim()) return;
    if (tooManyWords) {
      toast({ title: `Questions are limited to ${MAX_CONTENT_WORDS} words`, variant: 'destructive' });
      return;
    }
    createQuestion.mutate({
      roomCode,
      data: { title: title.trim(), deviceId, isAnonymous: false, authorName },
    }, {
      onSuccess: () => {
        setTitle('');
        setSimilar([]);
        setDismissed(false);
        toast({ title: 'Your question landed on the table' });
        onSuccess();
      },
      onError: () => {
        toast({ title: 'Failed to post question', variant: 'destructive' });
      },
    });
  };

  return (
    <motion.form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 12, delay: 0.1 }}
      className="relative border border-border border-t-[5px] border-t-[var(--brand-purple)] rounded-xl composer-bg shadow-sm p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <span className="font-mono uppercase tracking-wider text-foreground text-[11px] font-semibold">Put a question on the table</span>
        <small className="text-muted-foreground text-xs">
          Asking as <span className="font-semibold text-foreground">{authorName}</span>
        </small>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-[10px] items-start">
        <MentionInput
          value={title}
          onChange={setTitle}
          participants={participants}
          placeholder="What are you stuck on?"
          onSubmit={submit}
          className="min-w-0 w-full border-0 border-b border-input bg-transparent p-[10px_2px_12px] font-sans font-semibold text-[20px] md:text-[24px] leading-[1.2] text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={createQuestion.isPending || tooManyWords}
          className="dark-button py-3 md:py-0 h-full min-h-[44px] disabled:opacity-50"
        >
          Ask the room <b>→</b>
        </button>
      </div>

      <div className={`mt-2 text-right text-[11px] font-mono uppercase tracking-wide ${tooManyWords ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
        {wordCount}/{MAX_CONTENT_WORDS} words{tooManyWords && ' · limit reached'}
      </div>

      {/* Similar questions panel */}
      <AnimatePresence>
        {showSimilar && (
          <motion.div
            key="similar"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-foreground flex items-center gap-1.5">
                  <span>⚠</span> Similar questions already on the table
                </span>
                <button
                  type="button"
                  aria-label="Dismiss similar questions"
                  onClick={() => setDismissed(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>
              <ul className="flex flex-col gap-1.5">
                {similar.map((q) => (
                  <li key={q.id}>
                    <a
                      href={`#question-${q.id}`}
                      onClick={() => {
                        const el = document.getElementById(`question-${q.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="block text-[13px] font-sans text-foreground/80 leading-snug pl-2 border-l-2 border-accent hover:text-primary hover:border-primary transition-colors cursor-pointer underline-offset-2 hover:underline"
                    >
                      {q.title}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-xs text-muted-foreground">
                Vote or follow those instead — or post if your question is different.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.form>
  );
}
