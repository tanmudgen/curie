import { useRef, useState, useEffect, type KeyboardEvent } from 'react';
import { type Participant } from '@/hooks/use-participants';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  participants: Participant[];
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  autoResize?: boolean;
  maxRows?: number;
  onSubmit?: () => void;
}

function getMentionQuery(value: string, cursor: number): string | null {
  const before = value.slice(0, cursor);
  const match = before.match(/@([\w\s]*)$/);
  return match ? match[1] : null;
}

function replaceMention(value: string, cursor: number, name: string): { text: string; cursor: number } {
  const before = value.slice(0, cursor);
  const after = value.slice(cursor);
  const replaced = before.replace(/@([\w\s]*)$/, `@${name} `);
  return { text: replaced + after, cursor: replaced.length };
}

export function MentionInput({
  value,
  onChange,
  participants,
  placeholder,
  className,
  multiline = false,
  autoResize = false,
  maxRows = 4,
  onSubmit,
}: MentionInputProps) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Auto-resize the textarea height based on content
  useEffect(() => {
    if (!autoResize || !ref.current) return;
    const el = ref.current as HTMLTextAreaElement;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 18;
    const paddingY = parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom);
    const maxHeight = lineHeight * maxRows + paddingY;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value, autoResize, maxRows]);

  const filtered = query === null ? [] : participants.filter((p) =>
    p.name.toLowerCase().startsWith(query.toLowerCase())
  );
  const open = filtered.length > 0;

  // Reset active index when filtered list changes
  useEffect(() => { setActiveIdx(0); }, [query]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    const cursor = e.target.selectionStart ?? val.length;
    setQuery(getMentionQuery(val, cursor));
  };

  const pick = (participant: Participant) => {
    const cursor = ref.current?.selectionStart ?? value.length;
    const { text, cursor: newCursor } = replaceMention(value, cursor, participant.name);
    onChange(text);
    setQuery(null);
    // Restore cursor after React re-render
    setTimeout(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(filtered[activeIdx]); return; }
      if (e.key === 'Escape') { setQuery(null); return; }
    }
    if (!open && e.key === 'Enter' && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  const sharedProps = {
    ref,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onBlur: () => setTimeout(() => setQuery(null), 150),
    placeholder,
    className,
  };

  return (
    <div className="relative flex-1">
      {multiline ? (
        <textarea {...sharedProps} rows={1} style={{ resize: 'none', overflow: 'hidden' }} />
      ) : (
        <input type="text" {...sharedProps} autoComplete="off" />
      )}

      {open && (
        <ul
          className="absolute z-50 bottom-full mb-1 left-0 min-w-[180px] max-w-[280px] bg-popover border border-border rounded-lg shadow-lg overflow-hidden py-1"
          onMouseDown={(e) => e.preventDefault()}
        >
          {filtered.map((p, i) => (
            <li
              key={p.name}
              onMouseDown={() => pick(p)}
              className={`flex items-center gap-2 px-3 py-[7px] cursor-pointer text-sm ${i === activeIdx ? 'bg-[var(--brand-periwinkle)] text-foreground' : 'hover:bg-accent/15'}`}
            >
              <span className="flex-1 font-medium truncate">{p.name}</span>
              {p.isTa && (
                <span className="shrink-0 text-[11px] font-semibold font-mono uppercase tracking-wider bg-primary text-primary-foreground px-[5px] py-[2px] rounded-[2px]">
                  TGA
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
