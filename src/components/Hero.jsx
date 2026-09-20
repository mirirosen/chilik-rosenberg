import { useTranslation } from 'react-i18next';
import profileImage from '../assets/hilik-profile.jpeg';


const Hero = () => {
  const { t } = useTranslation();
  const scrollToDateSelection = () => document.getElementById('date-selection')?.scrollIntoView({ behavior: 'smooth' });
  return (
    <header className="target-hero">
      <div className="target-hero__visual" aria-hidden="true"><img className="target-hero__food" src="/hero-images/img1.jpg" alt="" /><img className="target-hero__person" src={profileImage} alt="" /></div>
      <div className="target-hero__copy">
        <p className="target-eyebrow">{t('hero.badge')}</p>
        <h1>{t('hero.title')}</h1>
        <p className="target-hero__subtitle">{t('hero.subtitle')}</p>
        <button onClick={scrollToDateSelection} className="target-button">{t('hero.cta')}</button>
        <button className="target-terms" onClick={() => { window.location.href = '/terms'; }}>{t('header.terms')}</button>
      </div>
    </header>
  );
};
export default Hero;
