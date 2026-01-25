import { useTranslation } from 'react-i18next';
import { Star } from '../utils/icons';

const RatingBar = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-brand-dark-alt py-16 border-b border-white/5 text-center">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="flex gap-1 mb-2 text-brand-gold">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={24} fill="currentColor" />
            ))}
          </div>
          <p className="text-lg font-bold">{t('ratings.stars')}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-right">
          <article className="p-8 bg-white/5 rounded-3xl border border-white/5 shadow-2xl">
            <h4 className="text-gold font-bold mb-3 text-xl font-serif text-right">
              {t('ratings.reason1.title')}
            </h4>
            <p className="text-gray-400 font-light leading-relaxed text-right">
              {t('ratings.reason1.desc')}
            </p>
          </article>
          
          <article className="p-8 bg-white/5 rounded-3xl border border-white/5 shadow-2xl text-right">
            <h4 className="text-brand-gold font-bold mb-3 text-xl font-serif text-right">
              {t('ratings.reason2.title')}
            </h4>
            <p className="text-gray-400 font-light leading-relaxed text-right">
              {t('ratings.reason2.desc')}
            </p>
          </article>
          
          <article className="p-8 bg-white/5 rounded-3xl border border-white/5 shadow-2xl text-right">
            <h4 className="text-brand-gold font-bold mb-3 text-xl font-serif text-right">
              {t('ratings.reason3.title')}
            </h4>
            <p className="text-gray-400 font-light leading-relaxed text-right">
              {t('ratings.reason3.desc')}
            </p>
          </article>
        </div>
      </div>
    </div>
  );
};

export default RatingBar;
