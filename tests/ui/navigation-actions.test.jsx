import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';
import {bookingConversionCopy} from '../../src/data/bookingConversion';
const state=vi.hoisted(()=>({language:'he'}));
vi.mock('react-i18next',()=>({useTranslation:()=>({i18n:{language:state.language,resolvedLanguage:state.language,changeLanguage:()=>{}},t:key=>key.split('.').reduce((v,k)=>v?.[k],state.language==='he'?he:en)||key})}));
import Header from '../../src/components/Header';
beforeEach(()=>{vi.stubGlobal('matchMedia',query=>({matches:query.includes('reduced-motion'),addEventListener(){},removeEventListener(){}}));HTMLDialogElement.prototype.showModal=function(){this.open=true};HTMLDialogElement.prototype.close=function(){this.open=false};});
afterEach(()=>{cleanup();vi.unstubAllGlobals();state.language='he';window.history.replaceState({},'','/');localStorage.clear();});
describe('concise navigation and accurate entry actions',()=>{
 it.each(['he','en'])('shares public/private action wording in %s',language=>{
  state.language=language;const copy=bookingConversionCopy(language);
  expect(copy.openAction).toBe(language==='he'?'בחירת מועד':'Choose a date');
  expect(copy.privateContact).toBe(language==='he'?'בירור סיור פרטי':'Ask about a private tour');
  const {container}=render(<Header showVideos/>);
  expect(container.querySelector('.header-cta').textContent.trim()).toBe(copy.openAction);
  expect(container.querySelector('.mobile-header-cta').textContent.trim()).toBe(copy.openAction);
 });
 it('keeps four primary destinations and real links to all secondary destinations',()=>{
  const {container}=render(<Header showVideos/>);const nav=container.querySelector('.desktop-navigation');expect(nav).not.toBeNull();
  expect([...nav.querySelectorAll(':scope > a')].map(a=>a.getAttribute('href'))).toEqual(['/#about','/#journey','/#menu','/#faq']);
  expect([...nav.querySelectorAll('details a')].map(a=>a.getAttribute('href'))).toEqual(['/#lectures','/#videos','/#media','/terms']);
 });
 it('closes More on Escape with focus returned, and outside without stealing focus',()=>{
  const {container}=render(<><Header showVideos/><button>Outside</button></>);const more=container.querySelector('.desktop-navigation-more');expect(more).not.toBeNull();
  more.open=true;const inside=more.querySelector('a');inside.focus();fireEvent.keyDown(inside,{key:'Escape'});
  expect(more.open).toBe(false);expect(document.activeElement).toBe(more.querySelector('summary'));
  more.open=true;const outside=screen.getByRole('button',{name:'Outside'});outside.focus();fireEvent.pointerDown(outside);
  expect(more.open).toBe(false);expect(document.activeElement).toBe(outside);
 });
});
