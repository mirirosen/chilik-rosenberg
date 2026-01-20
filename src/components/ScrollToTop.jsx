import { ArrowUp } from 'lucide-react';
import { useScrollProgress } from '../hooks/useScrollProgress';

const ScrollToTop = () => {
  const { showScrollTop } = useScrollProgress();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!showScrollTop) return null;

  return (
    <button 
      onClick={scrollToTop} 
      className="fixed bottom-6 right-6 z-[1100] bg-white/10 text-gold p-4 rounded-full backdrop-blur-md border border-white/10 shadow-2xl floating-btn flex items-center justify-center hover:bg-white/20 transition-all"
    >
      <ArrowUp size={24} />
    </button>
  );
};

export default ScrollToTop;
