import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act, within } from '@testing-library/react';
const mocks=vi.hoisted(()=>({auth:{currentUser:null},listener:null,download:vi.fn()}));
vi.mock('../../src/utils/firebase',()=>({auth:mocks.auth,db:null,APP_ID:'fixture'}));
vi.mock('../../src/utils/preview',()=>({IS_PREPROD:false}));
vi.mock('../../src/utils/bookingContactService',async()=>({...(await vi.importActual('../../src/utils/bookingContactService')),createContactDownloader:()=>mocks.download}));
vi.mock('../../src/hooks/useFirebaseData',()=>({useFirebaseData:()=>({availabilityStatus:'error',tourDates:{},soldOut:[],blocked:[]}),getEffectiveMax:()=>30,getCurrentRegistrations:()=>0,getAvailableSpots:()=>30,usesGlobalMax:()=>true}));
vi.mock('../../src/components/AdminBookings',()=>({default:()=>null}));
vi.mock('firebase/auth',()=>({onIdTokenChanged:(_auth,listener)=>{mocks.listener=listener;listener(null);return vi.fn();},signInWithEmailAndPassword:async()=>{const u={uid:'fixture-admin',isAnonymous:false,getIdTokenResult:async()=>({claims:{admin:true}})};mocks.auth.currentUser=u;return {user:u};},signOut:async()=>{mocks.auth.currentUser=null;}}));
import Admin from '../../src/components/Admin';
const ID='BK-000000000000000000000001';
beforeEach(()=>{
  window.history.replaceState({},'','/admin#contact='+ID); mocks.auth.currentUser=null;mocks.download.mockReset().mockResolvedValue(new Blob(['synthetic']));
  Object.defineProperty(URL,'createObjectURL',{value:vi.fn().mockReturnValue('blob:synthetic'),configurable:true});
  Object.defineProperty(URL,'revokeObjectURL',{value:vi.fn(),configurable:true}); vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
});
afterEach(()=>{cleanup();vi.useRealTimers();window.history.replaceState({},'','/');});
it('actual admin login preserves fragment and reveals contact action only after admin authentication',async()=>{
  render(<Admin/>); await waitFor(()=>expect(document.querySelector('#admin-email')).toBeTruthy());
  expect(screen.queryByRole('button',{name:'שמירת איש קשר (.vcf)'})).toBeNull();expect(mocks.download).not.toHaveBeenCalled();
  fireEvent.change(document.querySelector('#admin-email'),{target:{value:'synthetic@example.test'}});fireEvent.change(document.querySelector('#password'),{target:{value:'fixture-password'}});fireEvent.submit(document.querySelector('form'));
  const save=await screen.findByRole('button',{name:'שמירת איש קשר (.vcf)'});expect(window.location.hash).toBe('#contact='+ID);expect(mocks.download).not.toHaveBeenCalled();
  fireEvent.click(save);fireEvent.click(save);await waitFor(()=>expect(URL.createObjectURL).toHaveBeenCalledTimes(1));expect(mocks.download).toHaveBeenCalledTimes(1);expect(mocks.download).toHaveBeenCalledWith(ID,expect.any(AbortSignal));
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);expect(within(screen.getByRole('region',{name:'כרטיס איש קשר'})).getByRole('status').textContent).toContain('הקובץ הוכן');
  await act(async()=>{mocks.auth.currentUser=null;await mocks.listener(null);});
  expect(screen.queryByRole('button',{name:'שמירת איש קשר (.vcf)'})).toBeNull();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic');
});
it('malformed contact fragment cannot invoke downloader',async()=>{
  window.history.replaceState({},'','/admin#contact=invalid');render(<Admin/>);await waitFor(()=>expect(document.querySelector('form')).toBeTruthy());fireEvent.submit(document.querySelector('form'));
  expect((await screen.findByRole('alert')).textContent).toContain('הקישור אינו תקין');expect(mocks.download).not.toHaveBeenCalled();
});
