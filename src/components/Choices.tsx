import { useId } from 'react';

interface Props<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}

/** A row of words, one underlined: "Group by  Letter · Rank". A radio group underneath. */
export function Choices<T extends string>({ label, value, options, onChange }: Props<T>) {
  const id = useId();
  const move = (from: number, step: number) => {
    const next = options[(from + step + options.length) % options.length];
    onChange(next.value);
    requestAnimationFrame(() => (document.querySelector(`[data-choice="${id}-${next.value}"]`) as HTMLElement | null)?.focus());
  };
  return (
    <div className="choices">
      <span className="choices-k smallcaps" id={id}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="choices-o">
        {options.map((o, i) => (
          <span key={o.value} className="choice-wrap">
            {i > 0 && (
              <span className="choices-dot" aria-hidden="true">
                ·
              </span>
            )}
            <button
              type="button"
              role="radio"
              aria-checked={o.value === value}
              tabIndex={o.value === value ? 0 : -1}
              data-choice={`${id}-${o.value}`}
              className="choice"
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') (e.preventDefault(), move(i, 1));
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') (e.preventDefault(), move(i, -1));
              }}
            >
              {o.label}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
