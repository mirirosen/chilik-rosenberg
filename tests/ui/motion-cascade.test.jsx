import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { gsap } from 'gsap';
import { useHomeMotion } from '../../src/hooks/useHomeMotion';
import { settle } from '../../src/animations/registry';

// GSAP plan S3: the contact channels enter in order WhatsApp → phone → email, STAGGER.base (.06s) apart, whatever
// order the observer reports them in; other groups keep STAGGER.tight (.04s).
let reduced, observers;
function Fixture() {
  const ref = useHomeMotion('home');
  return <main ref={ref}>
    <section id="date-selection">
      <div className="inquiry-actions" data-motion-stagger="base">
        <a data-motion="reveal" data-motion-arrive href="https://wa.me/1">WhatsApp</a>
        <a data-motion="reveal" href="tel:1">Phone</a>
        <a data-motion="reveal" href="mailto:a@b.c">Email</a>
      </div>
    </section>
    <ul className="cards"><li data-motion="reveal">A</li><li data-motion="reveal">B</li></ul>
  </main>;
}
beforeEach(() => {
  reduced = false; observers = [];
  vi.stubGlobal('matchMedia', query => ({ media: query, get matches() { return !reduced; }, addListener() {}, removeListener() {} }));
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb) { this.cb = cb; observers.push(this); }
    observe() {} unobserve() {} disconnect() {}
  });
});
afterEach(() => { cleanup(); gsap.globalTimeline.clear(); vi.unstubAllGlobals(); });
const below = targets => observers.forEach(o => o.cb(targets.map(target => ({ target, isIntersecting: true, boundingClientRect: { top: window.innerHeight + 40 } }))));
const delay = el => gsap.getTweensOf(el)[0]?.delay();

describe('contact channel cascade (S3)', () => {
  it('WhatsApp → phone → email, .06s apart, even when reported in reverse order', () => {
    const { container } = render(<Fixture />);
    const [wa, phone, email] = container.querySelectorAll('.inquiry-actions a');
    below([email, phone, wa]);
    expect([delay(wa), delay(phone), delay(email)].map(d => Number(d.toFixed(3)))).toEqual([0, 0.06, 0.12]);
  });

  it('other groups keep the tight step', () => {
    const { container } = render(<Fixture />);
    const [a, b] = container.querySelectorAll('.cards li');
    below([b, a]);
    expect([delay(a), delay(b)].map(d => Number(d.toFixed(3)))).toEqual([0, 0.04]);
  });

  it('settling the section (navigation to the inquiry) leaves no channel mid-entrance', () => {
    const { container } = render(<Fixture />);
    const links = [...container.querySelectorAll('.inquiry-actions a')];
    below(links);
    settle(container.querySelector('#date-selection'));
    links.forEach(link => {
      expect(gsap.getTweensOf(link)).toHaveLength(0);
      expect(link.getAttribute('style') || '').not.toMatch(/opacity|transform|translate/);
    });
  });

  it('under reduced motion the channels get no entrance at all', () => {
    reduced = true;
    const { container } = render(<Fixture />);
    const links = [...container.querySelectorAll('.inquiry-actions a')];
    below(links);
    links.forEach(link => expect(gsap.getTweensOf(link)).toHaveLength(0));
  });
});
