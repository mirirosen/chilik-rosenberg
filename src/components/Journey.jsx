import { useTranslation } from 'react-i18next';
const keys = ['streams', 'shidduch', 'architecture', 'books', 'charity', 'yeshiva', 'bakery', 'volunteering', 'internet'];

export default function Journey() {
  const { t } = useTranslation();
  return <section id="journey" className="target-journey" aria-labelledby="journey-title">
    <div className="target-section-heading" data-motion="reveal"><p className="target-eyebrow">{t('journey.eyebrow')}</p><h2 id="journey-title">{t('journey.title')}</h2><p>{t('journey.subtitle')}</p></div>
    <ol className="target-journey__grid">{keys.map((key, index) => <li key={key} data-motion="reveal"><article><b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b><h3>{t(`journey.stations.${key}.title`)}</h3><p>{t(`journey.stations.${key}.desc`)}</p></article></li>)}</ol>
  </section>;
}
