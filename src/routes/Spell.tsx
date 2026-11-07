import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Header } from '../components/Header';
import { HexButton } from '../components/HexButton';
import { Toast } from '../components/Toast';
import { describe, diff } from '../lib/diff';
import { recase } from '../lib/recase';
import { randomSpell } from '../lib/search';
import { useGame } from '../lib/game';
import { editorPath, screenPath, sharePath as sharePathFor } from '../lib/share';
import { isNameSlug, nameFromSlug } from '../lib/slug';
import { findSpell, isGame, type Game, type Spell as SpellRecord } from '../lib/spells';
import { useFitSize } from '../lib/useFitSize';
import './Spell.css';

export function Spell() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const [game] = useGame();
  // ?g= pins the game for the 70 names both games share; otherwise use the player's game.
  const g = params.get('g');
  const spell = findSpell(slug, isGame(g) ? g : game);
  const shared = params.get('name');
  // Coming Back to this page: the exact text from last time, kept in its history entry
  // (see the Editor). Otherwise the ?name= of a shared link, otherwise the spell itself.
  const saved = (useLocation().state as { draft?: unknown } | null)?.draft;
  const initial =
    typeof saved === 'string'
      ? saved
      : spell && shared && isNameSlug(shared)
        ? nameFromSlug(shared, spell.name)
        : spell?.name;

  useEffect(() => {
    document.title = spell ? `${spell.name} · CARL` : 'CARL';
  }, [spell]);

  return (
    <main className="page">
      <Header />
      {spell && initial ? (
        <Editor key={`${spell.game}/${spell.slug}/${shared ?? ''}`} spell={spell} initial={initial} game={game} />
      ) : (
        <Missing slug={slug} />
      )}
    </main>
  );
}

/** The new name with edited characters wrapped for the accent colour. */
function Highlighted({ text, changed }: { text: string; changed: boolean[] }) {
  const parts: { s: string; on: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.on === changed[i]) last.s += text[i];
    else parts.push({ s: text[i], on: changed[i] });
  }
  return (
    <>
      {parts.map((p, i) => (p.on ? <span key={i} className="edit">{p.s}</span> : p.s))}
    </>
  );
}

function Editor({ spell, initial, game }: { spell: SpellRecord; initial: string; game: Game }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState(initial);

  // Keep the edit in this page's history entry (replace, no new Back step), so leaving
  // for show-my-screen, the share page, Another or home and coming Back restores it.
  useEffect(() => {
    if ((location.state as { draft?: unknown } | null)?.draft === value) return;
    const t = setTimeout(
      () => navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: { draft: value } }),
      250,
    );
    return () => clearTimeout(t);
  }, [value, location.pathname, location.search, location.state, navigate]);

  /** Save the edit right now, before a control takes the player elsewhere. */
  const keep = () => navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: { draft: value } });
  const [toast, setToast] = useState('');
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Caret to restore after we rewrite the value (recase keeps the length, so it's stable).
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el && caretRef.current !== null && document.activeElement === el) {
      el.setSelectionRange(caretRef.current, caretRef.current);
    }
    caretRef.current = null;
  }, [value]);
  const result = useMemo(() => diff(spell.name, value), [spell.name, value]);
  const status = describe(result);
  const changed = result.distance > 0;
  const size = useFitSize(value || spell.name, fieldRef);
  const sharePath = sharePathFor(spell, value);
  const clearToast = useCallback(() => setToast(''), []);

  async function share() {
    const url = new URL(sharePath, window.location.origin).toString();
    const text = changed ? `${spell.name} → ${value.trim()}` : spell.name;
    // Native share sheet on phones and tablets only. On a desktop (macOS especially) the
    // sheet has no "copy link", so copying is the more useful default there.
    const touch = matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.share) {
      try {
        await navigator.share({ title: 'CARL', text, url });
        return;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return; // player closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast('Link copied');
    } catch {
      setToast(url);
    }
  }

  return (
    <>
      <div className="meta">
        <span className="smallcaps level">{spell.line}</span>
        <span className="divider" aria-hidden="true" />
        <button type="button" className="smallcaps another" onClick={() => {
            keep();
            navigate(editorPath(randomSpell(game, spell)));
          }}>
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M12 2l9 5v10l-9 5-9-5V7z" />
            <path d="M12 2v10m0 0l9-5M12 12l-9-5M12 12v10" />
          </svg>
          Another
        </button>
      </div>

      {/* Reserve the line even when unchanged so the name doesn't jump on the first edit. */}
      <p className="original" aria-hidden={!changed} style={{ visibility: changed ? 'visible' : 'hidden' }}>
        <s>{spell.name}</s>
      </p>

      <label htmlFor="name" className="sr-only">
        New spell name, from {spell.name}
      </label>
      <div className="field" ref={fieldRef} style={{ fontSize: size }}>
        {/* The mirror sets the height and paints the colours; the textarea on top holds the
            caret and selection with transparent text, wrapping identically. */}
        <div className="mirror" aria-hidden="true">
          <Highlighted text={value} changed={result.changed} />
          {'​'}
        </div>
        <textarea
          id="name"
          className="name"
          value={value}
          rows={1}
          ref={inputRef}
          onChange={(e) => {
            const raw = e.target.value.replace(/[\r\n]+/g, ' ');
            const caret = e.target.selectionEnd ?? raw.length;
            const next = recase(value, raw, caret);
            if (next !== raw) caretRef.current = caret;
            setValue(next);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-describedby="status"
        />
      </div>

      <div className="status" id="status" aria-live="polite">
        <span className="hair" aria-hidden="true" style={{ visibility: status ? 'visible' : 'hidden' }} />
        <span className="status-text">{status || ' '}</span>
        <span className="hair" aria-hidden="true" style={{ visibility: status ? 'visible' : 'hidden' }} />
      </div>
      <p className="reset" style={{ visibility: changed ? 'visible' : 'hidden' }}>
        <button type="button" className="link" onClick={() => setValue(spell.name)} tabIndex={changed ? 0 : -1}>
          Reset to {spell.name}
        </button>
      </p>

      <div className="spacer" />

      <div className="actions">
        <HexButton onClick={share}>Share this spell</HexButton>
        <HexButton to={screenPath(spell, value)} onClick={keep}>
          Show my screen
        </HexButton>
      </div>
      <Toast message={toast} onDone={clearToast} />
    </>
  );
}

function Missing({ slug }: { slug: string }) {
  return (
    <div className="missing">
      <p>No spell called “{slug}” in the SRD.</p>
      <p><Link to="/">Find a spell</Link></p>
    </div>
  );
}
