import { useEffect, useRef, useState } from 'react';
import { auth } from '../utils/firebase';
import { IS_PREPROD } from '../utils/preview';
import { contactIdFromHash, createContactDownloader } from '../utils/bookingContactService';
const downloadContact = createContactDownloader({ auth, base: import.meta.env.VITE_PAYMENT_API_BASE || '', isPreprod: IS_PREPROD, allowEmulator: import.meta.env.VITE_FIREBASE_EMULATORS === 'true' });

export default function AdminContactCard() {
  const [id, setId] = useState(() => contactIdFromHash(window.location.hash));
  const [state, setState] = useState('ready');
  const active = useRef(null), saved = useRef(null);
  useEffect(() => {
    const clear = () => {
      active.current?.abort(); active.current = null;
      if (saved.current) { clearTimeout(saved.current.timer); URL.revokeObjectURL(saved.current.url); saved.current = null; }
    };
    const changed = () => { clear(); setId(contactIdFromHash(window.location.hash)); setState('ready'); };
    window.addEventListener('hashchange', changed);
    return () => { window.removeEventListener('hashchange', changed); clear(); };
  }, []);
  if (!id) return null;
  const download = async () => {
    const controller = new AbortController(); active.current = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    setState('loading');
    try {
      const blob = await downloadContact(id, controller.signal);
      if (active.current !== controller || controller.signal.aborted) return;
      if (saved.current) { clearTimeout(saved.current.timer); URL.revokeObjectURL(saved.current.url); }
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'booking-contact.vcf'; a.rel = 'noreferrer';
      document.body.append(a); a.click(); a.remove();
      saved.current = { url, timer: setTimeout(() => { URL.revokeObjectURL(url); saved.current = null; }, 30000) };
      setState('saved');
    } catch {
      if (active.current === controller) setState('error');
    } finally { clearTimeout(timer); if (active.current === controller) active.current = null; }
  };
  return <section dir="rtl" lang="he" className="max-w-6xl mx-auto px-6 py-6" aria-label="כרטיס איש קשר">
    <h2 className="text-xl mb-2">כרטיס איש קשר להזמנה</h2>
    <p className="mb-3">הכרטיס כולל שם, תאריך, מספר משתתפים וטלפון. שמירתו דורשת הרשאת מנהל.</p>
    {id === 'invalid' ? <p role="alert">הקישור אינו תקין.</p> : <button type="button" onClick={download} disabled={state === 'loading'} className="bg-brand-gold text-brand-dark px-6 py-3 rounded-full">
      {state === 'loading' ? 'טוען כרטיס…' : 'שמירת איש קשר (.vcf)'}
    </button>}
    {state === 'saved' && <p role="status">הקובץ הוכן לשמירה. פתחו אותו כדי להוסיף את איש הקשר.</p>}
    {state === 'error' && <p role="alert">לא ניתן להוריד את הכרטיס. בדקו הרשאת מנהל ושההזמנה עדיין מאושרת.</p>}
  </section>;
}
