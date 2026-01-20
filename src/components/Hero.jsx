import heroImage from '../assets/hero-bg.jpeg';

const Hero = () => {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="relative min-h-[90vh] flex items-center justify-center bg-black overflow-hidden pt-52 pb-40 text-center">
      <img 
        src={heroImage} 
        className="absolute inset-0 w-full h-full object-cover opacity-50" 
        alt="חיליק רוזנברג בני ברק" 
        loading="eager" 
      />
      
      <div className="relative z-10 px-6 max-w-5xl mx-auto">
        <div className="inline-block bg-gold/20 text-gold px-5 py-1 rounded-full border border-gold/40 text-xs font-bold mb-8 uppercase tracking-widest text-center">
          חוויה שהיא הצגה
        </div>
        
        <h1 className="text-5xl md:text-8xl font-bold text-gold font-serif mb-8 leading-tight">
          בואו איתי למסע קולינרי בבני ברק
        </h1>
        
        <p className="text-xl md:text-3xl italic text-white/95 mb-14 font-serif text-center">
          "סיור שהוא הצגה מלאת הומור, אוכל וחיבור עמוק"
        </p>
        
        <div className="pb-16">
          <button 
            onClick={() => scrollToSection('dates-anchor')} 
            className="bg-gold text-bg-dark px-12 py-5 rounded-full font-black text-2xl shadow-2xl hover:scale-105 transition-all block mx-auto shadow-gold/20"
          >
            שריינו מקום לסיור הקרוב
          </button>
        </div>
      </div>
    </header>
  );
};

export default Hero;
