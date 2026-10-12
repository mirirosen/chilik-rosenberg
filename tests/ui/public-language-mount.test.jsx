import React, { useLayoutEffect } from 'react';
import { afterEach, expect, it } from 'vitest';
import { mountPublicSite } from '../../src/utils/mountPublicSite';
let client;
afterEach(()=>{client?.unmount();document.body.innerHTML='';document.documentElement.lang='he';document.documentElement.dir='rtl';});
it('commits saved English and its direction before returning, without mirroring the Hebrew prerender',()=>{
 document.body.innerHTML='<div id="root" data-prerender="he"><h1>עברית</h1></div>';
 document.documentElement.lang='he';document.documentElement.dir='rtl';
 let observed;
 function English(){useLayoutEffect(()=>{observed={text:document.querySelector('h1').textContent,dir:document.documentElement.dir};},[]);return <h1>English</h1>;}
 client=mountPublicSite(<English/>,'en');
 expect(observed).toEqual({text:'English',dir:'ltr'});
 expect(document.querySelector('h1').textContent).toBe('English');
});
