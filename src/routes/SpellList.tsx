import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Choices } from '../components/Choices';
import { Header } from '../components/Header';
import { Ornament } from '../components/Ornament';
import { useGame } from '../lib/game';
import { editorPath } from '../lib/share';
import { groupSpells, type GroupBy, type SortDir } from '../lib/spellList';
import { GAME_INFO, isGame, spellsFor, type Game } from '../lib/spells';
import './SpellList.css';

/**
 * /spells — every spell in one game, grouped by first letter or by level/rank.
 * The view lives in the address (?g=pf2e&by=level&sort=desc) so it can be shared and so
 * Back from the editor returns to the same list; the game also follows the home toggle.
 */
export function SpellList() {
  const [params, setParams] = useSearchParams();
  const [pref, setPref] = useGame();
  const g = params.get('g');
  const game: Game = isGame(g) ? g : pref;
  const by: GroupBy = params.get('by') === 'level' ? 'level' : 'letter';
  const dir: SortDir = params.get('sort') === 'desc' ? 'desc' : 'asc';
  const info = GAME_INFO[game];
  const groups = useMemo(() => groupSpells(game, by, dir), [game, by, dir]);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    document.title = 'Spell list · CARL';
  }, []);

  // The compact bar appears once the big title has scrolled away.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), { rootMargin: '-40px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Defaults stay out of the address: /spells is letter, A to Z, your current game. */
  function update(next: { g?: Game; by?: GroupBy; sort?: SortDir }) {
    const p = new URLSearchParams(params);
    if (next.g) p.set('g', next.g);
    if (next.by) (next.by === 'letter' ? p.delete('by') : p.set('by', next.by));
    if (next.sort) (next.sort === 'asc' ? p.delete('sort') : p.set('sort', next.sort));
    setParams(p, { replace: true });
  }

  const sortLabels = by === 'letter' ? ['A to Z', 'Z to A'] : ['Lowest first', 'Highest first'];
  const summary = `${info.short} · ${by === 'letter' ? 'letter' : info.level.toLowerCase()} · ${by === 'letter' ? (dir === 'asc' ? 'a–z' : 'z–a') : dir === 'asc' ? 'low–high' : 'high–low'}`;

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }

  return (
    <main className="page spell-list">
      <Header />
      <h1 ref={titleRef}>Spell list</h1>

      <div className="sl-controls">
        <Choices
          label="Game"
          value={game}
          options={[
            { value: 'dnd', label: 'D&D' },
            { value: 'pf2e', label: 'PF2E' },
          ]}
          onChange={(v) => {
            setPref(v);
            update({ g: v });
          }}
        />
        <Choices
          label="Group by"
          value={by}
          options={[
            { value: 'letter', label: 'Letter' },
            { value: 'level', label: info.level },
          ]}
          onChange={(v) => update({ by: v })}
        />
        <Choices
          label="Sort"
          value={dir}
          options={[
            { value: 'asc', label: sortLabels[0] },
            { value: 'desc', label: sortLabels[1] },
          ]}
          onChange={(v) => update({ sort: v })}
        />
      </div>
      {/* What the filters produced, so it follows them. */}
      <p className="sl-count">
        {spellsFor(game).length} spells from {info.source}
      </p>
      <div className="double-rule" aria-hidden="true" />

      {groups.map((grp) => (
        <section key={grp.id} id={grp.id} className="sl-group" aria-labelledby={`${grp.id}-h`}>
          <h2 className="sl-gh" id={`${grp.id}-h`}>
            <span className={by === 'letter' ? 'sl-gt' : 'sl-gt small'}>{grp.title}</span>
            <span className="sl-hair" aria-hidden="true" />
            {by === 'level' && <Ornament className="sl-orn" />}
            <span className="sl-gc">
              {grp.spells.length}
              <span className="sr-only"> spells</span>
            </span>
          </h2>
          <ul className="sl-rows">
            {grp.spells.map((s) => (
              <li key={s.slug}>
                <Link to={editorPath(s)} className="sl-row">
                  <span className="sl-name">{s.name}</span>
                  <span className="sl-meta smallcaps">{by === 'level' ? s.detail : s.line}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* The whole bar is the back-to-top button. Smooth unless the player prefers less motion. */}
      <button
        type="button"
        className="sl-bar"
        data-show={compact || undefined}
        aria-hidden={!compact}
        tabIndex={compact ? 0 : -1}
        aria-label={`Spell list, ${summary}. Back to top`}
        onClick={() =>
          window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
        }
      >
        <span className="sl-bar-title">Spell list</span>
        <span className="sl-bar-sum smallcaps">{summary}</span>
      </button>

      <JumpStrip marks={groups.map((g) => ({ id: g.id, mark: g.mark, title: g.title }))} onJump={jump} />
    </main>
  );
}

/** Right-edge index. Tap a mark, or drag along the strip to scrub through the groups. */
function JumpStrip({ marks, onJump }: { marks: { id: string; mark: string; title: string }[]; onJump: (id: string) => void }) {
  const last = useRef<string | null>(null);
  const scrubbing = useRef(false);
  const at = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest('[data-jump]') as HTMLElement | null;
    const id = el?.dataset.jump;
    if (id && id !== last.current) {
      last.current = id;
      onJump(id);
    }
  };
  return (
    <nav
      className="sl-strip"
      aria-label="Jump to group"
      // Touch and pen pointers stay with the element they started on, so moves keep
      // arriving here while the finger slides along the strip; no explicit capture needed.
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return; // mice click the links
        scrubbing.current = true;
        last.current = null;
        at(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => scrubbing.current && at(e.clientX, e.clientY)}
      onPointerUp={() => (scrubbing.current = false)}
      onPointerCancel={() => (scrubbing.current = false)}
    >
      {marks.map((m) => (
        <a
          key={m.id}
          href={`#${m.id}`}
          data-jump={m.id}
          aria-label={m.title}
          onClick={(e) => {
            e.preventDefault();
            onJump(m.id);
          }}
        >
          {m.mark}
        </a>
      ))}
    </nav>
  );
}
