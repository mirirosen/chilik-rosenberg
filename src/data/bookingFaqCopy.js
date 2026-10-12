// The same overrides feed the interactive booking page and its initial HTML.
export function bookingFaqOverrides(language, resources) {
  return {
    q2: { answer: language === 'he' ? 'בחרו תאריך מתוך המועדים הזמינים ואת מספר המשתתפים, מלאו את הפרטים והמשיכו לתשלום. אישור ההזמנה יופיע לאחר אימות התשלום.' : 'Choose an available date and the number of guests, enter your details and continue to payment. Your booking is confirmed once the payment has been verified.' },
    q7: { answer: language === 'he' ? 'עלות הסיור היא 250 ₪ למשתתף. אחרי בחירת התאריך ומילוי הפרטים תוכלו לבחור את אמצעי התשלום. תשלום בכרטיס מתבצע בעמוד התשלום המאובטח של טרנזילה.' : 'The tour costs ₪250 per guest. Choose your date, enter your details and select a payment method. Card payments take place on Tranzila’s secure payment page.' },
    q8: { answer: resources.faqs.q8.answer },
  };
}
