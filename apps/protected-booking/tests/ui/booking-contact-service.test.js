import { afterEach, it, expect, vi } from 'vitest';
import { createContactDownloader, contactIdFromHash } from '../../src/utils/bookingContactService';
const ID = 'BK-000000000000000000000001';
const user = () => ({ uid:'fixture-admin', isAnonymous:false, getIdTokenResult:vi.fn().mockResolvedValue({token:'synthetic-token',claims:{admin:true}}) });
const response = () => ({ok:true,status:200,headers:new Headers({'Content-Type':'text/vcard; charset=utf-8'}),blob:async()=>new Blob(['synthetic-vcard'],{type:'text/vcard'})});
const setup = (options={}) => { const auth={currentUser:user()}, fetchImpl=vi.fn().mockResolvedValue(response()); return {auth,fetchImpl,download:createContactDownloader({auth,fetchImpl,base:'https://api.example.test',...options})}; };
afterEach(()=>{vi.useRealTimers();});
it('only exact booking fragments are accepted, without decoding URL-controlled data',()=>{
  expect(contactIdFromHash('#contact='+ID)).toBe(ID); expect(contactIdFromHash('#contact='+ID+'&name=x')).toBe('invalid');
  expect(contactIdFromHash('#contact=%42K-000000000000000000000001')).toBe('invalid'); expect(contactIdFromHash('#about')).toBeNull();
});
it('refreshes verified admin identity and fetches card without cache/referrer/cookie/redirect or credentials in URL',async()=>{
  const f=setup(); const blob=await f.download(ID);
  expect(blob.size).toBeGreaterThan(0); expect(f.auth.currentUser.getIdTokenResult).toHaveBeenCalledWith(true);
  expect(f.fetchImpl).toHaveBeenCalledWith('https://api.example.test/adminBookingContactCard?id='+ID,expect.objectContaining({method:'GET',cache:'no-store',referrerPolicy:'no-referrer',credentials:'omit',redirect:'error',headers:{Authorization:'Bearer synthetic-token'}}));
  expect(f.fetchImpl.mock.calls[0][0]).not.toContain('synthetic-token'); expect(f.fetchImpl.mock.calls[0][0]).not.toContain('name');
});
it('unauthenticated, anonymous and non-admin users cannot fetch',async()=>{
  for(const current of [null,{...user(),isAnonymous:true},{...user(),getIdTokenResult:async()=>({token:'fixture',claims:{admin:false}})}]){
    const f=setup(); f.auth.currentUser=current; await expect(f.download(ID)).rejects.toThrow('admin-required'); expect(f.fetchImpl).not.toHaveBeenCalled();
  }
});
it('session changes before fetch, during fetch or while reading bytes prevent download',async()=>{
  const before=setup(); before.auth.currentUser.getIdTokenResult.mockImplementation(async()=>{before.auth.currentUser=user(); return {token:'fixture',claims:{admin:true}};});
  await expect(before.download(ID)).rejects.toThrow('admin-session-changed'); expect(before.fetchImpl).not.toHaveBeenCalled();
  const during=setup(); during.fetchImpl.mockImplementation(async()=>{during.auth.currentUser=null;return response();});
  await expect(during.download(ID)).rejects.toThrow('admin-session-changed');
  const bytes=setup(); bytes.fetchImpl.mockResolvedValue({...response(),blob:async()=>{bytes.auth.currentUser=null;return new Blob(['synthetic']);}});
  await expect(bytes.download(ID)).rejects.toThrow('admin-session-changed');
});
it('preprod, malformed IDs and unsafe API bases fail before credential refresh or fetch',async()=>{
  for(const options of [{isPreprod:true},{base:'http://api.example.test'},{base:'https://user:pass@api.example.test'},{base:'https://api.example.test/?secret=x'},{base:'https://api.example.test/#secret'}]){
    const f=setup(options); await expect(f.download(ID)).rejects.toThrow('contact-service-unavailable');expect(f.fetchImpl).not.toHaveBeenCalled();expect(f.auth.currentUser.getIdTokenResult).not.toHaveBeenCalled();
  }
  const f=setup(); await expect(f.download('../secret')).rejects.toThrow('contact-service-unavailable'); expect(f.fetchImpl).not.toHaveBeenCalled();
});
it('server errors, HTML, oversized or empty success never become downloadable blobs',async()=>{
  for(const res of [{...response(),ok:false,status:403},{...response(),headers:new Headers({'Content-Type':'text/html'})},{...response(),blob:async()=>new Blob([])},{...response(),blob:async()=>new Blob(['x'.repeat(4097)])}]){
    const f=setup();f.fetchImpl.mockResolvedValue(res); await expect(f.download(ID)).rejects.toThrow();
  }
});
it('aborting stalls in identity, fetch or blob reading settles and cannot later fetch/save data',async()=>{
  for(const phase of ['identity','fetch','blob']){
    const f=setup(), controller=new AbortController(); let release;
    const stalled=new Promise(resolve=>{release=resolve;});
    if(phase==='identity') f.auth.currentUser.getIdTokenResult.mockReturnValue(stalled);
    if(phase==='fetch') f.fetchImpl.mockReturnValue(stalled);
    if(phase==='blob') f.fetchImpl.mockResolvedValue({...response(),blob:()=>stalled});
    const promise=f.download(ID,controller.signal), assertion=expect(promise).rejects.toThrow();
    await Promise.resolve(); await Promise.resolve(); controller.abort(); await assertion;
    release(phase==='identity'?{token:'fixture',claims:{admin:true}}:phase==='fetch'?response():new Blob(['synthetic']));
    if(phase==='identity') expect(f.fetchImpl).not.toHaveBeenCalled();
  }
});
