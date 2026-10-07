import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import profileImage from '../assets/hilik-cutout-provided.png';
import { Pause, Play } from '../utils/icons';
import { useAmbientVideo } from '../hooks/useAmbientVideo';
import { useNavigation } from '../navigation/NavigationContext';
import { settle } from '../animations/registry';

// Hero v2 (board 7): one silent loop of five chapters from Chilik's own footage, full-bleed. The left two thirds stay
// clear; a veil darkens the right third, where the copy sits; Chilik stands on the line between them.
const AMBIENT = {
  webm: '/media/hero/bnei-brak-sequence.webm',
  mp4: '/media/hero/bnei-brak-sequence.mp4',
  phoneWebm: '/media/hero/bnei-brak-sequence-phone.webm',
  phoneMp4: '/media/hero/bnei-brak-sequence-phone.mp4',
  poster: '/media/hero/bnei-brak-sequence-poster.webp',
  phonePoster: '/media/hero/bnei-brak-sequence-phone-poster.webp',
};
// Chapter starts in the loop (seconds), from the media build (public/media/README.md).
export const CHAPTERS = [['food', 0], ['street', 2.2], ['store', 4.8], ['people', 6.04], ['chilik', 9.24]];
export const chapterAt = time => CHAPTERS.reduce((index, [, start], i) => (time >= start ? i : index), 0);

const Hero = () => {
  const { t } = useTranslation();
  const ambient = useAmbientVideo(AMBIENT);
  const { goToInquiry } = useNavigation();
  // Which chapter is on screen: follows the video's own clock (timeupdate, a few times a second), no extra loop.
  const [chapter, setChapter] = useState(0);
  useEffect(() => {
    const video = ambient.ref.current;
    if (!video) return undefined;
    const onTime = () => setChapter(chapterAt(video.currentTime));
    video.addEventListener('timeupdate', onTime);
    return () => video.removeEventListener('timeupdate', onTime);
  }, [ambient.ref]);
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
        <picture>
          <source media="(max-width: 767px)" srcSet={AMBIENT.phonePoster} width="576" height="720" />
          <img className="target-hero__food" data-motion="hero-food" src={AMBIENT.poster} width="1280" height="720" fetchpriority="high" alt="" />
        </picture>
        <video ref={ambient.ref} className={`target-hero__food target-hero__ambient${ambient.playing ? ' is-playing' : ''}`} muted loop playsInline preload="none" disablePictureInPicture disableRemotePlayback tabIndex={-1} />
        <div className="target-hero__veil" />
      </div>
      <div className="target-hero__copy">
        <p className="target-eyebrow" data-motion="hero-line">{t('hero.badge')}</p>
        <h1 data-motion="hero-line">{t('hero.title')}</h1>
        <p className="target-hero__subtitle" data-motion="hero-line">{t('hero.subtitle')}</p>
        <button onClick={scrollToDateSelection} className="target-button" data-motion="hero-cta">{t('hero.cta')}</button>
        <a className="target-terms" href="/terms">{t('header.terms')}</a>
      </div>
      <div className="target-hero__loop">
        <button type="button" className="target-hero__ambient-toggle" onClick={ambient.toggle} aria-label={t(ambient.on ? 'hero.ambientPause' : 'hero.ambientPlay')}>
          {ambient.on ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        {/* Where the loop is (decorative): always laid out, visible only while it is on, so it never shifts the control. */}
        <ol className={`target-hero__chapters${ambient.on ? '' : ' is-off'}`} aria-hidden="true">
          {CHAPTERS.map(([id], i) => <li key={id} className={i === chapter ? 'is-active' : undefined}><span>{t(`hero.chapters.${id}`)}</span></li>)}
        </ol>
      </div>
      <div className="target-hero__person-frame" data-motion="hero-figure" aria-hidden="true">
        <img className="target-hero__person" src={profileImage} width="376" height="513" alt="" />
      </div>
    </header>
  );
};
export default Hero;
