import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import type { User } from '../types';

interface Props {
  onChanged: () => void;
}

/** You only see statuses from people you've added here. */
export default function Contacts({ onChanged }: Props) {
  const [contacts, setContacts] = useState<User[]>([]);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const load = () => api.contacts().then(setContacts).catch(console.error);
  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.addContact(phone);
      setPhone('');
      await load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: string) {
    await api.removeContact(id);
    await load();
    onChanged();
  }

  return (
    <section className="card">
      <h2>Contacts</h2>
      <form className="inline-form" onSubmit={add}>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Add by phone" required />
        <button className="primary small">Add</button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="contact-list">
        {contacts.map((c) => (
          <li key={c.id}>
            <span>
              {c.name} <small className="muted">{c.phone}</small>
            </span>
            <button className="link danger" onClick={() => remove(c.id)}>
              Remove
            </button>
          </li>
        ))}
        {contacts.length === 0 && <p className="muted">Add a contact to see their statuses.</p>}
      </ul>
    </section>
  );
}
