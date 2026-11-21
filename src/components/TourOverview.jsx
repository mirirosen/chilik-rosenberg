import { useTranslation } from 'react-i18next';
import { growthGuideLinks } from '../data/growthNavigation';
import { organicCopy, guidePaths } from '../data/organicContent';

export default function TourOverview() {
  const { i18n } = useTranslation();
  const copy = organicCopy[i18n.language?.startsWith('en') ? 'en' : 'he'];
  return <section id="tour-overview" className="organic-overview" aria-labelledby="tour-overview-title">
    <h2 id="tour-overview-title">{copy.title}</h2>
    <p>{copy.intro}</p>
    <dl>{copy.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p>{copy.caution}</p>
    <details className="growth-guide-links"><summary>{i18n.language?.startsWith('en') ? 'More about Bnei Brak, food and lectures (Hebrew)' : 'עוד על בני ברק, אוכל והרצאות'}</summary><ul>{growthGuideLinks(i18n.language).map(item => <li key={item.href}><a href={item.href}>{item.label}</a></li>)}</ul></details>
    <nav aria-label={copy.guides}><h3>{copy.guides}</h3><ul>{guidePaths.map((path, index) => <li key={path}><a href={path}>{copy.links[index]}</a></li>)}</ul></nav>
  </section>;
}
