import type { Question } from '@workspace/api-client-react';

export function questionStatus(question: Question) {
  if (question.isResolved) return { label: 'Resolved', color: 'var(--brand-purple)' };
  if (question.status === 'answered') return { label: 'Answered', color: 'var(--brand-purple)' };
  if ((question.risingScore ?? 0) > 10) return { label: 'Rising', color: 'var(--brand-yellow)' };
  return { label: 'Unanswered', color: 'var(--brand-periwinkle)' };
}
