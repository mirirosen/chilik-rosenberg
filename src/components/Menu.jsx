import { useTranslation } from 'react-i18next';
const keys=['cholent','fish','kugel','liver','challenge','blintzes'];
const imgs=['/hero-images/img1.jpg','/hero-images/img2.jpg','/hero-images/img1.jpg','/hero-images/img2.jpg','/hero-images/img1.jpg','/hero-images/img2.jpg'];
const Menu=()=>{const{t}=useTranslation();return <section id="menu" className="target-menu"><div className="target-section-heading"><p className="target-eyebrow">הטעמים של בני ברק</p><h2>{t('menu.title')}</h2><p>{t('menu.subtitle')}</p></div><div className="target-menu__rail">{keys.map((k,i)=><article key={k}><img src={imgs[i]} alt=""/><div><h3>{t(`menu.items.${k}.title`)}</h3><p>{t(`menu.items.${k}.desc`)}</p></div></article>)}</div></section>};
export default Menu;
