import { stations } from '../data/content';
import { getIcon } from '../utils/iconMapper';

const Journey = () => {

  return (
    <section id="journey" className="py-32 bg-brand-dark-section/50 text-right">
      <div className="max-w-6xl mx-auto px-6 text-right">
        <h2 className="text-5xl font-serif text-brand-gold mb-12 italic text-center">
          מה כולל הסיור שלי?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-right">
          {stations.map((item, i) => {
            const IconComponent = getIcon(item.icon);
            
            return (
              <article 
                key={i} 
                className="bg-brand-dark-lighter p-10 rounded-5xl border border-white/5 hover:border-brand-gold/20 transition-all shadow-xl text-right"
              >
                <div className="text-brand-gold mb-6 flex justify-start text-right">
                  <IconComponent size={36} />
                </div>
                <h4 className="text-2xl font-bold mb-4 font-serif text-white text-right">
                  {item.title}
                </h4>
                <p className="text-gray-400 leading-relaxed font-light text-right">
                  {item.desc}
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
