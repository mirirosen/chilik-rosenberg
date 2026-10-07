import { useTranslation } from 'react-i18next';
import { whatsappNumber } from '../data/content';

export default function Lectures() {
  const { t } = useTranslation();
  return <section id="lectures" className="target-lectures" aria-labelledby="lectures-title">
    <div className="target-lectures__content">
      <h2 id="lectures-title">{t('lectures.title')}</h2>
      {[0, 1, 2, 3].map(index => <p key={index}>{t(`lectures.paragraphs.${index}`)}</p>)}
      <a className="target-button" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">{t('lectures.cta')}</a>
    </div>
  </section>;
}
