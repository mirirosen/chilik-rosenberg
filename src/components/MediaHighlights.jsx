import { mediaReferences } from '../data/mediaReferences';
import { mediaHighlightSelection } from '../data/homeHighlights';

export default function MediaHighlights({ language = 'he' }) {
  const lang = String(language).startsWith('en') ? 'en' : 'he';
  const references = mediaHighlightSelection(mediaReferences);
  if (!references.length) return null;
  return <nav className="media-highlights" aria-label={lang === 'he' ? 'מהסיורים והמפגשים בתקשורת' : 'Tour coverage and conversations'}>
    <p>{lang === 'he' ? 'הסיורים והשיחות בתקשורת' : 'Tours and conversations in the media'}</p>
    <ul>{references.map(source => <li key={source.id}>
      <a href={source.url} target="_blank" rel="noopener noreferrer">
        <strong>{source.outlet[lang]}</strong><span>{source.title[lang]}</span>
      </a>
    </li>)}</ul>
  </nav>;
}
