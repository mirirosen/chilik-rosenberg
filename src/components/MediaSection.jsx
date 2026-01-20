import { mediaLinks } from '../data/content';
import { getIcon } from '../utils/iconMapper';

const MediaSection = () => {
  // Map media color classes to Tailwind classes
  const getMediaClasses = (colorClass) => {
    const classMap = {
      'media-mako': {
        border: 'border-r-media-mako',
        icon: 'text-media-mako',
        button: 'bg-media-mako text-white'
      },
      'media-kan': {
        border: 'border-r-media-kan',
        icon: 'text-media-kan',
        button: 'bg-media-kan text-black'
      },
      'media-reshet': {
        border: 'border-r-media-reshet',
        icon: 'text-media-reshet',
        button: 'bg-media-reshet text-white'
      }
    };
    return classMap[colorClass] || classMap['media-mako'];
  };

  return (
    <section id="media" className="py-24 bg-brand-dark-section border-b border-white/5 text-center">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-serif text-brand-gold mb-12 italic font-bold text-center">
          חיליק בתקשורת
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-right">
          {mediaLinks.map((media, i) => {
            const IconComponent = getIcon(media.icon);
            const classes = getMediaClasses(media.colorClass);
            
            return (
              <article 
                key={i} 
                className={`media-card p-8 flex flex-col items-start shadow-xl text-right ${classes.border}`}
              >
                <div className={`mb-6 ${classes.icon}`}>
                  <IconComponent size={40} />
                </div>
                <h4 className="text-xl font-bold mb-3 font-serif text-white uppercase tracking-tighter">
                  {media.name}
                </h4>
                <a 
                  href={media.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`px-8 py-2 rounded-full text-xs font-bold hover:brightness-110 transition-all text-center ${classes.button}`}
                >
                  {media.buttonText}
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MediaSection;
