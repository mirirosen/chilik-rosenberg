import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { tourVideos } from '../data/content';
import { populatedTourVideoGroups, tourVideoSource } from '../utils/tourVideos';

export default function TourVideos({ groups = tourVideos }) {
  const { t, i18n } = useTranslation();
  const headingId = useId();
  const populated = populatedTourVideoGroups(groups);
  if (!populated.length) return null;
  const language = (i18n.resolvedLanguage || i18n.language || 'he').startsWith('en') ? 'en' : 'he';

  return <section id="videos" aria-labelledby={headingId} className="py-20 md:py-24 bg-brand-dark text-brand-text border-b border-white/5">
    <div className="max-w-6xl mx-auto px-6 text-start">
      <h2 id={headingId} className="text-3xl sm:text-4xl md:text-5xl font-serif text-brand-gold mb-10">{t('tourVideos.title')}</h2>
      <div className="space-y-12">
        {populated.map(group => <div key={group.id}>
          <h3 className="text-2xl font-serif text-brand-gold mb-6">{t(`tourVideos.groups.${group.id}`)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {group.items.map((video, index) => {
              const titleId = `${headingId}-${group.id}-${index}`;
              return <article key={video.id} className="min-w-0">
                <div className="w-full bg-brand-dark-lighter rounded-xl" style={{ aspectRatio: video.aspectRatio }}>
                  <video src={video.src} poster={video.poster} controls playsInline preload="metadata" aria-labelledby={titleId} className="block h-full w-full rounded-xl object-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold">
                    {(video.captions || []).filter(track => tourVideoSource(track.src) && track.srcLang).map(track => <track key={track.srcLang} kind="captions" src={tourVideoSource(track.src)} srcLang={track.srcLang} label={track.label?.[language] || track.srcLang} default={track.srcLang === language} />)}
                    {t('tourVideos.unsupported')} <a href={video.src}>{t('tourVideos.openVideo')}</a>
                  </video>
                </div>
                <h4 id={titleId} dir="auto" className="mt-3 text-lg font-semibold break-words">{video.title[language]}</h4>
              </article>;
            })}
          </div>
        </div>)}
      </div>
    </div>
  </section>;
}
