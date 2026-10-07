import { useTranslation } from 'react-i18next';
import profileImage from '../assets/hilik-cutout-provided.png';

export default function Bio() {
  const { t } = useTranslation();
  return <section id="about" className="target-bio" aria-labelledby="bio-title">
    <div className="target-bio__introduction" data-motion="reveal">
      <h2 id="bio-title">{t('bio.title')}</h2>
      <p>{t('bio.paragraphs.0')}</p><p>{t('bio.paragraphs.1')}</p>
    </div>
    <img src={profileImage} alt={t('header.title')} loading="lazy" width="376" height="513" />
    <div className="target-bio__invitation" data-motion="reveal">
      <p>{t('bio.paragraphs.2')}</p><p>{t('bio.paragraphs.3')}</p>
      <p><strong>{t('bio.paragraphs.4')}</strong></p>
    </div>
  </section>;
}
