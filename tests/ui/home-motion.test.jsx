import React, { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { gsap } from 'gsap';
import { useHomeMotion } from '../../src/hooks/useHomeMotion';
import { settle } from '../../src/animations/registry';

const interaction = element => gsap.getTweensOf(element).filter(tween => tween.vars.scale !== undefined || tween.vars.y !== undefined);

let reduced;
let fine;
let observers;
let queries;

function Fixture({ route = 'home' }) {
  const ref = useHomeMotion(route);
  return <main ref={ref}>
    <header className="target-hero"><div className="target-hero__copy"><h1 data-motion="hero-line">Chilik tours</h1><p data-motion="hero-line">Explore the city</p><button className="target-button" data-motion="hero-cta">Choose dates</button></div><div className="target-hero__person-frame"><img className="target-hero__person" alt="" /></div></header>
    <a className="target-menu__cta" href="#date-selection">Upcoming tours</a>
    <div className="target-journey__grid"><li data-motion="reveal">First stop</li><li data-motion="reveal">Next stop</li></div>
    <article className="target-menu__dish" data-motion="reveal">Cholent</article>
    <section id="date-selection"><button>Book now</button></section>
  </main>;
}

beforeEach(() => {
  reduced = false;
  fine = true;
  observers = [];
  queries = [];
  vi.stubGlobal('matchMedia', vi.fn(query => {
    const mql = {
      media: query,
      get matches() { return !reduced && (!query.includes('hover') || fine); },
      addListener: vi.fn(), removeListener: vi.fn(),
    };
    queries.push(mql);
    return mql;
  }));
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback) {
      this.callback = callback;
      this.targets = new Set();
      this.disconnected = false;
      observers.push(this);
    }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.disconnected = true; this.targets.clear(); }
    reveal(targets) { this.callback(targets.map(target => ({ target, isIntersecting: true }))); }
    notify(entries) { this.callback(entries); }
  });
});
afterEach(() => {
  cleanup();
  gsap.globalTimeline.clear();
  vi.unstubAllGlobals();
});

