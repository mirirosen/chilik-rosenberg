import { describe, it, expect } from 'vitest';
import { stripPaymentReturnDetails } from '../../src/utils/paymentReturn';

describe('DirectNG return privacy', () => {
  const id = 'BK-' + 'a'.repeat(24);
  it('removes provider identity/card fields while preserving the public booking reference and history state', () => {
    const state = { existing: true };
    window.history.replaceState(state, '', `/booking?payment=success&id=${id}&myid=PRIVATE_ID&TranzilaTK=PRIVATE_TOKEN&thtk=PRIVATE_HANDSHAKE&Response=000&auth_number=PRIVATE_APPROVAL&expyear=30`);
    expect(stripPaymentReturnDetails()).toBe(true);
    expect(window.location.search).toBe(`?payment=success&id=${id}`);
    expect(window.history.state).toEqual(state);
    expect(stripPaymentReturnDetails()).toBe(false);
  });
  it('keeps a diagnostic reference, without retaining provider tokens or treating Response as payment proof', () => {
    window.history.replaceState(null, '', '/booking?payment=success&test=CHECK-20261008-abcdefabcdef&Response=000&thtk=PRIVATE');
    stripPaymentReturnDetails();
    expect(window.location.search).toBe('?payment=success&test=CHECK-20261008-abcdefabcdef');
    window.history.replaceState(null, '', '/booking?Response=000&myid=PRIVATE_ID&id=untrusted');
    stripPaymentReturnDetails();
    expect(window.location.search).toBe('');
  });
  it('does not alter date selection, demo checkout or unrelated site routes', () => {
    for (const path of ['/booking?date=2026-10-15&participants=2', `/booking?demoCheckout=${id}`, '/terms?payment=success']) {
      window.history.replaceState(null, '', path);
      expect(stripPaymentReturnDetails()).toBe(false);
      expect(window.location.pathname + window.location.search).toBe(path);
    }
  });
});
