import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';
import {tourVideos} from '../../src/data/content';
import {mediaReferences} from '../../src/data/mediaReferences';
const state=vi.hoisted(()=>({language:'he'}));
vi.mock('react-i18next',()=>({useTranslation:()=>({i18n:{resolvedLanguage:state.language},t:(key,values={})=>Object.entries(values).reduce((text,[name,value])=>text.replaceAll(`{{${name}}}`,String(value)),key.split('.').reduce((v,k)=>v?.[k],state.language==='he'?he:en)||key)})}));
import Journey from '../../src/components/Journey';
import TourVideos from '../../src/components/TourVideos';
import MediaSection from '../../src/components/MediaSection';
afterEach(()=>{cleanup();state.language='he';vi.restoreAllMocks();});
describe('complete homepage content in compact accessible disclosures',()=>{
 it.each(['he','en'])('reports an honest directory total without depending on JavaScript (%s)',language=>{
  state.language=language;const doc=new DOMParser().parseFromString(renderToStaticMarkup(<MediaSection/>),'text/html');
  expect(doc.querySelector('[role=status]').textContent.trim()).toBe(language==='he'?'38 הפניות':'38 references');
 });
 it.each(['he','en'])('keeps all nine %s stops in server HTML with six behind a native disclosure',language=>{
  state.language=language;const {container}=render(<Journey/>);const disclosure=container.querySelector('details');
  expect(disclosure).not.toBeNull();expect(disclosure.open).toBe(false);
  expect(container.querySelectorAll('.target-journey__grid li')).toHaveLength(9);
  expect(disclosure.querySelectorAll('li')).toHaveLength(6);expect(disclosure.querySelector('ol').getAttribute('start')).toBe('4');
  const html=renderToStaticMarkup(<Journey/>);expect(html).toContain('<details');expect(html).toContain(language==='he'?he.journey.stations.internet.title:en.journey.stations.internet.title);
 });
 it.each(['he','en'])('mounts only three %s players before expansion and pauses added players before closing',language=>{
  state.language=language;const pause=vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
  const {container}=render(<TourVideos compact/>);expect(container.querySelectorAll('video')).toHaveLength(3);
  const disclosure=container.querySelector('details');expect(disclosure).not.toBeNull();
  const remaining=disclosure.querySelectorAll('a[href$=".mp4"]');expect(remaining).toHaveLength(15);
  const html=renderToStaticMarkup(<TourVideos compact/>);const doc=new DOMParser().parseFromString(html,'text/html');
  for(const video of tourVideos.flatMap(g=>g.items))expect(doc.body.textContent).toContain(video.title[language]);
  disclosure.open=true;fireEvent(disclosure,new Event('toggle'));expect(container.querySelectorAll('video')).toHaveLength(18);
  disclosure.open=false;fireEvent(disclosure,new Event('toggle'));expect(pause).toHaveBeenCalledTimes(15);expect(container.querySelectorAll('video')).toHaveLength(3);
  for(const video of container.querySelectorAll('video')){expect(video.autoplay).toBe(false);expect(video.getAttribute('preload')).toBe('none');}
 });
 it('retains all 38 reference URLs in initial HTML while initially exposing three',()=>{
  const {container}=render(<MediaSection/>);const disclosure=container.querySelector('details');expect(disclosure).not.toBeNull();
  expect(container.querySelector('.media-reference-grid').querySelectorAll('a')).toHaveLength(3);expect(disclosure.querySelectorAll('a')).toHaveLength(35);
  const html=renderToStaticMarkup(<MediaSection/>);const doc=new DOMParser().parseFromString(html,'text/html');
  expect(doc.querySelectorAll('a')).toHaveLength(38);for(const reference of mediaReferences)expect([...doc.querySelectorAll('a')].some(a=>a.getAttribute('href')===reference.url)).toBe(true);
 });
});
