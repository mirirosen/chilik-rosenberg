import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from '../utils/icons';
import { viewportSettings } from '../styles/designSystem';

const FAQ = () => {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState(null);
  const prefersReduced = useReducedMotion();

  const faqKeys = ['q1', 'q2', 'q3', 'q4', 'q5'];

  const handleFAQToggle = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section id="faq" className="py-32 max-w-4xl mx-auto px-6 text-right">
      <motion.h2
        className="text-5xl font-serif text-brand-gold mb-16 italic text-center font-bold"
        initial={prefersReduced ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportSettings}
        transition={{ duration: 0.5 }}
      >
        {t('faq.title')}
      </motion.h2>

      <div className="space-y-4 text-right">
        {faqKeys.map((key, i) => (
          <motion.article
            key={i}
            className="bg-brand-dark-lighter rounded-3xl border border-white/5 overflow-hidden text-right"
            initial={prefersReduced ? false : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportSettings}
            transition={{
              duration: 0.4,
              delay: prefersReduced ? 0 : i * 0.08,
            }}
          >
            <button
              onClick={() => handleFAQToggle(i)}
              className="w-full p-8 text-right flex flex-row-reverse items-center justify-between hover:bg-white/5 transition-colors"
              aria-expanded={openFaq === i}
            >
              <motion.span
                animate={{ rotate: openFaq === i ? 180 : 0 }}
                transition={{ duration: prefersReduced ? 0 : 0.2 }}
                className="flex-shrink-0"
              >
                <ChevronDown className="text-gray-400" />
              </motion.span>
              <h4 className="text-xl font-bold text-brand-gold font-serif text-right">
                {t(`faqs.${key}.question`)}
              </h4>
            </button>

            <AnimatePresence initial={false}>
              {openFaq === i && (
                <motion.div
                  key="answer"
                  initial={prefersReduced ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={prefersReduced ? {} : { height: 0, opacity: 0 }}
                  transition={{ duration: prefersReduced ? 0 : 0.25, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-8 pb-8 text-gray-400 leading-relaxed border-t border-white/5 font-light text-right">
                    {t(`faqs.${key}.answer`)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.article>
        ))}
      </div>
    </section>
  );
};

export default FAQ;
