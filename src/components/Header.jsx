import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X } from '../utils/icons';
import LanguageSwitcher from './LanguageSwitcher';

const Header = ({ showVideos = false }) => {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 1280px)');
    const closeOnDesktop = (event) => {
      if (event.matches) setMobileMenuOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      document.body.style.overflow = previousOverflow;
      // Native dialog restores focus to the opener and keeps background controls inert.
      dialog.close();
    };
  }, [mobileMenuOpen]);

  const scrollToSection = (id, event) => {
    // Keep real hrefs for keyboard, no-JS and modified-click navigation.
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
    if (event) event.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    } else {
      window.location.href = `/#${id}`;
    }
  };

  const sections = [
    ['about', 'header.about'],
    ['journey', 'header.journey'],
    ['menu', 'header.menu'],
    ['lectures', 'header.lectures'],
    ...(showVideos ? [['videos', 'tourVideos.nav']] : []),
    ['date-selection', 'header.dates'],
  ];

  return (
    <>
      <nav className="main-header fixed top-0 w-full z-[1000] px-6 md:px-16 py-4 flex justify-between items-center text-right" aria-label={t('header.menuButton')}>
        <a href="/" className="header-brand text-xl md:text-3xl font-black text-brand-gold font-serif tracking-tighter">
          <span className="header-brand__full">{t('header.title')}</span>
          <span className="header-brand__short">{t('header.titleShort')}</span>
        </a>
        <div className="hidden xl:flex gap-8 text-gray-200 text-sm items-center">
          {sections.map(([id, label]) => (
            <a key={id} href={`/#${id}`} onClick={event => scrollToSection(id, event)} className="nav-link">{t(label)}</a>
          ))}
          <a href="/terms" className="nav-link text-gray-400 hover:text-white">{t('header.terms')}</a>
          <LanguageSwitcher />
          <button type="button" onClick={() => scrollToSection('date-selection')} className="header-cta bg-brand-gold text-brand-dark px-6 py-2 rounded-full font-black hover:scale-105 transition-all">
            {t('header.register')}
          </button>
        </div>
        <button type="button" className="mobile-menu-trigger xl:hidden text-brand-gold" onClick={() => setMobileMenuOpen(true)} aria-label={t('header.menuButton')} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation" aria-haspopup="dialog">
          <Menu size={32} aria-hidden="true" />
        </button>
        <a href="/#date-selection" className="mobile-header-cta xl:hidden" onClick={event => scrollToSection('date-selection', event)}>{t('header.upcomingTours')}</a>
      </nav>

      <dialog ref={dialogRef} id="mobile-navigation" className="mobile-navigation" aria-label={t('header.menuButton')} onCancel={(event) => { event.preventDefault(); setMobileMenuOpen(false); }}>
        <div className="mobile-navigation__content">
          <button type="button" autoFocus onClick={() => setMobileMenuOpen(false)} className="mobile-navigation__close text-brand-gold" aria-label={t('common.close')}>
            <X size={32} aria-hidden="true" />
          </button>
          {sections.map(([id, label]) => (
            <a key={id} href={`/#${id}`} onClick={event => scrollToSection(id, event)} className="text-2xl text-white font-serif">{t(label)}</a>
          ))}
          <a href="/terms" className="text-xl text-gray-300 font-serif">{t('header.terms')}</a>
          <LanguageSwitcher mobile />
          <button type="button" onClick={() => scrollToSection('date-selection')} className="bg-brand-gold text-black px-8 py-4 rounded-full font-black text-xl">
            {t('header.register')}
          </button>
        </div>
      </dialog>
    </>
  );
};

export default Header;
