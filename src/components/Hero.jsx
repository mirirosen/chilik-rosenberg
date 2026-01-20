import { useState, useEffect } from 'react';
import heroImage from '../assets/hero-bg.jpeg';

const Hero = () => {
  // ============================================
  // HERO IMAGES CONFIGURATION
  // ============================================
  
  // PRODUCTION MODE: Local images (add your images to public/hero-images/)
  const heroImages = [
    'hero-images/img1.jpg',  // Jewish food theme (Challah, Shabbat table)
    'hero-images/img2.jpg',  // Bakery scene (Vizhnitz bakery, pastries)
    'hero-images/img3.jpg',  // Bnei Brak cityscape (streets, iconic locations)
    'hero-images/img4.jpg',  // Bnei Brak cityscape (streets, iconic locations)
    'hero-images/img5.jpg',  // Bnei Brak cityscape (streets, iconic locations)
    'hero-images/img6.jpg',  // Bnei Brak cityscape (streets, iconic locations)
    'hero-images/img7.jpg',  // Bnei Brak cityscape (streets, iconic locations)
  ];
  
  // TESTING FALLBACK: External Unsplash URLs (if local images not found)
  // const heroImages = [
  //   'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=1920&q=80', // Jewish challah bread
  //   'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1920&q=80', // Bakery scene
  //   'https://images.unsplash.com/photo-1549918864-48ac978761a4?w=1920&q=80'  // Jerusalem Old City at night
  // ];
  
  // ============================================
  // SLIDESHOW STATE & LOGIC
  // ============================================
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  useEffect(() => {
    // Cycle through images every 5 seconds
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % heroImages.length
      );
    }, 5000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [heroImages.length]);
  
  // ============================================
  // NAVIGATION HELPER
  // ============================================
  
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="relative min-h-[90vh] flex items-center justify-center bg-black overflow-hidden pt-52 pb-40 text-center">
      {/* ============================================ */}
      {/* CINEMATIC IMAGE SLIDESHOW (Ken Burns Effect) */}
      {/* ============================================ */}
      
      {heroImages.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-[2000ms] ease-in-out ${
            index === currentImageIndex
              ? 'opacity-100 scale-110'  // Active: Visible + Zoomed In
              : 'opacity-0 scale-100'     // Inactive: Hidden + Normal Scale
          }`}
          style={{
            backgroundImage: `url(${image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-hidden="true"
        />
      ))}
      
      {/* ============================================ */}
      {/* DARK OVERLAY (Ensures Text Readability)     */}
      {/* ============================================ */}
      
      <div 
        className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-[1]"
        aria-hidden="true"
      />
      
      {/* ============================================ */}
      {/* HERO CONTENT (Always on Top)                */}
      {/* ============================================ */}
      
      <div className="relative z-10 px-6 max-w-5xl mx-auto">
        <div className="inline-block bg-brand-gold/20 text-brand-gold px-5 py-1 rounded-full border border-brand-gold/40 text-xs font-bold mb-8 uppercase tracking-widest text-center backdrop-blur-sm">
          חוויה שהיא הצגה
        </div>
        
        <h1 className="text-5xl md:text-8xl font-bold text-brand-gold font-serif mb-8 leading-tight drop-shadow-2xl">
          בואו איתי למסע קולינרי בבני ברק
        </h1>
        
        <p className="text-xl md:text-3xl italic text-white mb-14 font-serif text-center drop-shadow-lg">
          "סיור שהוא הצגה מלאת הומור, אוכל וחיבור עמוק"
        </p>
        
        <div className="pb-16">
          <button 
            onClick={() => scrollToSection('dates-anchor')} 
            className="bg-brand-gold text-brand-dark px-12 py-5 rounded-full font-black text-2xl shadow-2xl hover:scale-105 transition-all block mx-auto shadow-brand-gold/20 relative z-20 cursor-pointer"
            aria-label="Book a tour"
          >
            שריינו מקום לסיור הקרוב
          </button>
        </div>
      </div>
      
      {/* ============================================ */}
      {/* SLIDESHOW INDICATOR DOTS (Optional)         */}
      {/* ============================================ */}
      
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentImageIndex
                ? 'bg-brand-gold w-8'
                : 'bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </header>
  );
};

export default Hero;
