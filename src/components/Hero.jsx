import { useTranslation } from 'react-i18next';
import profileImage from '../assets/hilik-profile.jpeg';

const Hero = () => {
  const { t } = useTranslation();

  const scrollToDateSelection = () => {
    document.getElementById('date-selection')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="figma-hero relative min-h-[760px] md:min-h-[720px] overflow-hidden pt-24 text-white">
      <div className="figma-hero-overlay absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 mx-auto grid min-h-[660px] max-w-7xl grid-cols-1 items-center gap-8 px-6 pb-0 pt-20 md:grid-cols-[1.25fr_.75fr] md:px-16 md:pt-10">
        <div className="text-right">
          <p className="figma-eyebrow mb-6 text-sm font-medium tracking-[.38em] text-white/85">
            {t('hero.figmaEyebrow')}
          </p>
          <h1 className="figma-title mb-7 max-w-3xl font-serif text-5xl font-medium leading-[1.05] text-white md:text-7xl">
            {t('hero.figmaTitle')}
          </h1>
          <p className="max-w-2xl text-base font-light leading-8 text-white/90 md:text-lg md:leading-9">
            {t('hero.figmaDescription')}
          </p>
          <button
            onClick={scrollToDateSelection}
            className="figma-cta mt-10 inline-flex min-w-44 items-center justify-between gap-10 bg-brand-gold px-8 py-5 text-lg font-bold text-brand-dark transition hover:brightness-105"
            aria-label={t('hero.cta')}
          >
            <span>{t('hero.figmaCta')}</span><span aria-hidden="true">←</span>
          </button>
        </div>
        <div className="figma-portrait self-end justify-self-center md:justify-self-end">
          <img src={profileImage} alt={t('header.title')} className="h-[390px] w-[280px] rounded-t-[150px] object-cover object-top md:h-[520px] md:w-[370px]" />
        </div>
      </div>
    </header>
  );
};

export default Hero;
