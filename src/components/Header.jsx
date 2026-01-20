import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const Header = () => {
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
        <a href="/" className="text-xl md:text-3xl font-black text-gold font-serif tracking-tighter">
          חיליק רוזנברג | סיורים בבני ברק
        </a>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-8 text-gray-200 text-sm items-center">
          <button onClick={() => scrollToSection('about')} className="nav-link">
            מי אני?
          </button>
          <button onClick={() => scrollToSection('journey')} className="nav-link">
            מה רואים?
          </button>
          <button onClick={() => scrollToSection('menu')} className="nav-link">
            מה אוכלים?
          </button>
          <button onClick={() => scrollToSection('dates-anchor')} className="nav-link text-gold">
            מתי יש סיור?
          </button>
          <button 
            onClick={() => scrollToSection('dates-anchor')} 
            className="bg-gold text-bg-dark px-6 py-2 rounded-full font-black hover:scale-105 transition-all"
          >
            להרשמה
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-gold" 
          onClick={() => setMobileMenuOpen(true)}
          aria-label="תפריט"
        >
          <Menu size={32} />
        </button>
      </nav>

      {/* Mobile Menu */}
      <div 
        className={`fixed inset-0 bg-bg-dark z-[1200] flex flex-col items-center justify-center gap-8 text-center transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button 
          onClick={() => setMobileMenuOpen(false)} 
          className="absolute top-8 left-8 text-gold"
        >
          <X size={48} />
        </button>
        
        <button 
          onClick={() => scrollToSection('about')} 
          className="text-3xl text-white font-serif"
        >
          מי אני?
        </button>
        <button 
          onClick={() => scrollToSection('journey')} 
          className="text-3xl text-white font-serif"
        >
          מה רואים?
        </button>
        <button 
          onClick={() => scrollToSection('menu')} 
          className="text-3xl text-white font-serif"
        >
          מה אוכלים?
        </button>
        <button 
          onClick={() => scrollToSection('dates-anchor')} 
          className="bg-gold text-black px-12 py-4 rounded-full font-black text-xl shadow-lg"
        >
          להרשמה עכשיו
        </button>
      </div>
    </>
  );
};

export default Header;
