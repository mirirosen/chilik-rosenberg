import { useTranslation } from 'react-i18next';
import profileImage from '../assets/hilik-cutout-provided.png';


const Hero = () => {
  const { t } = useTranslation();
  const scrollToDateSelection = () => document.getElementById('date-selection')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return (
    <header className="target-hero">
      <div className="target-hero__visual" aria-hidden="true"><img className="target-hero__food" src="/images/food/cholent-960.webp" srcSet="/images/food/cholent-480.webp 480w, /images/food/cholent-960.webp 960w" sizes="(max-width: 767px) 100vw, 37vw" width="960" height="540" fetchpriority="high" alt="" /></div>
      <div className="target-hero__copy">
        <p className="target-eyebrow">{t('hero.badge')}</p>
        <h1>{t('hero.title')}</h1>
        <p className="target-hero__subtitle">{t('hero.subtitle')}</p>
        <button onClick={scrollToDateSelection} className="target-button">{t('hero.cta')}</button>
        <button className="target-terms" onClick={() => { window.location.href = '/terms'; }}>{t('header.terms')}</button>
      </div>
      <small className="target-hero__image-note">{t('imagery.generated')}</small>
      <div className="target-hero__person-frame" aria-hidden="true">
        <img className="target-hero__person" src={profileImage} width="376" height="513" alt="" />
      </div>
    </header>
  );
};
export default Hero;
