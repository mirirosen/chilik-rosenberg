import { useTranslation } from 'react-i18next';
import profileImage from '../assets/hilik-cutout-provided.webp';
import { ChevronLeft } from '../utils/icons';

// Copy is unchanged; a no-break space keeps a dash from starting a line.
const noDashOrphan = text => text.replace(/ ([–—])/g, '\u00a0$1');

// Food is labeled illustration; the lecturer portrait is the user's genuine supplied photo.
// The disclosure pill stays out of the link name and is announced as the link's description.
export default function RatingBar() {
  const { t } = useTranslation();
  return <section id="introduction" className="target-intro" aria-label={t('intro.label')}>
    <div className="target-intro__lead" data-motion="reveal">{[0, 1, 2].map(index => <p key={index} className={index === 2 ? 'target-intro__key' : undefined}>{noDashOrphan(t(`intro.paragraphs.${index}`))}</p>)}</div>
    <div className="target-tour-picks">
      <a href="#date-selection" className="target-tour-pick" aria-describedby="intro-tours-image-note" data-motion="reveal">
        <div className="target-tour-pick__visual"><img src="/images/food/cholent-960.webp" srcSet="/images/food/cholent-480.webp 480w, /images/food/cholent-960.webp 960w" sizes="(max-width: 600px) 90vw, 450px" width="960" height="540" loading="lazy" decoding="async" alt="" /><small id="intro-tours-image-note" className="target-tour-pick__image-note" aria-hidden="true">{t('imagery.generated')}</small></div>
        <div className="target-tour-pick__caption"><h2>{t('intro.tours')}</h2><div className="target-tour-pick__arrow" aria-hidden="true"><ChevronLeft size={24} /></div></div>
      </a>
      <a href="#lectures" className="target-tour-pick target-tour-pick--portrait" data-motion="reveal">
        <div className="target-tour-pick__visual"><img src={profileImage} width="376" height="513" loading="lazy" decoding="async" alt="" /></div>
        <div className="target-tour-pick__caption"><h2>{t('intro.lectures')}</h2><div className="target-tour-pick__arrow" aria-hidden="true"><ChevronLeft size={24} /></div></div>
      </a>
    </div>
  </section>;
}
