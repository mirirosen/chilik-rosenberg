import { useTranslation } from 'react-i18next';
import profileImage from '../assets/hilik-profile.jpeg';

const Bio = () => {
  const { t } = useTranslation();

  return (
    <section 
      id="about" 
      className="py-32 max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16 text-right"
    >
      <div className="w-full md:w-1/2 relative text-right">
        <img 
          src={profileImage} 
          alt={t('bio.title')}
          className="rounded-5xl w-full shadow-2xl border-2 border-brand-gold/20" 
        />
      </div>
      
      <article className="w-full md:w-1/2 text-right">
        <h2 className="text-5xl font-serif text-brand-gold mb-4 italic font-bold text-right">
          {t('bio.title')}
        </h2>
        <p className="text-xl text-gray-200 mb-6 leading-relaxed font-serif text-right">
          {t('bio.text')}
        </p>
      </article>
    </section>
  );
};

export default Bio;
