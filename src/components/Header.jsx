import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X } from '../utils/icons';
import LanguageSwitcher from './LanguageSwitcher';
import profileImage from '../assets/hilik-profile.jpeg';

const Header = () => {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };
  const goToDateSelection = () => {
    setMobileMenuOpen(false);
    if (window.location.pathname === '/') scrollToSection('date-selection');
    else window.location.href = '/#date-selection';
  };
  const goTerms = () => { window.location.href = '/terms'; };

  return <>
    <nav className="main-header fixed top-0 z-[1000] flex h-[72px] w-full items-center border-b px-0 md:h-[88px] md:px-16">
      <a href="/" className="figma-brand mr-auto flex h-full items-center gap-2 px-5 text-brand-dark no-underline md:mr-0 md:gap-3 md:px-0">
        <img src={profileImage} alt="" className="h-11 w-11 rounded-full object-cover object-top md:h-12 md:w-12" />
        <span className="font-serif text-lg font-bold leading-none md:text-2xl">{t('header.figmaName')}<small className="mt-1 block font-sans text-[9px] font-normal tracking-[.16em] text-gray-500 md:text-[10px]">{t('header.figmaTagline')}</small></span>
      </a>
      <div className="mr-auto hidden items-center gap-7 text-sm md:flex">
        <button onClick={() => scrollToSection('about')} className="nav-link">{t('header.about')}</button>
        <button onClick={() => scrollToSection('journey')} className="nav-link">{t('header.journey')}</button>
        <button onClick={() => scrollToSection('menu')} className="nav-link">{t('header.menu')}</button>
        <button onClick={goTerms} className="nav-link">{t('header.terms')}</button>
        <LanguageSwitcher />
      </div>
      <button className="figma-menu flex h-full w-[68px] items-center justify-center text-brand-dark md:mx-7 md:w-auto" onClick={() => setMobileMenuOpen(true)} aria-label={t('header.menuLabel')}><Menu size={25} strokeWidth={1.25} /></button>
      <button onClick={goToDateSelection} className="figma-header-cta order-first h-full w-[156px] bg-brand-gold px-4 font-bold text-brand-dark md:order-none md:-ml-16 md:w-auto md:px-10">{t('header.figmaUpcoming')}</button>
    </nav>
    <div className={`fixed inset-0 z-[1200] flex flex-col items-center justify-center gap-8 bg-[#4E4D50] text-center transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <button onClick={() => setMobileMenuOpen(false)} className="absolute right-8 top-8 text-brand-gold" aria-label={t('common.close')}><X size={44}/></button>
      <button onClick={() => scrollToSection('about')} className="font-serif text-3xl text-white">{t('header.about')}</button>
      <button onClick={() => scrollToSection('journey')} className="font-serif text-3xl text-white">{t('header.journey')}</button>
      <button onClick={() => scrollToSection('menu')} className="font-serif text-3xl text-white">{t('header.menu')}</button>
      <button onClick={goTerms} className="font-serif text-2xl text-white">{t('header.terms')}</button>
      <LanguageSwitcher mobile />
      <button onClick={goToDateSelection} className="bg-brand-gold px-10 py-4 text-lg font-bold text-brand-dark">{t('header.figmaUpcoming')}</button>
    </div>
  </>;
};
export default Header;
