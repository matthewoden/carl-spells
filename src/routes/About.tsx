import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { PF2E_ATTRIBUTION } from '../lib/spells';
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme';
import './About.css';

/** Set once the repository is public; the footer link appears only then. */
const SOURCE_URL = 'https://github.com/matthewoden/carl-spells';

const THEMES: [ThemePref, string][] = [
  ['system', 'System'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];

export function About() {
  const [theme, setTheme] = useState<ThemePref>(getThemePref);

  useEffect(() => {
    document.title = 'About · CARL';
  }, []);

  return (
    <main className="page about">
      <Header />

      <h1>About</h1>
      <div className="double-rule" aria-hidden="true" />
      <ol className="rules">
        <li>Pick any spell from the list.</li>
        <li>
          <strong>Add</strong> one letter, <strong>change</strong> one letter, or <strong>remove</strong> one letter. Only one.
        </li>
        <li>Describe what the new spell does. Loudest laugh wins.</li>
      </ol>

      <p className="acronym">
        <span className="acronym-mark">CARL</span> is the game itself: <b>C</b>hange, <b>A</b>dd, or <b>R</b>emove <b>L</b>etters.
      </p>

      <h2>Where the spells come from</h2>
      <div className="double-rule small" aria-hidden="true" />
      <h3 className="smallcaps license-head">D&amp;D</h3>
      <p className="license">
        This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC,
        available at <a href="https://www.dndbeyond.com/srd">dndbeyond.com/srd</a>. The SRD 5.2.1 is licensed under the{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/legalcode">Creative Commons Attribution 4.0 International License</a>.
      </p>

      <h3 className="smallcaps license-head">Pathfinder</h3>
      <p className="license">
        This product is licensed under the <a href="https://paizo.com/orclicense">ORC License</a> located at the Library of
        Congress at TX 9-307-067 and available online at various locations. All warranties are disclaimed as set forth
        therein.
      </p>
      <p className="license">This product includes spell names from:</p>
      <ul className="license-books">
        {PF2E_ATTRIBUTION.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="license">
        <b>Reserved Material:</b> Reserved Material elements in this product include all elements designated as Reserved
        Material under the ORC License. To avoid confusion, such items include: the CARL name, logo, and site design.
      </p>
      <p className="license">
        <b>Expressly Designated Licensed Material:</b> This product contains no Expressly Designated Licensed Material.
      </p>

      <p className="disclaimer">
        CARL is an unofficial fan project and is not affiliated with or endorsed by Wizards of the Coast or Paizo Inc.
        Pathfinder is a trademark of Paizo Inc. Only spells from the SRD 5.2.1 and Pathfinder Player Core 1 &amp; 2 appear
        here.
      </p>

      <fieldset className="theme">
        <legend className="smallcaps">Theme</legend>
        {THEMES.map(([value, label]) => (
          <label key={value} className="smallcaps">
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => {
                setTheme(value);
                setThemePref(value);
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="spacer" />
      {SOURCE_URL && (
        <nav className="footer-links smallcaps">
          <a href={SOURCE_URL}>Source on GitHub</a>
        </nav>
      )}
    </main>
  );
}
