import { it, expect } from 'vitest';
import { privateTourFaqs } from '../../src/data/privateTourGuide.js';
it('private guide FAQ never reuses open-tour price, duration or cancellation answers',()=>{
 const shared=Object.fromEntries(['q1','q3','q4','q7','q10','q11','q12'].map(k=>[k,{question:k,answer:['q3','q7','q12'].includes(k)?'OPEN-TOUR-ONLY':k}]));
 const faqs=privateTourFaqs(shared);const text=JSON.stringify(faqs);
 expect(text).not.toContain('OPEN-TOUR-ONLY');expect(faqs).toContain(shared.q1);expect(faqs).toContain(shared.q10);expect(faqs).toContain(shared.q11);
 expect(faqs.some(f=>f.question.includes('מחיר')&&f.answer.includes('הצעת מחיר'))).toBe(true);
 expect(faqs.every(f=>typeof f.question==='string'&&typeof f.answer==='string')).toBe(true);
});
