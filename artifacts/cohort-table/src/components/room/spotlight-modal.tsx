import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Question } from '@workspace/api-client-react';
import { formatDistanceToNow } from 'date-fns';

const SPRING = { type: 'spring', stiffness: 300, damping: 30, mass: 1 } as const;

interface SpotlightModalProps {
  question: Question | null;
  originRect: DOMRect | null;
  onClose: () => void;
}

export function SpotlightModal({ question, originRect, onClose }: SpotlightModalProps) {
  const open = question !== null && originRect !== null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <SpotlightContent
          key={question!.id}
          question={question!}
          originRect={originRect!}
          onClose={onClose}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}

function SpotlightContent({
  question,
  originRect,
  onClose,
}: {
  question: Question;
  originRect: DOMRect;
  onClose: () => void;
}) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const targetW = Math.min(780, vw * 0.9);
  const targetLeft = (vw - targetW) / 2;
  const targetTop = Math.max(32, Math.min((vh - 560) / 2, vh * 0.12));

  let accentColor = 'var(--coral)';
  if (question.status === 'answered') accentColor = 'var(--green)';
  else if (question.risingScore && question.risingScore > 10) accentColor = 'var(--gold)';

  const timeAgo = formatDistanceToNow(new Date(question.createdAt), { addSuffix: true });

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[90] bg-[rgba(28,22,11,0.62)]"
        style={{ backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />

      {/* Card shell — flies from list position to center */}
      <motion.div
        key="card"
        initial={{
          top: originRect.top,
          left: originRect.left,
          width: originRect.width,
        }}
        animate={{
          top: targetTop,
          left: targetLeft,
          width: targetW,
        }}
        exit={{
          top: originRect.top,
          left: originRect.left,
          width: originRect.width,
          opacity: 0,
        }}
        transition={SPRING}
        style={{
          position: 'fixed',
          zIndex: 91,
          maxHeight: `${vh - targetTop - 40}px`,
          overflow: 'auto',
        }}
        className="card-bg rounded-[9px_22px_20px_7px] border border-[rgba(23,49,58,0.2)] shadow-[0_48px_96px_rgba(28,22,11,0.38),0_12px_28px_rgba(28,22,11,0.22)]"
      >
        {/* Content fades in once the card starts moving */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, delay: 0.06 }}
          className="grid grid-cols-[90px_1fr] min-h-0"
        >
          {/* Vote column */}
          <div className="border-r border-border bg-[rgba(222,213,195,0.38)] flex flex-col items-center justify-start pt-8 p-4 shrink-0">
            <div
              className={`w-[58px] h-[72px] border rounded-[50%_50%_10px_10px] flex flex-col items-center justify-center shadow-[0_6px_12px_rgba(58,55,43,0.1)]
                ${question.viewerVoted
                  ? 'bg-primary text-[#fff8e9] border-primary'
                  : 'bg-[#faf4e6] text-primary border-[rgba(44,114,93,0.3)]'}`}
            >
              <span className="text-[15px] leading-none mb-[3px]">↑</span>
              <strong className="font-serif font-normal text-[30px] leading-none">{question.voteCount}</strong>
            </div>
            <small className="mt-[10px] text-[7px] uppercase tracking-[0.09em] text-muted-foreground text-center leading-[1.3]">
              votes
            </small>
          </div>

          {/* Content column */}
          <div
            className="p-[26px_32px_28px] border-t-[7px] relative"
            style={{ borderTopColor: accentColor }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-5 w-7 h-7 rounded-full border border-border/60 text-muted-foreground hover:border-destructive hover:text-destructive transition-colors text-[16px] leading-none flex items-center justify-center"
              aria-label="Close spotlight"
            >
              ×
            </button>

            {/* Status / meta */}
            <div className="text-[8px] uppercase tracking-[0.1em] text-muted-foreground mb-3 flex items-center gap-2 flex-wrap">
              <b style={{ color: accentColor }}>
                {question.status === 'answered'
                  ? 'Answered'
                  : question.risingScore && question.risingScore > 10
                  ? 'Rising'
                  : 'Unanswered'}
              </b>
              <span>·</span>
              <span>asked by {question.authorLabel}</span>
              <span>·</span>
              <span>{timeAgo}</span>
              {question.followCount > 0 && (
                <>
                  <span>·</span>
                  <span>{question.followCount} following</span>
                </>
              )}
            </div>

            {/* Big title */}
            <h2
              className="font-serif font-normal leading-[1.05] tracking-[-0.03em] mt-[8px] mb-[18px]"
              style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
            >
              {question.title}
            </h2>

            {/* Body */}
            {question.body && (
              <p className="text-[13px] leading-[1.7] text-muted-foreground mb-6 max-w-[560px]">
                {question.body}
              </p>
            )}

            {/* Tags */}
            {question.tags && question.tags.length > 0 && (
              <div className="flex gap-[6px] flex-wrap mb-5">
                {question.tags.map(tag => (
                  <span
                    key={tag}
                    className="border border-border rounded-full px-[10px] py-[5px] text-[8px] uppercase tracking-[0.08em] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-[14px] border-t border-border/50">
              {question.claimedByTa && (
                <span className="text-[8px] uppercase tracking-widest text-destructive font-black border border-destructive px-2 py-1 rounded-[2px] transform -rotate-1">
                  {question.status === 'answered' ? 'Resolved' : `Claimed · ${question.claimedByTa}`}
                </span>
              )}
              <button
                onClick={onClose}
                className="ml-auto text-[7px] uppercase tracking-widest text-muted-foreground border border-border rounded-full px-[10px] py-[4px] hover:border-primary hover:text-primary transition-colors"
              >
                ↩ Back to queue
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
