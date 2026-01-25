import { useTranslation } from 'react-i18next';
import { stations } from '../data/content';
import { getIcon } from '../utils/iconMapper';

const Journey = () => {
  const { t } = useTranslation();

  // Station keys mapping
  const stationKeys = ['streams', 'shidduch', 'architecture', 'books', 'charity', 'yeshiva', 'bakery', 'volunteering', 'internet'];

  return (
    <section id="journey" className="py-32 bg-brand-dark-section/50 text-right">
      <div className="max-w-6xl mx-auto px-6 text-right">
        <h2 className="text-5xl font-serif text-brand-gold mb-8 italic text-center">
          {t('journey.title')}
        </h2>
        <p className="text-xl text-gray-300 mb-12 text-center font-light">
          {t('journey.subtitle')}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-right">
          {stations.map((item, i) => {
            const IconComponent = getIcon(item.icon);
            const stationKey = stationKeys[i];
            
            return (
              <article 
                key={i} 
                className="bg-brand-dark-lighter p-10 rounded-5xl border border-white/5 hover:border-brand-gold/20 transition-all shadow-xl text-right"
              >
                <div className="text-brand-gold mb-6 flex justify-start text-right">
                  <IconComponent size={36} />
                </div>
                <h4 className="text-2xl font-bold mb-4 font-serif text-white text-right">
                  {t(`journey.stations.${stationKey}.title`)}
                </h4>
                <p className="text-gray-400 leading-relaxed font-light text-right">
                  {t(`journey.stations.${stationKey}.desc`)}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Journey;
