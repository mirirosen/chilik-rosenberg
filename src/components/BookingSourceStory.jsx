import { bakeryVideo } from '../data/organicVideo.js';
import './BookingSourceStory.css';
export default function BookingSourceStory({language='he'}) {
  const en=String(language).startsWith('en');
  return <aside className="booking-source-story" aria-label={en?'From Hilik’s original footage':'מתוך הסרטונים המקוריים של חיליק'}>
    <a href={bakeryVideo.path} target="_blank" rel="noopener noreferrer">
      <img src={bakeryVideo.poster} width="540" height="960" loading="lazy" alt={en?'Challahs beside the ovens, from Hilik’s video':'חלות ליד התנורים, מתוך הסרטון של חיליק'}/>
      <span><small>{en?'A moment from a previous visit':'רגע מביקור קודם'}</small><strong>{en?'Hilik on Vizhnitz challah':'חיליק על החלות של ויזניץ'}</strong><span>{en?'Watch the 13-second clip':'לסרטון המקורי · 13 שניות'} <span aria-hidden="true">{en?'→':'←'}</span></span></span>
    </a>
    <p>{en?'Stops and tastings may vary. Ask Hilik about bakery access in advance.':'התחנות והטעימות עשויות להשתנות. יש לברר מראש לגבי כניסה למאפייה.'}</p>
  </aside>;
}
