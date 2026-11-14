import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Question, 
  useVoteQuestion, 
  useUnvoteQuestion,
  useFollowQuestion,
  useUnfollowQuestion,
  useClaimQuestion,
  useReleaseQuestion,
  useResolveQuestion,
  useUnresolveQuestion,
  useGetQuestion,
  useCreateReply,
  useMarkReplyHelpful,
  useUnmarkReplyHelpful,
  getGetQuestionQueryKey
} from '@workspace/api-client-react';
import { useDeviceId } from '@/hooks/use-device-id';
import { useDisplayName } from '@/hooks/use-display-name';
import { useParticipants } from '@/hooks/use-participants';
import { useToast } from '@/hooks/use-toast';
import { countWords, MAX_CONTENT_WORDS } from '@/lib/word-count';
import { questionStatus } from './question-status';
import { MentionInput } from './mention-input';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

const SPRING = { type: 'spring', stiffness: 90, damping: 16, mass: 1.1 } as const;

export function QuestionCard({
  question, index, roomCode, isTaMode, onTaAction, isSpotlighted, onSpotlight,
}: {
  question: Question;
  index: number;
  roomCode: string;
  isTaMode?: boolean;
  onTaAction?: () => void;
  isSpotlighted?: boolean;
  onSpotlight?: (rect: DOMRect) => void;
}) {
  const articleRef = useRef<HTMLElement>(null);
  const deviceId = useDeviceId();
  const { name: displayName } = useDisplayName();
  const participants = useParticipants(roomCode);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const vote = useVoteQuestion();
  const unvote = useUnvoteQuestion();
  const follow = useFollowQuestion();
  const unfollow = useUnfollowQuestion();
  const claim = useClaimQuestion();
  const release = useReleaseQuestion();
  const resolve = useResolveQuestion();
  const unresolve = useUnresolveQuestion();

  const [optVote, setOptVote] = useState({ voted: !!question.viewerVoted, count: question.voteCount });
  const [optFollow, setOptFollow] = useState({ followed: !!question.viewerFollows, count: question.followCount });
  const [showReplies, setShowReplies] = useState(question.replyCount > 0);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const replyWordCount = countWords(replyBody);
  const replyTooLong = replyWordCount > MAX_CONTENT_WORDS;

  useEffect(() => {
    setOptVote({ voted: !!question.viewerVoted, count: question.voteCount });
  }, [question.voteCount, question.viewerVoted]);

  const { data: detail } = useGetQuestion(question.id, { deviceId }, {
    query: {
      enabled: showReplies,
      queryKey: getGetQuestionQueryKey(question.id, { deviceId }),
    },
  });

  const createReply = useCreateReply();
  const markHelpful = useMarkReplyHelpful();
  const unmarkHelpful = useUnmarkReplyHelpful();

  const deleteQuestion = useMutation({
    mutationFn: async () => {
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      const res = await fetch(`${base}/api/ta/questions/${question.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => { onTaAction?.(); },
  });


  const handleVote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (optVote.voted) {
      setOptVote(prev => ({ voted: false, count: prev.count - 1 }));
      unvote.mutate({ id: question.id, data: { deviceId } });
    } else {
      setOptVote(prev => ({ voted: true, count: prev.count + 1 }));
      vote.mutate({ id: question.id, data: { deviceId } });
    }
  };

  const handleFollow = () => {
    if (optFollow.followed) {
      setOptFollow(prev => ({ followed: false, count: prev.count - 1 }));
      unfollow.mutate({ id: question.id, data: { deviceId } });
    } else {
      setOptFollow(prev => ({ followed: true, count: prev.count + 1 }));
      follow.mutate({ id: question.id, data: { deviceId } });
    }
  };

  const refresh = () => {
    onTaAction?.();
    queryClient.invalidateQueries({ queryKey: [`/api/rooms/${roomCode}/questions`] });
    queryClient.invalidateQueries({ queryKey: getGetQuestionQueryKey(question.id, { deviceId }) });
  };
  const handleClaim = () => claim.mutate({ id: question.id }, { onSuccess: refresh });
  const handleRelease = () => release.mutate({ id: question.id }, { onSuccess: refresh });
  const handleResolve = () => resolve.mutate(
    { id: question.id, data: { deviceId } },
    {
      onSuccess: refresh,
      onError: () => toast({ title: 'Could not mark this question as resolved', variant: 'destructive' }),
    },
  );
  const handleUnresolve = () => unresolve.mutate(
    { id: question.id, data: { deviceId } },
    {
      onSuccess: refresh,
      onError: () => toast({ title: 'Could not reopen this question', variant: 'destructive' }),
    },
  );

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    } else {
      deleteQuestion.mutate();
    }
  };

  const handleSpotlight = () => {
    const rect = articleRef.current?.getBoundingClientRect();
    if (rect) onSpotlight?.(rect);
  };

  const submitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    if (replyTooLong) {
      toast({ title: `Replies are limited to ${MAX_CONTENT_WORDS} words`, variant: 'destructive' });
      return;
    }
    createReply.mutate(
      { id: question.id, data: { body: replyBody, deviceId, authorName: displayName || undefined } },
      {
        onSuccess: () => {
          setReplyBody('');
          setShowReplyForm(false);
          setShowReplies(true);
          queryClient.invalidateQueries({ queryKey: [`/api/questions/${question.id}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/rooms/${roomCode}/questions`] });
        },
      },
    );
  };

  const timeAgo = formatDistanceToNow(new Date(question.createdAt), { addSuffix: true });
  const status = questionStatus(question);

  return (
    <motion.article
      ref={articleRef as React.RefObject<HTMLElement>}
      id={`question-${question.id}`}
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{
        opacity: isSpotlighted ? 0 : 1,
        y: 0, scale: 1,
      }}
      transition={index === 0 ? SPRING : { ...SPRING, delay: Math.min(index * 0.07, 1) }}
      style={{ pointerEvents: isSpotlighted ? 'none' : 'auto' }}
      className="card-bg grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[68px_minmax(0,1fr)] border border-border rounded-xl shadow-sm overflow-hidden transition-shadow duration-300 hover:shadow-md"
    >
      {/* Vote column */}
      <div className="border-r border-border bg-[var(--brand-paper)] flex flex-col items-center justify-center px-1 py-3 sm:p-2">
        <motion.button
          onClick={handleVote}
          whileTap={{ scale: 0.9 }}
          className={`w-10 h-14 md:w-[46px] md:h-[58px] border rounded-md flex flex-col items-center justify-center shadow-sm transition-colors
            ${optVote.voted
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-primary border-input'
            }`}
          aria-label="Upvote question"
          aria-pressed={optVote.voted}
        >
          <span className="text-[14px] leading-none mb-1">↑</span>
          <strong className="font-sans font-semibold text-[20px] leading-none">{optVote.count}</strong>
        </motion.button>
        <small className="mt-[8px] text-[11px] font-mono uppercase tracking-wide text-muted-foreground">votes</small>
      </div>

      {/* Content column */}
      <div className="p-[15px_14px] md:p-[18px_20px_17px] border-t-[4px]" style={{ borderTopColor: status.color }}>
        <div className="flex justify-between gap-[12px] text-muted-foreground text-[11px] font-mono uppercase tracking-wide mb-2">
          <span className="break-words">
            <b className="text-foreground">{status.label}</b>
            {' · '}asked by {question.authorLabel}
            {question.viewerAsked && (
              <span className="ml-2 px-1 border border-border rounded bg-muted text-[11px]">You</span>
            )}
          </span>
          <span className="hidden sm:inline">{timeAgo}</span>
        </div>

        <h3 className="font-sans font-semibold text-[21px] md:text-[24px] break-words leading-tight tracking-tight m-[14px_0_9px]">
          {question.title}
        </h3>

        {question.body && (
          <p className="text-sm leading-[1.5] text-muted-foreground m-[0_0_14px]">
            {question.body}
          </p>
        )}

        {question.tags && question.tags.length > 0 && (
          <div className="flex gap-[6px] flex-wrap mb-4">
            {question.tags.map(tag => (
              <span key={tag} className="border border-border rounded-full px-[8px] py-[5px] text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Resolution controls: TAs can resolve any question; students can resolve their own. */}
        {(isTaMode || question.viewerAsked) && (
          <div className="flex items-center gap-[8px] mt-[10px] pt-[10px] border-t border-dashed border-border flex-wrap">
            {isTaMode && !question.isResolved && (
              <>
                {question.claimedByTa ? (
                  <button onClick={handleRelease} className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground hover:text-destructive transition-colors">
                    Release claim
                  </button>
                ) : (
                  <button onClick={handleClaim} className="text-[11px] font-mono uppercase tracking-wide font-bold text-primary hover:underline transition-colors">
                    Claim →
                  </button>
                )}
                {question.claimedByTa && (
                  <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                    Claimed by {question.claimedByTa}
                  </span>
                )}
              </>
            )}

            {question.isResolved ? (
              <>
                <span className="text-[11px] font-mono uppercase tracking-wide text-primary font-semibold">✓ Resolved</span>
                <button
                  onClick={handleUnresolve}
                  disabled={unresolve.isPending}
                  className="text-[11px] font-mono uppercase tracking-wide font-bold text-muted-foreground border border-border rounded-full px-2.5 py-1.5 hover:border-destructive hover:text-destructive transition-colors disabled:opacity-40"
                >
                  {unresolve.isPending ? 'Reopening…' : 'Unresolve'}
                </button>
              </>
            ) : (
              <button
                onClick={handleResolve}
                disabled={resolve.isPending}
                className={`text-[11px] font-mono uppercase tracking-wide font-bold text-primary border border-primary rounded-full px-2.5 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 ${isTaMode ? 'ml-auto' : ''}`}
              >
                {resolve.isPending ? 'Resolving…' : '✓ Mark resolved'}
              </button>
            )}

            {isTaMode && (
              <>
                {/* Spotlight */}
                <button
                  onClick={handleSpotlight}
                  className={`text-[11px] font-mono uppercase tracking-wide font-bold rounded-full px-2.5 py-1.5 border transition-colors
                    ${isSpotlighted
                      ? 'border-foreground text-foreground bg-[var(--brand-yellow)]'
                      : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                    }`}
                >
                  ⬡ Spotlight
                </button>

                {/* Delete */}
                <button
                  onClick={handleDelete}
                  disabled={deleteQuestion.isPending}
                  className={`text-[11px] font-mono uppercase tracking-wide font-bold rounded-full px-2.5 py-1.5 border transition-colors disabled:opacity-40
                    ${confirmDelete
                      ? 'border-destructive text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground'
                      : 'border-border text-muted-foreground hover:border-destructive hover:text-destructive'
                    }`}
                >
                  {deleteQuestion.isPending ? '…' : confirmDelete ? 'Confirm delete?' : 'Delete'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="mt-[14px] pt-[12px] border-t border-border">
          <div className="flex flex-wrap items-end gap-2 sm:flex-nowrap">
            <AnimatePresence mode="wait" initial={false}>
              {!showReplyForm ? (
                <motion.div
                  key="links"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex items-center gap-[9px] md:gap-[13px] flex-1 flex-wrap"
                >
                  <button
                    onClick={handleFollow}
                    className={`text-[11px] font-mono uppercase tracking-wide rounded-full px-2.5 py-1.5 border transition-colors cursor-pointer
                      ${optFollow.followed
                        ? 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                        : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
                  >
                    Follow · {optFollow.count}
                  </button>
                  {question.replyCount > 0 && (
                    <button
                      onClick={() => setShowReplies(!showReplies)}
                      className={`text-[11px] font-mono uppercase tracking-wide rounded-full px-2.5 py-1.5 border transition-colors cursor-pointer
                        ${showReplies
                          ? 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
                    >
                      {showReplies
                        ? `Hide ${question.replyCount === 1 ? 'reply' : 'replies'}`
                        : `${question.replyCount} ${question.replyCount === 1 ? 'reply' : 'replies'}`}
                    </button>
                  )}
                  {question.isResolved && !isTaMode && (
                    <span className="ml-auto font-semibold text-[11px] font-mono uppercase tracking-wide text-foreground bg-accent/20 p-[5px_8px] border border-accent/50 rounded select-none">
                      ✓ Resolved
                    </span>
                  )}
                  {question.claimedByTa && !isTaMode && !question.isResolved && (
                    <span className="ml-auto font-semibold text-[11px] font-mono uppercase tracking-wide text-foreground bg-accent/20 p-[5px_8px] border border-accent/50 rounded select-none">
                      Claimed by {question.claimedByTa}
                    </span>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="textarea"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex-1"
                >
                  <MentionInput
                    value={replyBody}
                    onChange={setReplyBody}
                    participants={participants}
                    placeholder="Add an answer or context… type @ to ping someone"
                    multiline
                    autoResize
                    maxRows={4}
                    onSubmit={() => submitReply({ preventDefault: () => {} } as React.FormEvent)}
                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary block"
                  />
                  <div className={`mt-1 text-right text-[11px] font-mono uppercase tracking-wide ${replyTooLong ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                    {replyWordCount}/{MAX_CONTENT_WORDS} words{replyTooLong && ' · limit reached'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={() => {
                if (!showReplyForm) setShowReplyForm(true);
                else submitReply({ preventDefault: () => {} } as React.FormEvent);
              }}
              disabled={showReplyForm && (createReply.isPending || !replyBody.trim() || replyTooLong)}
              className="dark-button h-[36px] px-5 shrink-0 self-end disabled:opacity-40"
            >
              {showReplyForm ? (createReply.isPending ? '…' : 'Send') : 'Reply'}
            </button>
          </div>
        </div>

        {/* Replies */}
        <AnimatePresence>
          {showReplies && detail && detail.replies && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-4"
            >
              <div className="flex flex-col gap-3 pt-3 border-t border-border">
                {detail.groupReply && (
                  <div className="p-[14px_15px] border-l-[3px] border-l-primary bg-accent/15 rounded-md">
                    <span className="flex items-center gap-[7px] text-primary text-[11px] font-mono uppercase tracking-wide font-semibold">
                      ✓ Group context · TA
                    </span>
                    <p className="text-sm leading-[1.55] text-foreground m-[8px_0_0]">
                      {detail.groupReply.body}
                    </p>
                  </div>
                )}
                {detail.replies.map(reply => (
                  <div key={reply.id} className={`p-3 rounded-md bg-card border ${reply.isTa ? 'border-primary/20' : 'border-border'}`}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] font-mono uppercase tracking-wide font-bold flex items-center gap-1">
                        {reply.authorLabel}
                        {reply.isTa && <span className="bg-primary text-primary-foreground px-1 rounded-[2px] text-[10px]">TA</span>}
                      </span>
                      <button
                        onClick={() => {
                          const action = reply.viewerMarkedHelpful ? unmarkHelpful : markHelpful;
                          action.mutate({ id: reply.id, data: { deviceId } }, {
                            onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/questions/${question.id}`] }),
                          });
                        }}
                        className={`flex items-center gap-[5px] rounded-full px-2.5 py-1.5 border text-sm transition-colors cursor-pointer
                          ${reply.viewerMarkedHelpful
                            ? 'border-primary bg-[var(--brand-periwinkle)] text-foreground'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary'
                          }`}
                      >
                        <span>👍</span>
                        {reply.helpfulCount > 0 && <span className="text-xs font-bold">{reply.helpfulCount}</span>}
                      </button>
                    </div>
                    <p className="text-sm leading-[1.5] text-foreground">{reply.body}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
