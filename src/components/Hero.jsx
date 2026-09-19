import { useTranslation } from 'react-i18next';
import profileImage from '../assets/hilik-standing.webp';

const Hero = () => {
  const { t } = useTranslation();

  const scrollToDateSelection = () => {
    document.getElementById('date-selection')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="figma-hero relative min-h-[760px] md:min-h-[720px] overflow-hidden pt-24 text-white">
      <div className="figma-hero-overlay absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-[660px] max-w-5xl flex-col items-center px-6 pb-[340px] pt-20 text-center md:min-h-[632px] md:px-16 md:pb-[290px] md:pt-16">
        <div className="max-w-3xl">
          <p className="figma-eyebrow mb-6 text-sm font-medium tracking-[.38em] text-white/85">
            {t('hero.figmaEyebrow')}
          </p>
          <h1 className="figma-title mb-7 max-w-3xl font-serif text-5xl font-medium leading-[1.05] text-white md:text-7xl">
            {t('hero.figmaTitle')}
          </h1>
          <p className="mx-auto max-w-2xl text-base font-light leading-8 text-white/90 md:text-lg md:leading-9">
            {t('hero.figmaDescription')}
          </p>
          <button
            onClick={scrollToDateSelection}
            className="figma-cta mt-6 inline-flex min-w-44 items-center justify-between gap-10 bg-brand-gold px-8 py-5 text-lg font-bold text-brand-dark transition hover:brightness-105"
            aria-label={t('hero.cta')}
          >
            <span>{t('hero.figmaCta')}</span><span aria-hidden="true">←</span>
          </button>
        </div>
        <div className="figma-portrait absolute bottom-0 left-1/2 h-[300px] w-[235px] -translate-x-1/2 overflow-hidden md:h-[360px] md:w-[280px]">
          <img src={profileImage} alt={t('header.title')} className="h-full w-full object-contain object-bottom" />
        </div>
      </div>
    </header>
  );
};

export default Hero;
