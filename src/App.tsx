import { Route, Routes } from 'react-router';
import { About } from './routes/About';
import { Home } from './routes/Home';
import { NotFound } from './routes/NotFound';
import { Screen } from './routes/Screen';
import { Share } from './routes/Share';
import { Spell } from './routes/Spell';
import { SpellList } from './routes/SpellList';
import { useScrollMemory } from './lib/useScrollMemory';

// Same paths as the Worker and the plan's routing table. /s/* arrives server-rendered
// (worker/share.ts) and the app renders the same card over it.
export function App() {
  useScrollMemory();
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/spells" element={<SpellList />} />
      <Route path="/spell/:slug" element={<Spell />} />
      <Route path="/s/:spell/:name" element={<Share />} />
      <Route path="/screen/:spell/:name" element={<Screen />} />
      <Route path="/about" element={<About />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
