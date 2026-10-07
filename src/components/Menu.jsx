import { useTranslation } from 'react-i18next';

const dishKeys = ['cholent', 'fish', 'kugel', 'liver', 'challenge', 'blintzes'];

const Menu = () => {
  const { t } = useTranslation();
  return (
    <section id="menu" className="target-menu">
      <div className="target-section-heading" data-motion="reveal">
        <p className="target-eyebrow">{t('menu.eyebrow')}</p>
        <h2>{t('menu.title')}</h2>
        <p>{t('menu.subtitle')}</p>
      </div>
      <p className="target-image-disclosure">{t('imagery.menuDisclosure')}</p>
      <div className="target-menu__rail" role="region" aria-label={t('menu.title')}>
        {dishKeys.map((key) => (
          <article key={key} className="target-menu__dish" data-motion="reveal">
            <img src={`/images/food/${key}-960.webp`} srcSet={`/images/food/${key}-480.webp 480w, /images/food/${key}-960.webp 960w`} sizes="(max-width: 767px) 45vw, (max-width: 1280px) 30vw, 400px" width="960" height={key === 'cholent' ? '540' : '640'} loading="lazy" decoding="async" alt={`${t(`menu.items.${key}.title`)} — ${t('imagery.generated')}`} />
            <div>
              <h3>{t(`menu.items.${key}.title`)}</h3>
              <p>{t(`menu.items.${key}.desc`)}</p>
            </div>
          </article>
        ))}
      </div>
      <a href="#date-selection" className="target-button target-menu__cta">{t('menu.nextTours')}</a>
    </section>
  );
};

export default Menu;
