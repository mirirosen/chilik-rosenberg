import { useTranslation } from 'react-i18next';
import profileImage from '../assets/hilik-cutout-provided.webp';
import { mediaReferences } from '../data/mediaReferences';

const tourSources = ['mako-tour', 'kan-moreshet'].map(id => mediaReferences.find(source => source.id === id));

export default function Bio() {
  const { t, i18n } = useTranslation();
  const language = (i18n?.resolvedLanguage || i18n?.language || 'he').startsWith('en') ? 'en' : 'he';
  return <section id="about" className="target-bio" aria-labelledby="bio-title">
    <div className="target-bio__introduction" data-motion="reveal">
      <h2 id="bio-title">{t('bio.title')}</h2>
      <p>{t('bio.paragraphs.0')}</p><p>{t('bio.paragraphs.1')}</p>
    </div>
    <img src={profileImage} alt={t('header.title')} loading="lazy" width="376" height="513" />
    <div className="target-bio__invitation" data-motion="reveal">
      <p>{t('bio.paragraphs.2')}</p><p>{t('bio.paragraphs.3')}</p>
      <p><strong>{t('bio.paragraphs.4')}</strong></p>
      <nav className="target-bio__sources" aria-label={t('bio.sourcesTitle')}>
        <h3>{t('bio.sourcesTitle')}</h3>
        <ul>{tourSources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.outlet[language]} — {source.title[language]}</a></li>)}</ul>
      </nav>
    </div>
  </section>;
}
