import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Star } from '../utils/icons';
import { viewportSettings } from '../styles/designSystem';

const REASONS = [
  { key: 'reason1', number: '01' },
  { key: 'reason2', number: '02' },
  { key: 'reason3', number: '03' },
];

const RatingBar = () => {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();

  return (
    <div className="bg-brand-dark py-20 border-b border-white/5">
      <div className="max-w-5xl mx-auto px-6">

        {/* Stars + rating */}
        <motion.div
          className="flex flex-col items-center mb-16"
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportSettings}
          transition={{ duration: 0.5 }}
        >
          <div className="flex gap-1.5 mb-3 text-brand-gold">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={28} fill="currentColor" />
            ))}
          </div>
          <p className="text-white/60 text-sm tracking-widest uppercase font-light">
            {t('ratings.stars')}
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
          {REASONS.map(({ key, number }, i) => (
            <motion.article
              key={key}
              className="relative p-8 rounded-3xl border border-white/8 bg-white/[0.03] text-right overflow-hidden group"
              initial={prefersReduced ? false : { opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportSettings}
              transition={{ duration: 0.5, delay: prefersReduced ? 0 : i * 0.12 }}
              whileHover={prefersReduced ? {} : { borderColor: 'rgba(233,196,106,0.3)' }}
            >
              {/* Gold top accent line */}
              <div className="absolute top-0 left-6 right-6 h-px bg-brand-gold/40 group-hover:bg-brand-gold/70 transition-colors duration-300" />

              {/* Background number */}
              <span className="absolute top-4 left-6 text-6xl font-black text-white/[0.04] select-none font-serif leading-none">
                {number}
              </span>

              <h4 className="text-brand-gold font-bold mb-3 text-xl font-serif relative z-10">
                {t(`ratings.${key}.title`)}
              </h4>
              <p className="text-white/55 font-light leading-relaxed relative z-10 text-base">
                {t(`ratings.${key}.desc`)}
              </p>
            </motion.article>
          ))}
        </div>

      </div>
    </div>
  );
};

export default RatingBar;
