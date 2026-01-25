import { useState } from 'react';
import { ChevronDown } from '../utils/icons';
import { faqs } from '../data/content';

const FAQ = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const handleFAQToggle = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section id="faq" className="py-32 max-w-4xl mx-auto px-6 text-right">
      <h2 className="text-5xl font-serif text-brand-gold mb-16 italic text-center font-bold">
        שאלות נפוצות
      </h2>
      
      <div className="space-y-4 text-right">
        {faqs.map((faq, i) => (
          <article 
            key={i} 
            className="bg-brand-dark-lighter rounded-3xl border border-white/5 overflow-hidden text-right"
          >
            <button 
              onClick={() => handleFAQToggle(i)} 
              className="w-full p-8 text-right flex flex-row-reverse items-center justify-between hover:bg-white/5"
            >
              <ChevronDown 
                className={`text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
              />
              <h4 className="text-xl font-bold text-brand-gold font-serif text-right">
                {faq.q}
              </h4>
            </button>
            
            {openFaq === i && (
              <div className="px-8 pb-8 text-gray-400 leading-relaxed border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300 font-light text-right">
                {faq.a}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default FAQ;
