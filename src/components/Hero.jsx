import { useTranslation } from 'react-i18next';
import profileImage from '../assets/hilik-cutout-provided.png';
import { Pause, Play } from '../utils/icons';
import { useAmbientVideo } from '../hooks/useAmbientVideo';
import { useNavigation } from '../navigation/NavigationContext';
import { settle } from '../animations/registry';

// Silent Bnei Brak loop built from Chilik's own footage (storefront, deli shelf, kugel, salad counter).
const AMBIENT = {
  webm: '/media/hero/bnei-brak-ambient.webm',
  mp4: '/media/hero/bnei-brak-ambient.mp4',
  poster: '/media/hero/bnei-brak-ambient-poster.webp',
};

const Hero = () => {
  const { t } = useTranslation();
  const ambient = useAmbientVideo(AMBIENT);
  const { goToInquiry } = useNavigation();
  const scrollToDateSelection = () => {
    if (goToInquiry) { goToInquiry(); return; }
    const section = document.getElementById('date-selection');
    settle(section);
    section?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return (
    <header className="target-hero">
      <div className={`target-hero__visual${ambient.playing ? ' is-ambient-playing' : ''}`} aria-hidden="true">
        {/* The poster stays the LCP element; the video only fades in over it once it is playing. */}
        <img className="target-hero__food" data-motion="hero-food" src={AMBIENT.poster} width="720" height="720" fetchpriority="high" alt="" />
        <video ref={ambient.ref} className={`target-hero__food target-hero__ambient${ambient.playing ? ' is-playing' : ''}`} poster={AMBIENT.poster} muted loop playsInline preload="none" disablePictureInPicture disableRemotePlayback tabIndex={-1} />
      </div>
      <div className="target-hero__copy">
        <p className="target-eyebrow" data-motion="hero-line">{t('hero.badge')}</p>
        <h1 data-motion="hero-line">{t('hero.title')}</h1>
        <p className="target-hero__subtitle" data-motion="hero-line">{t('hero.subtitle')}</p>
        <button onClick={scrollToDateSelection} className="target-button" data-motion="hero-cta">{t('hero.cta')}</button>
        <a className="target-terms" href="/terms">{t('header.terms')}</a>
      </div>
      <button type="button" className="target-hero__ambient-toggle" onClick={ambient.toggle} aria-label={t(ambient.on ? 'hero.ambientPause' : 'hero.ambientPlay')}>
        {ambient.on ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
      </button>
      <div className="target-hero__person-frame" data-motion="hero-figure" aria-hidden="true">
        <img className="target-hero__person" src={profileImage} width="376" height="513" alt="" />
      </div>
    </header>
  );
};
export default Hero;
