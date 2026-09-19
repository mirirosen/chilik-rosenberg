import { useTranslation } from 'react-i18next';
import { foods } from '../data/content';
import { getIcon } from '../utils/iconMapper';

const Menu = () => {
  const { t } = useTranslation();

  // Food keys mapping
  const foodKeys = ['cholent', 'fish', 'kugel', 'potatoKugel', 'liver', 'challenge', 'blintzes'];

  // Emoji icons for items that don't have Lucide icons
  const emojiIcons = {
    'pot': '🍲'
  };

  return (
    <section id="menu" className="py-32 bg-brand-dark-section text-center border-y border-white/5 overflow-hidden">
      <h2 className="text-5xl font-serif text-brand-gold mb-4 italic font-bold text-center">
        {t('menu.title')}
      </h2>
      <p className="text-xl text-gray-300 mb-12 text-center font-light">
        {t('menu.subtitle')}
      </p>

      <div className="flex flex-row flex-nowrap overflow-x-auto gap-8 pb-12 px-8 custom-scroll scroll-smooth w-full text-center">
        {foods.map((food, i) => {
          const foodKey = foodKeys[i];
          const isEmoji = emojiIcons[food.icon];
          const IconComponent = !isEmoji ? getIcon(food.icon) : null;

          return (
            <article
              key={i}
              className="flex-shrink-0 w-80 md:w-96 bg-brand-dark-lighter rounded-6xl p-12 border border-white/5 shadow-2xl flex flex-col items-center text-center relative"
            >
              {/* NEW badge for new items */}
              {food.isNew && (
                <span className="absolute top-6 right-6 bg-brand-gold text-brand-dark px-3 py-1 rounded-full text-xs font-black">
                  חדש!
                </span>
              )}

              <div className="text-brand-gold mb-6 flex justify-center w-full text-center">
                {isEmoji ? (
                  <span className="text-5xl">{emojiIcons[food.icon]}</span>
                ) : (
                  <IconComponent size={48} />
                )}
              </div>
              <h4 className="text-3xl font-bold mb-4 font-serif text-brand-gold text-center">
                {t(`menu.items.${foodKey}.title`)}
              </h4>
              <p className="text-gray-400 leading-relaxed font-light text-center">
                {t(`menu.items.${foodKey}.desc`)}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default Menu;
