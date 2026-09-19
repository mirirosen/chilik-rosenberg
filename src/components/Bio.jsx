import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import profileImage from '../assets/hilik-profile.jpeg';
import { Section } from './design-system';
import { viewportSettings } from '../styles/designSystem';

const Bio = () => {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();

  return (
    <Section id="about" animate={false} className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center gap-16 md:gap-24">

          {/* Image — premium framing */}
          <motion.div
            className="w-full md:w-2/5 flex-shrink-0"
            initial={prefersReduced ? false : { opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportSettings}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {/* Gold ring frame */}
            <div className="relative">
              <div className="absolute -inset-1 rounded-5xl bg-brand-gold/20 blur-sm" />
              <div className="relative rounded-5xl overflow-hidden border border-brand-gold/30">
                <img
                  src={profileImage}
                  alt={t('bio.title')}
                  className="w-full object-cover object-top"
                  style={{ aspectRatio: '4/5' }}
                />
                {/* Subtle bottom gradient for text legibility continuity */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-brand-dark/60 to-transparent" />
              </div>
            </div>
          </motion.div>

          {/* Text */}
          <motion.article
            className="w-full md:w-3/5 text-right"
            initial={prefersReduced ? false : { opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportSettings}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          >
            {/* Gold accent line */}
            <div className="w-12 h-0.5 bg-brand-gold mb-6 mr-auto ml-0 md:mr-0 md:ml-auto" />

            <h2 className="text-4xl md:text-5xl font-serif text-brand-gold mb-6 italic font-bold leading-tight">
              {t('bio.title')}
            </h2>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed font-serif">
              {t('bio.text')}
            </p>
          </motion.article>

        </div>
      </div>
    </Section>
  );
};

export default Bio;
