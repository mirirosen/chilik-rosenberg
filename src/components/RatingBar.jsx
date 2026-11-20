import { useTranslation } from 'react-i18next';
import profileImage from '../assets/hilik-cutout-provided.webp';
import { ChevronLeft } from '../utils/icons';

// Copy is unchanged; a no-break space keeps a dash from starting a line.
const noDashOrphan = text => text.replace(/ ([–—])/g, '\u00a0$1');

// Both choices use existing original footage or the user-provided lecturer portrait.
// The disclosure pill stays out of the link name and is announced as the link's description.
// Documentary footage keeps its original landscape ratio; the supplied portrait remains a separate choice.
export default function RatingBar() {
  const { t } = useTranslation();
  return <section id="introduction" className="target-intro" aria-label={t('intro.label')}>
    <div className="target-intro__lead" data-motion="reveal">{[0, 1, 2].map(index => <p key={index} className={index === 2 ? 'target-intro__key' : undefined}>{noDashOrphan(t(`intro.paragraphs.${index}`))}</p>)}</div>
    <div className="target-tour-picks">
      <a href="#date-selection" className="target-tour-pick target-tour-pick--documentary" aria-describedby="intro-tours-image-note" data-motion="reveal">
        <div className="target-tour-pick__visual"><img src="/media/posters/bneibrak-zoo-720p.webp" width="640" height="360" loading="lazy" decoding="async" alt="" /><small id="intro-tours-image-note" className="target-tour-pick__image-note" aria-hidden="true">{t('imagery.previousVisit')}</small></div>
        <div className="target-tour-pick__caption"><h2>{t('intro.tours')}</h2><div className="target-tour-pick__arrow" aria-hidden="true"><ChevronLeft size={24} /></div></div>
      </a>
      <a href="#lectures" className="target-tour-pick target-tour-pick--portrait" data-motion="reveal">
        <div className="target-tour-pick__visual"><img src={profileImage} width="376" height="513" loading="lazy" decoding="async" alt="" /></div>
        <div className="target-tour-pick__caption"><h2>{t('intro.lectures')}</h2><div className="target-tour-pick__arrow" aria-hidden="true"><ChevronLeft size={24} /></div></div>
      </a>
    </div>
  </section>;
}
