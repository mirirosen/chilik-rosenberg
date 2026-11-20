import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tourVideos } from '../data/content';
import { populatedTourVideoGroups, tourVideoSource } from '../utils/tourVideos';
import { homeVideoSelection } from '../data/homeHighlights';
import { WATCH_VIDEO_PATH } from '../data/organicVideo';

function VideoCard({ video, titleId, language, t, preview = false }) {
  return <article className="target-videos__card" data-motion="reveal">
    <div className="target-videos__frame" style={{ aspectRatio: preview ? '4/3' : video.aspectRatio }}>
      <video src={video.src} poster={video.poster} controls playsInline preload="none" loading="lazy" aria-labelledby={titleId} className="target-videos__player">
        {(video.captions || []).filter(track => tourVideoSource(track.src) && track.srcLang).map(track => <track key={track.srcLang} kind="captions" src={tourVideoSource(track.src)} srcLang={track.srcLang} label={track.label?.[language] || track.srcLang} default={track.srcLang === language} />)}
        {t('tourVideos.unsupported')} <a href={video.src}>{t('tourVideos.openVideo')}</a>
      </video>
    </div>
    <h4 id={titleId} dir="auto" className="target-videos__title">{video.title[language]}</h4>
    {['booking', 'inquiry'].includes(import.meta.env.MODE) && video.id === 'CUYEMWo96u8' && <a className="target-videos__text-link" href={WATCH_VIDEO_PATH}>{language === 'he' ? 'לסרטון החלות ולכיתוב הנגיש' : 'Watch the challah clip with readable text'}</a>}
    {video.durationSec && <p className="target-videos__duration"><span dir="ltr">{Math.floor(video.durationSec / 60)}:{String(video.durationSec % 60).padStart(2, '0')}</span> {language === 'he' ? 'דקות' : 'min'}</p>}
  </article>;
}

export default function TourVideos({ groups = tourVideos, compact = false }) {
  const { t, i18n } = useTranslation();
  const headingId = useId();
  const disclosure = useRef(null);
  const [expanded, setExpanded] = useState(false);
  // A visitor can open native details before React hydrates the page.
  useEffect(() => { if (disclosure.current?.open) setExpanded(true); }, []);
  const populated = populatedTourVideoGroups(groups);
  if (!populated.length) return null;
  const language = (i18n?.resolvedLanguage || i18n?.language || 'he').startsWith('en') ? 'en' : 'he';
  const { featured, remainingGroups, total } = homeVideoSelection(groups);
  const cards = (items, id, preview = false) => <div className="target-videos__grid">{items.map(video => <VideoCard key={video.id} video={video} titleId={`${headingId}-${id}-${video.id}`} language={language} t={t} preview={preview} />)}</div>;
  const groupedCards = list => list.map(group => <div key={group.id} className="target-videos__group"><h3 className="target-videos__group-title">{t(`tourVideos.groups.${group.id}`)}</h3>{cards(group.items, group.id)}</div>);
  const toggle = event => {
    const open = event.currentTarget.open;
    if (!open) event.currentTarget.querySelectorAll('video').forEach(video => video.pause());
    setExpanded(open);
  };
  return <section id="videos" aria-labelledby={headingId} className="target-videos">
    <div className="target-section-heading" data-motion="reveal"><h2 id={headingId}>{t('tourVideos.title')}</h2></div>
    {compact ? <>
      {cards(featured, 'preview', true)}
      {remainingGroups.length > 0 && <details className="home-disclosure" ref={disclosure} onToggle={toggle} suppressHydrationWarning>
        <summary>{t('tourVideos.more', { count: total - featured.length })}</summary>
        {expanded ? groupedCards(remainingGroups) : <ul className="video-source-list">{remainingGroups.flatMap(group => group.items).map(video => <li key={video.id}><a href={video.src} target="_blank" rel="noopener noreferrer">{video.title[language]}</a></li>)}</ul>}
      </details>}
    </> : groupedCards(populated)}
  </section>;
}