describe('bounded GSAP homepage enhancements', () => {
  it('keeps content visible before observation and reveals cards once without touching booking', () => {
    const { container } = render(<Fixture />);
    const heading = container.querySelector('h1');
    const cards = [...container.querySelectorAll('li')];
    const booking = container.querySelector('#date-selection button');
    expect(gsap.getTweensOf(heading).length).toBe(1);
    expect(heading.style.opacity).toBe('');
    expect(heading.style.transform).toContain('translate');
    expect(cards.every(card => card.style.opacity === '')).toBe(true);
    observers[0].reveal(cards);
    expect(gsap.getTweensOf(cards[0]).length).toBe(1);
    expect(observers[0].targets.has(cards[0])).toBe(false);
    expect(gsap.getTweensOf(booking)).toHaveLength(0);
    expect(booking.getAttribute('style')).toBeNull();
    expect(gsap.getTweensOf(container.querySelector('.target-hero__person'))).toHaveLength(0);
    expect(container.querySelector('.target-hero__person').getAttribute('style')).toBeNull();
    gsap.getTweensOf(cards[0])[0].progress(1);
    expect(cards.every(card => card.style.opacity === '' && card.style.transform === '')).toBe(true);
  });

  it('skips animation from initial reduced motion and coarse-pointer hover', () => {
    reduced = true;
    const reducedView = render(<Fixture />);
    expect(gsap.getTweensOf(reducedView.container.querySelector('h1'))).toHaveLength(0);
    expect(observers).toHaveLength(0);
    expect(reducedView.container.querySelector('h1').style.opacity).toBe('');
    reducedView.unmount();
    reduced = false;
    fine = false;
    const coarseView = render(<Fixture />);
    const coarseTweens = interaction(coarseView.container.querySelector('.target-button'));
    expect(coarseTweens).toHaveLength(1);
    expect(coarseTweens[0].vars.scale).toBe(0.985);
    expect(coarseTweens[0].paused()).toBe(true);
  });

  it('reverts live preference changes, pending observers and inline styles', async () => {
    const { container } = render(<Fixture />);
    const heading = container.querySelector('h1');
    const card = container.querySelector('li');
    const observer = observers[0];
    observer.reveal([card]);
    reduced = true;
    // Drive GSAP's registered native change listener; allow its 2ms debounce.
    await new Promise(resolve => setTimeout(resolve, 10));
    queries[0].addListener.mock.calls[0][0]();
    expect(observer.disconnected).toBe(true);
    expect(gsap.getTweensOf([heading, card])).toHaveLength(0);
    expect(heading.style.opacity).toBe('');
    expect(card.style.transform).toBe('');
    observer.reveal([card]);
    expect(gsap.getTweensOf(card)).toHaveLength(0);
    reduced = false;
    await new Promise(resolve => setTimeout(resolve, 10));
    queries[0].addListener.mock.calls[0][0]();
    expect(observers.at(-1).disconnected).toBe(false);
    expect(gsap.getTweensOf(heading)).toHaveLength(1);
  });

  it('reuses button tweens for pointer and keyboard and removes listeners on unmount', () => {
    const { container, unmount } = render(<Fixture />);
    const button = container.querySelector('.target-button');
    const tween = gsap.getTweensOf(button).find(tween => tween.vars.y !== undefined);
    fireEvent.focus(button);
    expect(tween.paused()).toBe(false);
    fireEvent.pointerEnter(button);
    fireEvent.blur(button);
    expect(tween.reversed()).toBe(false);
    fireEvent.pointerLeave(button);
    expect(tween.reversed()).toBe(true);
    expect(interaction(button)).toHaveLength(2);
    unmount();
    fireEvent.focus(button);
    expect(gsap.getTweensOf(button)).toHaveLength(0);
    expect(button.style.transform).toBe('');
  });

  it('reuses coarse-pointer press feedback, releases outside/cancel and keeps native clicks', () => {
    fine = false;
    const { container, unmount } = render(<Fixture />);
    const button = container.querySelector('.target-button');
    const press = interaction(button)[0];
    const click = vi.fn(); button.addEventListener('click', click);
    const secondary = new MouseEvent('pointerdown', { bubbles: true, button: 2 });
    fireEvent(button, secondary); expect(press.paused()).toBe(true);
    for (let index = 0; index < 4; index++) {
      const down = new MouseEvent('pointerdown', { bubbles: true, button: 0, cancelable: true });
      fireEvent(button, down); expect(down.defaultPrevented).toBe(false);
      expect(press.paused()).toBe(false); press.progress(0.5);
      fireEvent(document.body, new MouseEvent(index % 2 ? 'pointercancel' : 'pointerup', { bubbles: true }));
      expect(press.reversed()).toBe(true);
      expect(interaction(button)).toHaveLength(1);
    }
    fireEvent.click(button); expect(click).toHaveBeenCalledOnce();
    unmount(); expect(gsap.getTweensOf(button)).toHaveLength(0);
    expect(button.style.transform).toBe('');
  });

  it('supports native keyboard activation and leaves Space on links available for scrolling', () => {
    fine = false;
    const { container } = render(<Fixture />);
    const button = container.querySelector('.target-button');
    const link = container.querySelector('.target-menu__cta');
    const buttonTween = interaction(button)[0], linkTween = interaction(link)[0];
    fireEvent.keyDown(button, { key: ' ' }); expect(buttonTween.paused()).toBe(false);
    fireEvent.keyUp(button, { key: ' ' }); expect(buttonTween.reversed()).toBe(true);
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    fireEvent(link, space); expect(space.defaultPrevented).toBe(false); expect(linkTween.paused()).toBe(true);
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    fireEvent(link, enter); expect(enter.defaultPrevented).toBe(false); expect(linkTween.paused()).toBe(false);
    fireEvent.blur(window); expect(linkTween.reversed()).toBe(true);
  });

  it('cleans StrictMode replay and route changes without duplicate observers or tweens', () => {
    const { container, rerender, unmount } = render(<StrictMode><Fixture /></StrictMode>);
    const heading = container.querySelector('h1');
    expect(observers.filter(observer => !observer.disconnected)).toHaveLength(1);
    expect(gsap.getTweensOf(heading)).toHaveLength(1);
    rerender(<StrictMode><Fixture route="booking" /></StrictMode>);
    expect(observers.every(observer => observer.disconnected)).toBe(true);
    expect(gsap.getTweensOf(heading)).toHaveLength(0);
    expect(heading.style.opacity).toBe('');
    rerender(<StrictMode><Fixture /></StrictMode>);
    expect(observers.filter(observer => !observer.disconnected)).toHaveLength(1);
    unmount();
    expect(observers.every(observer => observer.disconnected)).toBe(true);
  });

  it('classifies each target on its first notification: in view, margin-only, or not yet intersecting', () => {
    const { container } = render(<Fixture />);
    const [inView, marginOnly] = [...container.querySelectorAll('li')];
    const later = container.querySelector('.target-menu__dish');
    const observer = observers[0];
    const below = window.innerHeight + 40;
    observer.notify([
      { target: inView, isIntersecting: true, boundingClientRect: { top: 10 } },
      { target: marginOnly, isIntersecting: true, boundingClientRect: { top: below } },
      { target: later, isIntersecting: false, boundingClientRect: { top: below + 2000 } },
    ]);
    expect(gsap.getTweensOf(inView)).toHaveLength(0);
    expect(inView.getAttribute('style')).toBeNull();
    expect(observer.targets.has(inView)).toBe(false);
    expect(gsap.getTweensOf(marginOnly)).toHaveLength(1);
    expect(observer.targets.has(later)).toBe(true);
    expect(gsap.getTweensOf(later)).toHaveLength(0);
    observer.notify([{ target: later, isIntersecting: true, boundingClientRect: { top: 20 } }]);
    expect(gsap.getTweensOf(later)).toHaveLength(1);
  });

  it('skips a target that navigation settled, even when its notification was already queued', () => {
    const { container } = render(<Fixture />);
    const card = container.querySelector('li');
    const observer = observers[0];
    settle(card);
    observer.notify([{ target: card, isIntersecting: true, boundingClientRect: { top: window.innerHeight + 40 } }]);
    expect(gsap.getTweensOf(card)).toHaveLength(0);
    expect(card.getAttribute('style')).toBeNull();
    expect(observer.targets.has(card)).toBe(false);
  });

  it('settles entrances on back/forward cache restore and keeps press/hover feedback alive', () => {
    const { container } = render(<Fixture />);
    const heading = container.querySelector('h1');
    const button = container.querySelector('.target-button');
    const interactionCount = interaction(button).length;
    expect(gsap.getTweensOf(heading)).toHaveLength(1);
    const pageshow = new Event('pageshow'); Object.defineProperty(pageshow, 'persisted', { value: true });
    window.dispatchEvent(pageshow);
    expect(gsap.getTweensOf(heading)).toHaveLength(0);
    expect(heading.style.opacity).toBe('');
    expect(heading.style.transform).toBe('');
    expect(interaction(button)).toHaveLength(interactionCount);
    expect(interactionCount).toBeGreaterThan(0);
    expect(button.style.opacity).toBe('');
    expect(button.style.getPropertyValue('--sheen-x')).toBe('');
  });

  it('keeps one owner per property in the hero entrance (S1)', () => {
    const { container } = render(<Fixture />);
    const button = container.querySelector('.target-button');
    const heading = container.querySelector('h1');
    const entrance = gsap.getTweensOf(button).filter(tween => !interaction(button).includes(tween));
    const owned = entrance.flatMap(tween => Object.keys(tween.vars).filter(key => ['opacity', '--sheen-x', 'x', 'y', 'scale', 'transform'].includes(key)));
    expect(new Set(owned)).toEqual(new Set(['opacity', '--sheen-x']));
    const headingVars = gsap.getTweensOf(heading).flatMap(tween => Object.keys(tween.vars));
    expect(headingVars).toContain('y');
    expect(headingVars).not.toContain('opacity');
    gsap.globalTimeline.progress(1);
    expect(button.style.opacity).toBe('');
    expect(button.style.getPropertyValue('--sheen-x')).toBe('');
    expect(heading.style.transform).toBe('');
  });

  it('fails open when optional browser APIs are absent', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container, unmount } = render(<Fixture />);
    expect(container.querySelector('li').getAttribute('style')).toBeNull();
    unmount();
    vi.stubGlobal('matchMedia', undefined);
    const fallback = render(<Fixture />);
    expect(fallback.container.querySelector('h1').getAttribute('style')).toBeNull();
  });
});
