import { MessageCircle, HelpCircle } from '../utils/icons';
import { whatsappNumber } from '../data/content';

const HelpHub = () => {
  const openFaqSection = () => {
    const el = document.getElementById('faq');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1100] flex flex-row items-center gap-4">
      <button 
        onClick={openFaqSection} 
        className="hub-btn hub-btn-faq text-center"
      >
        <HelpCircle size={22} />
        <span>שאלות?</span>
      </button>
      
      <a 
        href={`https://wa.me/${whatsappNumber}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className="hub-btn hub-btn-whatsapp pulse text-center"
      >
        <MessageCircle size={24} />
        <span>להרשמה</span>
      </a>
    </div>
  );
};

export default HelpHub;
