import { useTranslation } from 'react-i18next';
import { stations } from '../data/content';
const keys=['streams','shidduch','architecture','books','charity','yeshiva','bakery','volunteering','internet'];
const Journey=()=>{const{t}=useTranslation();return <section id="journey" className="target-journey"><div className="target-section-heading"><p className="target-eyebrow">להכיר מבפנים</p><h2>{t('journey.title')}</h2><p>{t('journey.subtitle')}</p></div><div className="target-journey__grid">{stations.map((_,i)=><article key={keys[i]}><b>{String(i+1).padStart(2,'0')}</b><h3>{t(`journey.stations.${keys[i]}.title`)}</h3><p>{t(`journey.stations.${keys[i]}.desc`)}</p></article>)}</div></section>};
export default Journey;
