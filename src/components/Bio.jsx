import { useTranslation } from 'react-i18next';
import profileImage from '../assets/hilik-profile.jpeg';
const Bio=()=>{const{t}=useTranslation();return <section id="about" className="target-bio"><div><p className="target-eyebrow">{t('bio.eyebrow')}</p><h2>{t('bio.title')}</h2><p>{t('bio.text')}</p></div><img src={profileImage} alt={t('bio.title')}/></section>};
export default Bio;
