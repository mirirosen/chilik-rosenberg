import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { tourVideos } from '../data/content';
import { populatedTourVideoGroups, tourVideoSource } from '../utils/tourVideos';

// Plan §18 (S8): the tour videos sit right after the intro, in the site's light design. Native players with a
// poster each and preload="none", so no video bytes are requested before a visitor presses play.
export default function TourVideos({ groups = tourVideos }) {
  const { t, i18n } = useTranslation();
  const headingId = useId();
  const populated = populatedTourVideoGroups(groups);
  if (!populated.length) return null;
  const language = (i18n.resolvedLanguage || i18n.language || 'he').startsWith('en') ? 'en' : 'he';

  return <section id="videos" aria-labelledby={headingId} className="target-videos">
    <div className="target-section-heading" data-motion="reveal">
      <h2 id={headingId}>{t('tourVideos.title')}</h2>
    </div>
    {populated.map(group => <div key={group.id} className="target-videos__group">
      <h3 className="target-videos__group-title">{t(`tourVideos.groups.${group.id}`)}</h3>
      <div className="target-videos__grid">
        {group.items.map((video, index) => {
          const titleId = `${headingId}-${group.id}-${index}`;
          return <article key={video.id} className={`target-videos__card${index === 0 ? ' target-videos__card--featured' : ''}`} data-motion="reveal">
            <div className="target-videos__frame" style={{ aspectRatio: video.aspectRatio }}>
              <video src={video.src} poster={video.poster} controls playsInline preload="none" aria-labelledby={titleId} className="target-videos__player">
                {(video.captions || []).filter(track => tourVideoSource(track.src) && track.srcLang).map(track => <track key={track.srcLang} kind="captions" src={tourVideoSource(track.src)} srcLang={track.srcLang} label={track.label?.[language] || track.srcLang} default={track.srcLang === language} />)}
                {t('tourVideos.unsupported')} <a href={video.src}>{t('tourVideos.openVideo')}</a>
              </video>
            </div>
            <h4 id={titleId} dir="auto" className="target-videos__title">{video.title[language]}</h4>
          </article>;
        })}
      </div>
    </div>)}
  </section>;
}
