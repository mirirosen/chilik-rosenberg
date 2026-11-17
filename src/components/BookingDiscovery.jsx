import { useEffect, useState } from 'react';
import { bookingConversionCopy, conversionDate } from '../data/bookingConversion';
import { privateTourContactHref } from '../data/privateTourContact';
import { freshAvailabilityRow } from '../../apps/protected-booking/src/utils/calendarAvailability';
import { isSelectableTourDate } from '../../apps/protected-booking/src/utils/dateUtils';

export default function BookingDiscovery({ language='he', loadAvailability, onSelectDate }) {
  const copy=bookingConversionCopy(language), english=String(language).startsWith('en');
  const [data,setData]=useState(null), [loading,setLoading]=useState(true);
  useEffect(()=>{
    const controller=new AbortController(); let stopped=false, expiry;
    setData(null); setLoading(true);
    Promise.resolve().then(()=>loadAvailability({signal:controller.signal})).then(result=>{
      if(stopped) return;
      setData(result); setLoading(false);
      expiry=setTimeout(()=>setData(null),Math.max(0,result.validUntilMs-Date.now()));
    }).catch(()=>{ if(!stopped){setData(null);setLoading(false);} });
    return ()=>{stopped=true;controller.abort();clearTimeout(expiry);};
  },[loadAvailability]);
  const dates=Object.keys(data?.publicAvailability || {}).sort().filter(date=>{
    const row=freshAvailabilityRow(data,date);
    return isSelectableTourDate(date) && row?.available===true && row.availableSpots>0;
  }).slice(0,3);
  return <section className="booking-discovery" aria-labelledby="booking-discovery-title" dir={english?'ltr':'rtl'}>
    <h2 id="booking-discovery-title">{copy.title}</h2>
    <div className="booking-discovery__choices">
      <article><h3>{copy.open}</h3><p>{copy.openDetail}</p>
        <a className="booking-discovery__action" href="/booking">{copy.openAction}</a>
        <div className="booking-discovery__nearby" aria-labelledby="booking-nearby-title"><h4 id="booking-nearby-title">{copy.dates}</h4>
          {dates.length>0 ? <><div className="booking-discovery__dates">{dates.map(date=><button type="button" key={date} aria-label={copy.dateAction + ' ' + conversionDate(date,language)} data-tour-date={date} onClick={()=>{
            const current=freshAvailabilityRow(data,date);
            if(current?.available && current.availableSpots>0 && isSelectableTourDate(date)) onSelectDate(date);
            else setData(null);
          }}>{conversionDate(date,language)}</button>)}</div><p className="booking-discovery__note">{copy.availability}</p></> : <p role="status">{loading?copy.loading:copy.fallback}</p>}
        </div>
        <a className="booking-discovery__guide" href={english?'/guides/bnei-brak-food-tour-en.html':'/guides/bnei-brak-food-tour.html'}>{copy.guide}</a>
      </article>
      <article><h3>{copy.private}</h3><p>{copy.privateDetail}</p>
        <a className="booking-discovery__action" href={privateTourContactHref(language)} data-contact-context="private_tour" target="_blank" rel="noopener noreferrer">{copy.privateContact}</a>
        <a className="booking-discovery__guide" href="/guides/private-tour-bnei-brak.html">{copy.privateAction}{english?' (Hebrew)':''}</a>
      </article>
    </div>
  </section>;
}
