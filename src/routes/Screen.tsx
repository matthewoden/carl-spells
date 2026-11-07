import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { OrnamentRule } from '../components/Ornament';
import { diff } from '../lib/diff';
import { editorPath, parseJoke } from '../lib/share';
import { measure } from '../lib/useFitSize';
import { useWakeLock } from '../lib/useWakeLock';
import { bestWrap, DESCENT, PITCH } from '../lib/wrap';
import './Screen.css';

/** Dark is the default here (a lit phone at a dim table), whatever the rest of the app uses. */
function useDarkWhileMounted() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const before = root.dataset.theme;
    root.dataset.theme = 'dark';
    return () => {
      if (before) root.dataset.theme = before;
    };
  }, []);
}

/** Best effort: Android allows this after fullscreen, iOS Safari never does. */
function useLandscapeLock() {
  useEffect(() => {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    o?.lock?.('landscape').catch(() => {});
    return () => {
      try { o?.unlock?.(); } catch { /* not locked */ }
    };
  }, []);
}

export function Screen() {
  const { spell = '', name = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const g = params.get('g');
  const joke = useMemo(() => parseJoke(spell, name, g), [spell, name, g]);
  const awake = useWakeLock();
  useDarkWhileMounted();
  useLandscapeLock();

  const [showOriginal, setShowOriginal] = useState(true);
  const [chrome, setChrome] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);
  const restRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [, setFontsReady] = useState(false);

  // The Back button fades after 2s and comes back on any tap.
  useEffect(() => {
    if (!chrome) return;
    const t = setTimeout(() => setChrome(false), 2000);
    return () => clearTimeout(t);
  }, [chrome]);

  useEffect(() => {
    document.fonts.load('700 100px "Cormorant Garamond"').then(() => setFontsReady(true), () => {});
  }, []);

  // The name gets whatever the body has left after the lines under it, so the whole group
  // can sit centred together (portrait) instead of the name owning a fixed share.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const rest = restRef.current;
    if (!body || !rest) return;
    const update = () => {
      const cs = getComputedStyle(body);
      const px = (v: string) => parseFloat(v) || 0;
      const inner = body.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
      setBox({ w: body.clientWidth, h: Math.max(0, inner - rest.offsetHeight - px(cs.rowGap)) });
    };
    const ro = new ResizeObserver(update);
    ro.observe(body);
    ro.observe(rest);
    return () => ro.disconnect();
  }, []);

  const back = useCallback(() => {
    // Came from the editor: go back so its state (and scroll) is intact.
    if (location.key !== 'default') navigate(-1);
    else navigate(joke ? editorPath(joke.spell, joke.nameSlug) : '/');
  }, [location.key, navigate, joke]);

  if (!joke) {
    return (
      <main className="screen" onClick={back}>
        <p className="screen-missing">That spell link doesn’t resolve. Tap to go back.</p>
      </main>
    );
  }

  const changed = diff(joke.spell.name, joke.name).changed;
  const wrap = box.w ? bestWrap(joke.name, measure, box.w, box.h) : { lines: [joke.name], width: measure(joke.name) };
  let offset = 0;
  const lines = wrap.lines.map((line) => {
    const start = joke.name.indexOf(line, offset);
    offset = start + line.length;
    return { line, start };
  });
  const viewH = (PITCH * (lines.length - 1) + 1 + DESCENT) * 100;
  const scale = box.w ? Math.min(box.w / wrap.width, box.h / viewH) : 0;

  return (
    <main className="screen" onClick={() => setChrome(true)}>
      <div className="frame screen-frame">
        <span className="c c-tl" />
        <span className="c c-tr" />
        <span className="c c-bl" />
        <span className="c c-br" />
        <div className="screen-in">
          <header className="screen-top" data-hidden={chrome ? undefined : ''}>
            <button
              type="button"
              className="screen-back"
              aria-label="Back to the editor"
              onClick={(e) => {
                e.stopPropagation();
                back();
              }}
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <span className="smallcaps screen-awake">{awake ? 'screen stays awake' : ''}</span>
            <span className="smallcaps screen-level-top">{joke.spell.line}</span>
          </header>

          <div className="screen-body" ref={bodyRef}>
            <div className="screen-name">
              <svg
                viewBox={`0 0 ${wrap.width.toFixed(1)} ${viewH.toFixed(1)}`}
                width={Math.floor(wrap.width * scale)}
                height={Math.floor(viewH * scale)}
                role="img"
                aria-label={joke.name}
                onClick={(e) => {
                  e.stopPropagation();
                  setChrome(true);
                  setShowOriginal((v) => !v);
                }}
              >
                {lines.map(({ line, start }, i) => (
                  <text key={i} x={wrap.width / 2} y={100 + PITCH * 100 * i - 12} textAnchor="middle" className="screen-text">
                    {[...line].map((ch, j) =>
                      changed[start + j] ? <tspan key={j} className="edit">{ch}</tspan> : ch,
                    )}
                  </text>
                ))}
              </svg>
            </div>
            <div className="screen-rest" ref={restRef}>
              <div className="screen-under" data-hidden={showOriginal ? undefined : ''}>
                <OrnamentRule />
                <p className="screen-was" data-long={joke.spell.name.length > 16 ? '' : undefined}>
                  was <s>{joke.spell.name}</s>
                </p>
              </div>
              <p className="smallcaps screen-level">{joke.spell.line}</p>
            </div>
          </div>

          <p className="screen-hint">Tap the name to {showOriginal ? 'hide' : 'show'} the original</p>
        </div>
      </div>
    </main>
  );
}
