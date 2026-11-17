import { useEffect, useState } from 'react';
import { bookingConversionCopy, conversionDate } from '../data/bookingConversion';
export default function MobileBookingBar({language='he',date,participants,total,actionLabel,onContinue,disabled=false,primaryActionRef}) {
  const [primaryVisible,setPrimaryVisible]=useState(true), [editing,setEditing]=useState(false);
  useEffect(()=>{
    const primary=primaryActionRef?.current;
    if(!primary || typeof IntersectionObserver!=='function') return;
    const observer=new IntersectionObserver(([entry])=>setPrimaryVisible(entry.isIntersecting));
    observer.observe(primary); return ()=>observer.disconnect();
  },[primaryActionRef]);
  useEffect(()=>{
    const editable=node=>node instanceof Element && Boolean(node.closest('input,select,textarea,[contenteditable="true"]'));
    const focus=event=>setEditing(editable(event.target));
    const blur=event=>setEditing(editable(event.relatedTarget));
    setEditing(editable(document.activeElement));
    document.addEventListener('focusin',focus);document.addEventListener('focusout',blur);
    return ()=>{document.removeEventListener('focusin',focus);document.removeEventListener('focusout',blur);};
  },[]);
  const valid=/^\d{4}-\d{2}-\d{2}$/.test(date || '') && Number.isFinite(Date.parse(date+'T12:00:00Z')) && Number.isInteger(participants) && participants>0 && Number.isFinite(total) && total>0;
  const visible=valid && !primaryVisible && !editing;
  useEffect(()=>{ document.body.classList.toggle('has-mobile-booking-bar',visible); return ()=>document.body.classList.remove('has-mobile-booking-bar'); },[visible]);
  if(!visible) return null;
  const copy=bookingConversionCopy(language);
  return <aside className="mobile-booking-bar" aria-label={copy.summary} dir={String(language).startsWith('en')?'ltr':'rtl'}>
    <div><span>{conversionDate(date,language)} · {participants} {copy.guests}</span><strong><bdi>₪{total.toLocaleString()}</bdi></strong></div>
    <button type="button" disabled={disabled} onClick={onContinue}>{actionLabel}</button>
  </aside>;
}
