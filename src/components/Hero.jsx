import { useState, useEffect } from 'react';
import heroImage from '../assets/hero-bg.jpeg';

const Hero = () => {
  // ============================================
  // HERO IMAGES CONFIGURATION
  // ============================================
  
  // PRODUCTION MODE: Local images (add your images to public/hero-images/)
  const heroImages = [
    'hero-images/img1.jpg',  // Jewish food theme (Challah, Shabbat table)
    'hero-images/img2.jpg'  // Bakery scene (Vizhnitz bakery, pastries)
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
        className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75 z-[1]"
        aria-hidden="true"
      />
      
      {/* ============================================ */}
      {/* HERO CONTENT (Always on Top)                */}
      {/* ============================================ */}
      
      <div className="relative z-10 px-6 max-w-6xl mx-auto">
        {/* Glassmorphism Badge - Staggered Entry */}
        <div className="hero-badge inline-block bg-white/10 text-brand-gold px-6 py-2 rounded-full border-2 border-brand-gold/50 text-sm font-bold mb-10 uppercase tracking-widest text-center backdrop-blur-md shadow-2xl">
          חוויה שהיא הצגה
        </div>
        
        {/* Main Title - Premium Typography */}
        <h1 className="hero-title text-6xl md:text-9xl font-black text-brand-gold font-serif mb-10 leading-[1.1] drop-shadow-2xl" style={{ textShadow: '0 10px 40px rgba(233, 196, 106, 0.5), 0 0 80px rgba(233, 196, 106, 0.3)' }}>
          בואו איתי למסע קולינרי בבני ברק
        </h1>
        
        {/* Subtitle - Enhanced Readability */}
        <p className="hero-subtitle text-2xl md:text-4xl italic text-white/95 mb-16 font-serif text-center drop-shadow-2xl leading-relaxed" style={{ textShadow: '0 4px 20px rgba(0, 0, 0, 0.8)' }}>
          "סיור שהוא הצגה מלאת הומור, אוכל וחיבור עמוק"
        </p>
        
        {/* CTA Button - Gold Glow Effect */}
        <div className="hero-button pb-20">
          <button 
            onClick={() => {
              window.history.pushState({}, '', '/booking');
              window.location.href = '/booking';
            }} 
            className="bg-brand-gold text-brand-dark px-14 py-6 rounded-full font-black text-3xl shadow-2xl hover:scale-110 hover:shadow-brand-gold/60 transition-all duration-300 block mx-auto relative z-20 cursor-pointer"
            style={{ boxShadow: '0 0 40px rgba(233, 196, 106, 0.4), 0 10px 30px rgba(0, 0, 0, 0.5)' }}
            aria-label="Book a tour"
          >
            הרשמה לסיור
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
