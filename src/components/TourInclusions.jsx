import { useTranslation } from 'react-i18next';

export default function TourInclusions() {
  const { t } = useTranslation();
  return <section className="target-inclusions" aria-labelledby="inclusions-title">
    <h2 id="inclusions-title" data-motion="reveal">{t('inclusions.title')}</h2>
    <ol>{[0, 1, 2, 3].map(index => <li key={index} data-motion="reveal"><span aria-hidden="true">{index + 1}</span><p>{t(`inclusions.items.${index}`)}</p></li>)}</ol>
  </section>;
}
