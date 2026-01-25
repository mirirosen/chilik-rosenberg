import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X } from '../utils/icons';
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Main Header */}
      <nav className="main-header fixed top-0 w-full z-[1000] px-6 md:px-16 py-4 flex justify-between items-center text-right">
        <a href="/" className="text-xl md:text-3xl font-black text-brand-gold font-serif tracking-tighter">
          {t('header.title')}
        </a>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-8 text-gray-200 text-sm items-center">
          <button onClick={() => scrollToSection('about')} className="nav-link">
            {t('header.about')}
          </button>
          <button onClick={() => scrollToSection('journey')} className="nav-link">
            {t('header.journey')}
          </button>
          <button onClick={() => scrollToSection('menu')} className="nav-link">
            {t('header.menu')}
          </button>
          <button onClick={() => scrollToSection('dates-anchor')} className="nav-link text-brand-gold">
            {t('header.dates')}
          </button>
          <button 
            onClick={() => {
              window.history.pushState({}, '', '/terms');
              window.location.href = '/terms';
            }} 
            className="nav-link text-gray-400 hover:text-white"
          >
            {t('header.terms')}
          </button>
          <LanguageSwitcher />
          <button 
            onClick={() => {
              window.history.pushState({}, '', '/booking');
              window.location.href = '/booking';
            }} 
            className="bg-brand-gold text-brand-dark px-6 py-2 rounded-full font-black hover:scale-105 transition-all"
          >
            {t('header.register')}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-brand-gold" 
          onClick={() => setMobileMenuOpen(true)}
          aria-label="תפריט"
        >
          <Menu size={32} />
        </button>
      </nav>

      {/* Mobile Menu */}
      <div 
        className={`fixed inset-0 bg-brand-dark z-[1200] flex flex-col items-center justify-center gap-8 text-center transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button 
          onClick={() => setMobileMenuOpen(false)} 
          className="absolute top-8 right-8 text-brand-gold"
        >
          <X size={48} />
        </button>
        
        <button 
          onClick={() => scrollToSection('about')} 
          className="text-3xl text-white font-serif"
        >
          {t('header.about')}
        </button>
        <button 
          onClick={() => scrollToSection('journey')} 
          className="text-3xl text-white font-serif"
        >
          {t('header.journey')}
        </button>
        <button 
          onClick={() => scrollToSection('menu')} 
          className="text-3xl text-white font-serif"
        >
          {t('header.menu')}
        </button>
        <button 
          onClick={() => {
            setMobileMenuOpen(false);
            window.history.pushState({}, '', '/terms');
            window.location.href = '/terms';
          }} 
          className="text-2xl text-gray-300 font-serif"
        >
          {t('header.terms')}
        </button>
        
        <LanguageSwitcher mobile={true} />
        
        <button 
          onClick={() => {
            setMobileMenuOpen(false);
            window.history.pushState({}, '', '/booking');
            window.location.href = '/booking';
          }} 
          className="bg-brand-gold text-black px-12 py-4 rounded-full font-black text-xl shadow-lg"
        >
          {t('header.register')}
        </button>
      </div>
    </>
  );
};

export default Header;
