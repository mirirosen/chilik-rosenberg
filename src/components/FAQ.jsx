import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from '../utils/icons';

const FAQ = () => {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState(null);

  // FAQ keys
  const faqKeys = Object.keys(t('faqs', { returnObjects: true }));

  const handleFAQToggle = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section id="faq" className="py-32 max-w-4xl mx-auto px-6 text-right">
      <h2 className="text-5xl font-serif text-brand-gold mb-16 italic text-center font-bold">
        {t('faq.title')}
      </h2>

      <div className="space-y-4 text-right">
        {faqKeys.map((key, i) => (
          <article
            key={i}
            className="bg-brand-dark-lighter rounded-3xl border border-white/5 overflow-hidden text-right"
          >
            <h3>
            <button
              type="button"
              onClick={() => handleFAQToggle(i)}
              aria-expanded={openFaq === i}
              aria-controls={`faq-answer-${key}`}
              id={`faq-question-${key}`}
              className="w-full p-8 text-right flex flex-row-reverse items-center justify-between hover:bg-white/5"
            >
              <ChevronDown
                className={`text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
              />
              <span className="text-xl font-bold text-brand-gold font-serif text-right">
                {t(`faqs.${key}.question`)}
              </span>
            </button>
            </h3>

              <div
                hidden={openFaq !== i}
                id={`faq-answer-${key}`}
                role="region"
                aria-labelledby={`faq-question-${key}`}
                className="px-8 pb-8 text-gray-400 leading-relaxed border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300 font-light text-right"
              >
                {t(`faqs.${key}.answer`)}
                {key === 'q12' && <a href="/terms" className="underline block">{t('footer.terms')}</a>}
              </div>

          </article>
        ))}
      </div>
    </section>
  );
};

export default FAQ;
