import { questionStatus } from './question-status';
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

  const timeAgo = formatDistanceToNow(new Date(question.createdAt), { addSuffix: true });
  const status = questionStatus(question);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[90] bg-foreground/60"
        style={{ backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />

      {/* Card shell — flies from list position to center */}
      <motion.div
        key="card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="spotlight-title"
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
        className="card-bg rounded-xl border border-border shadow-2xl"
      >
        {/* Content fades in once the card starts moving */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, delay: 0.06 }}
          className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[78px_minmax(0,1fr)] min-h-0"
        >
          {/* Vote column */}
          <div className="border-r border-border bg-[var(--brand-paper)] flex flex-col items-center justify-start px-1 py-6 sm:px-3 shrink-0">
            <div
              className={`w-10 h-14 sm:w-12 sm:h-16 border rounded-md flex flex-col items-center justify-center shadow-sm
                ${question.viewerVoted
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-primary border-input'}`}
            >
              <span className="text-[15px] leading-none mb-[3px]">↑</span>
              <strong className="font-sans font-semibold text-[30px] leading-none">{question.voteCount}</strong>
            </div>
            <small className="mt-[10px] text-[11px] font-mono uppercase tracking-wide text-muted-foreground text-center leading-[1.3]">
              votes
            </small>
          </div>

          {/* Content column */}
          <div
            className="p-4 sm:p-7 border-t-4 relative"
            style={{ borderTopColor: status.color }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors text-[16px] leading-none flex items-center justify-center"
              aria-label="Close spotlight"
            >
              ×
            </button>

            {/* Status / meta */}
            <div className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground pr-8 mb-3 flex items-center gap-2 flex-wrap">
              <b className="text-foreground">{status.label}</b>
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
              id="spotlight-title"
              className="font-sans font-semibold break-words leading-tight tracking-[-0.03em] mt-[8px] mb-[18px]"
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
                    className="border border-border rounded-full px-[10px] py-[5px] text-[11px] font-mono uppercase tracking-wide text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-[14px] border-t border-border">
              {question.claimedByTa && (
                <span className="text-[11px] font-mono uppercase tracking-wide text-destructive font-semibold border border-destructive px-2 py-1 rounded-[2px] ">
                  {question.status === 'answered' ? 'Resolved' : `Claimed · ${question.claimedByTa}`}
                </span>
              )}
              <button
                onClick={onClose}
                className="ml-auto text-[11px] font-mono uppercase tracking-wide text-muted-foreground border border-border rounded-full px-[10px] py-[4px] hover:border-primary hover:text-primary transition-colors"
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
