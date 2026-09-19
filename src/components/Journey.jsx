import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { stations } from '../data/content';
import { getIcon } from '../utils/iconMapper';
import { viewportSettings } from '../styles/designSystem';

const Journey = () => {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();

  const stationKeys = [
    'streams', 'shidduch', 'architecture', 'books', 'charity',
    'yeshiva', 'bakery', 'volunteering', 'internet',
  ];

  return (
    <section id="journey" className="py-32 bg-brand-dark-section/50 text-right">
      <div className="max-w-6xl mx-auto px-6 text-right">
        <motion.h2
          className="text-5xl font-serif text-brand-gold mb-8 italic text-center"
          initial={prefersReduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportSettings}
          transition={{ duration: 0.5 }}
        >
          {t('journey.title')}
        </motion.h2>

        <motion.p
          className="text-xl text-gray-300 mb-12 text-center font-light"
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportSettings}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {t('journey.subtitle')}
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-right">
          {stations.map((item, i) => {
            const IconComponent = getIcon(item.icon);
            const stationKey = stationKeys[i];

            return (
              <motion.article
                key={i}
                className="bg-brand-dark-lighter p-10 rounded-5xl border border-white/5 hover:border-brand-gold/20 transition-colors shadow-xl text-right"
                initial={prefersReduced ? false : { opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportSettings}
                transition={{
                  duration: 0.5,
                  delay: prefersReduced ? 0 : (i % 3) * 0.12,
                }}
                whileHover={prefersReduced ? {} : { scale: 1.03 }}
              >
                <div className="text-brand-gold mb-6 flex justify-start">
                  <IconComponent size={36} />
                </div>
                <h4 className="text-2xl font-bold mb-4 font-serif text-white text-right">
                  {t(`journey.stations.${stationKey}.title`)}
                </h4>
                <p className="text-gray-400 leading-relaxed font-light text-right">
                  {t(`journey.stations.${stationKey}.desc`)}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Journey;
