import { useTranslation } from 'react-i18next';
import { inquiryReference } from '../utils/inquiryRoutes';

export default function InquirySection({ status = false, search = '' }) {
  const { t } = useTranslation();
  const reference = status ? inquiryReference(search) : null;
  const draft = `${t('inquiry.draft')}${reference ? `\n${t('inquiry.reference')}: ${reference}` : ''}`;
  return <section id="date-selection" className="inquiry-section" aria-labelledby="inquiry-title">
    <div className="target-section-heading inquiry-heading" data-motion="reveal">
      <h2 id="inquiry-title">{t(status ? 'inquiry.statusTitle' : 'inquiry.title')}</h2>
      <p className="inquiry-notice">{t('inquiry.notice')}</p>
    </div>
    {status && <p className="inquiry-status-notice">{t('inquiry.statusNotice')}</p>}
    {reference && <p>{t('inquiry.reference')}: <bdi dir="ltr">{reference}</bdi></p>}
    <div className="inquiry-actions">
      <a className="target-button" href={`https://wa.me/972506724312?text=${encodeURIComponent(draft)}`} target="_blank" rel="noopener noreferrer">{t('inquiry.cta')}</a>
      <a className="inquiry-secondary" href="tel:0506724312">{t('inquiry.call')} <bdi dir="ltr">0506724312</bdi></a>
      <a className="inquiry-secondary" href="mailto:hr20192022@gmail.com">{t('inquiry.email')} <bdi dir="ltr">hr20192022@gmail.com</bdi></a>
    </div>
    <p className="inquiry-draft-notice">{t('inquiry.draftNotice')}</p>
  </section>;
}
