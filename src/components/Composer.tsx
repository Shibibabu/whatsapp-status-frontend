import { FormEvent, useState } from 'react';
import { api } from '../api';

const COLORS = ['#075E54', '#128C7E', '#25D366', '#34B7F1', '#7E57C2', '#E91E63', '#FF7043', '#455A64'];
const MAX = 700;

interface Props {
  onPosted: () => void;
}

/** Where the user types a new text status. */
export default function Composer({ onPosted }: Props) {
  const [text, setText] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      // Backend returns 202 with state "pending"; it's classified in the background.
      await api.postStatus(text, color);
      setText('');
      onPosted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card composer" onSubmit={submit}>
      <h2>New status</h2>
      <textarea
        style={{ background: color }}
        value={text}
        maxLength={MAX}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a status…"
        rows={4}
      />
      <div className="composer-row">
        <div className="swatches">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              className={`swatch ${c === color ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Background ${c}`}
            />
          ))}
        </div>
        <span className="counter">
          {text.length}/{MAX}
        </span>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={busy || !text.trim()}>
        Post status
      </button>
    </form>
  );
}
