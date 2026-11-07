import { useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { OrnamentRule } from '../components/Ornament';
import { HexButton } from '../components/HexButton';
import { diff } from '../lib/diff';
import { editorPath, parseJoke } from '../lib/share';
import { GAME_INFO } from '../lib/spells';
import './Share.css';

/**
 * /s/:spell/:name. The Worker serves this path with OG tags and a static copy of the same
 * markup (worker/share.ts); keep the two in step.
 */
export function Share() {
  const { spell = '', name = '' } = useParams();
  const [params] = useSearchParams();
  const g = params.get('g');
  const joke = useMemo(() => parseJoke(spell, name, g), [spell, name, g]);

  useEffect(() => {
    document.title = joke ? `${joke.name} · CARL` : 'CARL';
  }, [joke]);

  if (!joke) {
    return (
      <main className="page share">
        <Link to="/" className="wordmark share-mark">CARL</Link>
        <p className="missing">That spell link doesn’t resolve. <Link to="/">Find a spell</Link>.</p>
      </main>
    );
  }

  const changed = diff(joke.spell.name, joke.name).changed;
  const line = [joke.spell.line, joke.status].filter(Boolean).join(' · ');

  return (
    <main className="page share">
      <Link to="/" className="wordmark share-mark">CARL</Link>
      <div className="frame share-card">
        <span className="c c-tl" />
        <span className="c c-tr" />
        <span className="c c-bl" />
        <span className="c c-br" />
        <div className="share-in">
          <span className="smallcaps cast">Someone cast</span>
          <p className="original"><s>{joke.spell.name}</s></p>
          <h1 className="share-name">
            {[...joke.name].map((ch, i) => (changed[i] ? <span key={i} className="edit">{ch}</span> : ch))}
          </h1>
          <OrnamentRule />
          <p className="smallcaps share-line">{line}</p>
        </div>
      </div>
      <div className="spacer" />
      <p className="pitch">Pick any spell. Add, change, or remove one letter. Pass it around the table.</p>
      <div className="actions">
        <HexButton to="/">Cast your own</HexButton>
        <HexButton to={editorPath(joke.spell, joke.nameSlug)}>Remix this one</HexButton>
      </div>
      <p className="attribution">
        <Link to="/about">{GAME_INFO[joke.spell.game].attribution}</Link>
      </p>
    </main>
  );
}
