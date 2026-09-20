import { useTranslation } from 'react-i18next';
import heroImage from '../assets/hero-bg.jpeg';
const RatingBar = () => {
 const { t } = useTranslation();
 return <section className="target-intro">
   <p className="target-intro__lead">{t('bio.text')}</p>
   <div className="target-tour-picks">
    <a href="#journey" className="target-tour-pick"><img src={heroImage} alt=""/><span>{t('header.journey')}</span></a>
    <a href="#menu" className="target-tour-pick"><img src="/hero-images/img1.jpg" alt=""/><span>{t('header.menu')}</span></a>
   </div>
   <div className="target-highlights" aria-label={t('ratings.stars')}>
    {[1,2,3].map((n)=><article key={n}><h2>{t(`ratings.reason${n}.title`)}</h2><p>{t(`ratings.reason${n}.desc`)}</p></article>)}
   </div>
 </section>;
};
export default RatingBar;
