import { MessageCircle, HelpCircle } from 'lucide-react';
import { whatsappNumber } from '../data/content';

const HelpHub = () => {
  const openFaqSection = () => {
    const el = document.getElementById('faq');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[1100] flex flex-row-reverse items-center gap-4">
      <a 
        href={`https://wa.me/${whatsappNumber}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="hub-btn hub-btn-whatsapp pulse text-center"
      >
        <MessageCircle size={24} />
        <span>להרשמה</span>
      </a>
      
      <button 
        onClick={openFaqSection} 
        className="hub-btn hub-btn-faq text-center"
      >
        <HelpCircle size={22} />
        <span>שאלות?</span>
      </button>
    </div>
  );
};

export default HelpHub;
