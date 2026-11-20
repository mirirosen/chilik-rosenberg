import { useTranslation } from 'react-i18next';
const keys = ['streams', 'shidduch', 'architecture', 'books', 'charity', 'yeshiva', 'bakery', 'volunteering', 'internet'];

export default function Journey() {
  const { t } = useTranslation();
  const stops = (items, offset = 0) => items.map((key, index) => <li key={key} data-motion="reveal"><article>
    <b aria-hidden="true">{String(offset + index + 1).padStart(2, '0')}</b>
    <h3>{t(`journey.stations.${key}.title`)}</h3><p>{t(`journey.stations.${key}.desc`)}</p>
  </article></li>);
  return <section id="journey" className="target-journey" aria-labelledby="journey-title">
    <div className="target-section-heading" data-motion="reveal"><p className="target-eyebrow">{t('journey.eyebrow')}</p><h2 id="journey-title">{t('journey.title')}</h2><p>{t('journey.subtitle')}</p></div>
    <ol className="target-journey__grid">{stops(keys.slice(0, 3))}</ol>
    <details className="home-disclosure">
      <summary>{t('journey.more', { count: keys.length - 3 })}</summary>
      <ol className="target-journey__grid" start={4}>{stops(keys.slice(3), 3)}</ol>
    </details>
  </section>;
}
