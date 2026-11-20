import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';
import {tourVideos} from '../../src/data/content';
import {mediaReferences} from '../../src/data/mediaReferences';
const state=vi.hoisted(()=>({language:'he'}));
vi.mock('react-i18next',()=>({useTranslation:()=>({i18n:{resolvedLanguage:state.language},t:(key,values={})=>Object.entries(values).reduce((text,[name,value])=>text.replaceAll(`{{${name}}}`,String(value)),key.split('.').reduce((v,k)=>v?.[k],state.language==='he'?he:en)||key)})}));
vi.mock('../../src/hooks/useAmbientVideo',()=>({useAmbientVideo:()=>({ref:{current:null},on:false,playing:false,toggle:()=>{}})}));
import RatingBar from '../../src/components/RatingBar';
import Hero from '../../src/components/Hero';
afterEach(()=>{cleanup();state.language='he';});
describe('original tour identity and source highlights',()=>{
 it('shows one hero scene without an additional cutout, while preserving a named media control',()=>{
  const {container}=render(<Hero/>);
  expect(container.querySelector('.target-hero__person-frame')).toBeNull();
  expect(screen.getByRole('heading',{level:1})).toBeTruthy();
  expect(screen.getByRole('button',{name:he.hero.ambientPlay})).toBeTruthy();
 });
 it('identifies the tour choice as a previous real visit, not an AI food illustration',()=>{
  render(<RatingBar/>);const link=screen.getByRole('link',{name:he.intro.tours});
  expect(link.querySelector('img').getAttribute('src')).toBe('/media/posters/bneibrak-zoo-720p.webp');
  const description=document.getElementById(link.getAttribute('aria-describedby'));
  expect(description?.textContent).toContain('תיעוד מסיור קודם');
  expect(description.textContent).not.toMatch(/בינה מלאכותית/);
 });
 it('partitions all 18 videos once, with three preferred originals and a safe fallback',async()=>{
  const module=await vi.importActual('../../src/data/homeHighlights.js').catch(()=>({}));
  expect(module.homeVideoSelection).toBeTypeOf('function');
  const selected=module.homeVideoSelection(tourVideos);
  expect(selected.featured.map(v=>v.id)).toEqual(['MxVd7LEjkJyq1eXMAuuT','CUYEMWo96u8','6i1rv_znrbk']);
  const ids=[...selected.featured,...selected.remainingGroups.flatMap(g=>g.items)].map(v=>v.id);
  expect(ids).toHaveLength(18);expect(new Set(ids).size).toBe(18);expect(selected.total).toBe(18);
  const first=tourVideos[0].items[0],second=tourVideos[0].items[1];
  const fallback=module.homeVideoSelection([{id:'small',items:[first,second,first,{...first,id:'bad',src:'javascript:alert(1)'}]}]);
  expect(fallback.featured.map(v=>v.id)).toEqual([first.id,second.id]);expect(fallback.remainingGroups).toEqual([]);expect(fallback.total).toBe(2);
  expect(module.homeVideoSelection([])).toEqual({featured:[],remainingGroups:[],total:0});
 });
 it.each(['he','en'])('shows three factual %s source links and omits missing sources',async language=>{
  state.language=language;const module=await vi.importActual('../../src/components/MediaHighlights.jsx').catch(()=>({}));
  expect(module.default).toBeTypeOf('function');render(React.createElement(module.default,{language}));
  const links=screen.getAllByRole('link');expect(links).toHaveLength(3);
  for(const [index,id] of ['mako-tour','kan-moreshet','donkey-tour'].entries()){
   const reference=mediaReferences.find(v=>v.id===id);expect(links[index].getAttribute('href')).toBe(reference.url);
   expect(links[index].textContent).toContain(reference.outlet[language]);expect(links[index].getAttribute('rel')).toBe('noopener noreferrer');
  }
  const data=await vi.importActual('../../src/data/homeHighlights.js');
  expect(data.mediaHighlightSelection([mediaReferences.find(v=>v.id==='mako-tour')])).toHaveLength(1);
  expect(data.mediaHighlightSelection([])).toEqual([]);
 });
});
