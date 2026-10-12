import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Tv, Globe, ChevronLeft } from '../utils/icons';
import { mediaCategories, mediaReferences } from '../data/mediaReferences';

const icons = { articles: BookOpen, programs: Tv, online: Globe };
const PAGE_SIZE = 6;

export default function MediaSection() {
  const { t, i18n } = useTranslation();
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const language = (i18n.resolvedLanguage || i18n.language || 'he').startsWith('en') ? 'en' : 'he';
  const filtered = category === 'all'
    ? [...mediaReferences].sort((a, b) => Number(b.featured) - Number(a.featured))
    : mediaReferences.filter(item => item.category === category);
  const visible = expanded ? filtered : filtered.slice(0, PAGE_SIZE);

  return <section id="media" className="target-media" aria-labelledby="media-title">
    <div className="target-section-heading" data-motion="reveal">
      <p className="target-eyebrow">{t('media.eyebrow')}</p>
      <h2 id="media-title">{t('media.title')}</h2>
      <p>{t('media.subtitle')}</p>
    </div>
    <div className="media-filters" role="group" aria-label={t('media.filterLabel')}>
      {['all', ...mediaCategories].map(key => <button key={key} type="button" aria-pressed={category === key} aria-controls={listId} onClick={() => { setCategory(key); setExpanded(false); }}>
        {t(`media.categories.${key}`)}<span className="media-filter-count">{key === 'all' ? mediaReferences.length : mediaReferences.filter(item => item.category === key).length}</span>
      </button>)}
    </div>
    <p className="media-results" role="status">{t('media.results', { shown: visible.length, total: filtered.length })}</p>
    <ul id={listId} className="media-reference-grid">
      {visible.map(item => {
        const Icon = icons[item.category];
        const date = item.date && new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${item.date}T12:00:00Z`));
        return <li key={item.id}>
          <article className="media-reference-card">
            <a className="media-reference-link" href={item.url} target="_blank" rel="noopener noreferrer">
            <div className="media-reference-meta"><span className="media-reference-icon"><Icon size={20} aria-hidden="true" /></span><span>{item.outlet[language]}</span>{date && <time dateTime={item.date}>{date}</time>}</div>
            <h3>{item.title[language]}<ChevronLeft size={20} aria-hidden="true" /></h3>
            <p className="media-reference-footer">{t(`media.actions.${item.action}`)}</p>
            </a>
          </article>
        </li>;
      })}
    </ul>
    {filtered.length > PAGE_SIZE && <button className="media-show-more" type="button" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(value => !value)}>{expanded ? t('media.showLess') : t('media.showAll', { count: filtered.length })}</button>}
  </section>;
}
