# שיפורי העיצוב באתר סיורי חיליק — Implementation Plan

> **For agentic workers:** Execute this plan task by task in the existing dedicated Chilik checkout. Implementation stays in this session; one fresh, separate Codex reviewer gates the final candidate before publication. This plan does not dispatch implementation agents or authorize product changes during the planning request.

**Goal:** לממש את שבעת ממצאי העיצוב: אתר אישי יותר, קצר וסריק בנייד, עם תיעוד מקורי, היררכיה ברורה ואחידות בין הבית, ההרשמה והמדריכים.

**Architecture:** שיפורים מדורגים בקומפוננטות React הקיימות ובמחולל העמודים הסטטיים. שפה חזותית משותפת קטנה, הרחבה נגישה לתוכן ארוך ושימוש חוזר בנכסים המאושרים. קוד הזמנות, תשלומים, נתוני שרת ומדידה ממשיכים לפעול בממשקים הקיימים.

**Tech Stack:** React 18, Vite 5, CSS/Tailwind, i18next, Vitest/Testing Library, כלי הדפדפן הקיימים, Firebase Hosting. אין תלות חדשה.

**Spec:** [אפיון העיצוב](../specs/2026-11-20-visual-design-refinement.md). המקור הראשוני הוא 73f3c3b2d7892b60d86713a20f1948a2657903b5; יש לבדוק מחדש את main והעבודה המקומית בתחילת המימוש.

**Status:** תוכנית בלבד. משימות המימוש שלהלן טרם בוצעו. שיטת הביצוע הקיימת נשמרת: מימוש מקומי וביקורת Codex נפרדת לפני פרסום.

## Global Constraints

- שומרים Assistant ו־Frank Ruhl Libre, את ששת הגופנים המקומיים ואת שמות המסלולים/העוגנים. אין ספריית UI, פונט חיצוני או כלי מעקב חדש.
- שומרים תשע תחנות, שישה מאכלים, 18 סרטונים ו־38 הפניות. תוכן נוסף נגיש גם ללא JS; אין הסתרה לצורך הטעיית מנועי חיפוש.
- שומרים מחיר פתוח 250 ILS, מגבלה ציבורית 30 ומגבלת checkout 20, יתרות אמיתיות, חסימות חופפות לפרטיים, אופק 2027–2028, idempotency, אימות תשלום, ביטולים והעדפות מדידה.
- אין שינוי ב־Functions, Firestore/rules, הגדרות סליקה, נמעני הודעות, GA4, Search Console או consent במסגרת העיצוב. אין המלצות/דירוגים/מחיר פרטי/כניסה למאפייה שלא אושרו.
- כל בדיקות הסליקה מבודדות: אין חשבון, הזמנה, רכישה או חיוב אמיתיים, ואין שליחת אירוע purchase פיקטיבי.
- פועלים בפרויקט חיליק בלבד, לא ב־Newreel. אין ערבוב מדיניות או שימוש ב־Claude לצורך התוכנית.
- כל צילומי הבדיקה, נתוני זמינות, snapshots וקבלות נשמרים ב־.codex-local או בתיקיית הראיות המקומית, מחוץ ל־Git. קובצי מוצר ו־docs נקיים בלבד ב־PR.

## Review Focus

1. הרחבה לפני hydration או ללא JS: כל טקסט וקישור זמינים, מצב details לא נסגר במפתיע ואין אודיו נסתר. נבדק במשימות 3 ו־7.
2. ניווט בזמן טעינה, דיאלוג פתוח ומעבר בין 1279/1280: המיקוד חוזר, גוף הדף משתחרר מ־scroll lock והעוגן לא זז בגלל לוח עצל. נבדק במשימות 4 ו־7.
3. אנגלית ארוכה, כותרת ויזניץ, טקסט 200%, תמונות/גופנים חסומים: אין חיתוך או הקטנת טקסט כדי להכניסו. נבדק במשימות 1, 5, 6 ו־7.
4. שינוי תאריך/כמות, שגיאת native validation, זמינות שפגה, כשל תשלום זמני ו־gtag זורק: אין אובדן בחירה, כפילות בקשה או פגיעה בהפניה. נבדק במשימות 4, 6 ו־7.
5. CSS משותף בונה גם inquiry, booking ועמודים סטטיים: אין הלבנה מקרית של ניהול/אישור/תקנון, פגיעה ב־noindex או שינוי VideoObject/FAQ. נבדק במשימות 1, 5 ו־7.

## מפת קבצים וגבולות

יצירה: src/design-tokens.css; src/data/homeHighlights.js; src/components/MediaHighlights.jsx; tests/ui/home-media-trust.test.jsx; tests/ui/home-disclosures.test.jsx. קובץ UI חדש נוסף ייווצר רק אם קיים צורך ממשי, לא כדי לבנות ספריית עיצוב.

שינוי עיקרי: src/site-design.css, src/booking-conversion.css, src/organic-guide.css, src/components/{Hero,RatingBar,Journey,Menu,TourVideos,MediaSection,Header,BookingDiscovery}.jsx, src/InquiryApp.jsx, src/data/bookingConversion.js, src/locales/{he,en}.json, scripts/{build-organic-pages,guide-growth}.mjs, apps/protected-booking/src/components/BookingSection.css. src/organic-seo.css ייערך רק אם כלל מוגבל ל־guide-page מחייב זאת.

בדיקות קיימות לשימוש/עדכון: tests/ui/{hero-ambient,design-sections,tour-videos,media-references,mobile-header,mobile-menu-motion,navigation-settle,navigation-cancel,booking-discovery,booking-observation,guide-growth,private-guide-facts,organic-seo}.test.*; ובדיקות ui של protected-booking. משנים ציפיות מבנה רק כשזו כוונת האפיון, ולא מוחקים בדיקות התנהגות כדי להכשיר עיצוב.

המימוש נשאר אצל מבצע אחד, בסדר להלן. משימות 2–4 משתמשות בתשתית 1; משימות 5–6 משתמשות באותם צבעים וכפתורים; משימה 7 מאמתת את האצווה כולה. PR אחד עם קומיטים קטנים וביקורת סופית אחת.

## Task 1: בסיס חזותי ותיעוד נקודת הייחוס

**Files:** יצירה src/design-tokens.css; שינוי src/site-design.css ו־apps/protected-booking/src/components/BookingSection.css לצריכת המשתנים. ראיות ב־.codex-local/design-qa-baseline/.

**Interfaces:** קובץ CSS מקומי מגדיר --tour-paper, --tour-surface, --tour-ink, --tour-muted, --tour-accent, --tour-link לפי ששת הערכים באפיון, וכן --tour-control-radius:12px ו־--tour-media-radius:16px. site-design ממפה את --target-* הקיימים אליהם. BookingSection צורך אותם רק בסלקטורים הקיימים של אזור ההרשמה. מחולל המדריכים יוכל לשרשר את אותו קובץ במשימה 5.

- [ ] לבדוק מקור/עץ עבודה ו־main; להמשיך מגרסה עדכנית בענף codex/visual-design-refinement-20261120, תוך שימור כל שינוי אחר. לשמור screenshot, גובה אזורים ובקשות מדיה בבסיס, ללא מידע של לקוחות.
- [ ] למדוד מחדש בבית 390×844 בשתי השפות, לאחר מעבר על כל האזורים וחזרה למעלה, עם הרחבות סגורות וגופנים נטענים. זהו הבסיס להשוואת קיצור 20%; לא מספר שנלקח מהרצה בתנאים שונים.
- [ ] ליצור את המשתנים ולהחליף רק את הערכים המקבילים הקיימים; להוסיף @import './design-tokens.css' בראש site-design.css ו־@import '../../../../src/design-tokens.css' בראש BookingSection.css. לא להעביר את כל ה־CSS או להוסיף override לא־מוגבל ל־body/button.
- [ ] לבדוק צבעים בפועל, כפתור, focus ומצב fallback ב־HE/EN וב־320/390/1440. בשינוי CSS זה אין צורך בבדיקות יחידה שסורקות מחרוזות צבע.
- [ ] לשמור commit: style: share existing tour design tokens.

**קבלה:** אותו אופי חזותי בבסיס, ללא שינוי התנהגות/מסלולים; משתנים ניתנים לשימוש גם בעמוד סטטי. כל מצב שאינו guide-page/אזור ציבורי נשמר.

## Task 2: מסך ראשון ותיעוד אישי במקום דימוי כפול

**Files:** שינוי src/components/Hero.jsx, RatingBar.jsx, src/site-design.css; יצירה src/data/homeHighlights.js, MediaHighlights.jsx ו־tests/ui/home-media-trust.test.jsx; עדכון tests/ui/hero-ambient.test.jsx ו־src/InquiryApp.jsx.

**Interfaces:** homeVideoSelection(groups) מחזיר {featured,remainingGroups,total} לאחר populatedTourVideoGroups(groups), בלי לשנות את הקלט. שלושת ה־IDs המועדפים הם MxVd7LEjkJyq1eXMAuuT, CUYEMWo96u8, 6i1rv_znrbk, עם מילוי מתוך תקינים אחרים עד שלושה בלבד. mediaHighlightSelection(references) מחזיר את mako-tour, kan-moreshet, donkey-tour בסדר זה, ומשמיט רשומה חסרה. MediaHighlights({language='he'}) מציג את ההפניות שנמצאו, ומחזיר null כשהרשימה ריקה.

- [ ] להוסיף בדיקות לתוכן מקור אמיתי, רשומות חסרות/לא תקינות, בחירה ללא כפילויות, סדר שלושת הנבחרים, כותרות HE/EN וקישורי מקור עם noopener/noreferrer. להריץ ולוודא כישלון התנהגותי של היכולות החדשות לפני מימושן.
- [ ] להסיר רק את שכבת person-frame ואת setupFigureLife/refs/effects המשמשים אותה ב־Hero. לשמר רצף וידאו, תמונת fallback, בקרת עצירה, reduced-motion, H1 ועובדות הסיור. את מודול האנימציה עצמו אין למחוק או לשנות עבור צרכנים אחרים.
- [ ] לצמצם את מדיית Hero בנייד ל־200–240px ולהשאיר עובדות וכפתור במסך הראשון 390×844, תוך גלילה טבעית בעת הגדלת טקסט. לשמור את הדיוקן האמיתי בביוגרפיה ובהרשמה.
- [ ] להחליף בכרטיס "סיורים" של RatingBar את תמונת ההמחשה לפוסטר הרחוב המקורי 640×360; לציין "תיעוד מסיור קודם" / "From a previous tour" ולעדכן יחד את aria-describedby כך שלא יצביע לתיאור AI או למזהה חסר. להסיר גילוי AI רק מהתמונה שהוחלפה; לשמור את הגילוי באזור האוכל. לא לחתוך פנים או כתובית מקור ולא להציג את הפוסטר כתמונת מנה.
- [ ] לשלב את MediaHighlights אחרי bookingDiscovery ב־InquiryApp, כך שאין שורת רווח ריקה כשאין discovery או כשחסרות הפניות. לשמור את כל 38 ההפניות במקור הנתונים.
- [ ] להריץ home-media-trust ו־hero-ambient, ולבדוק screenshot במחשב/נייד ובמדיה חסומה. לשמור commit: feat: foreground original tour footage and sources.

**קבלה:** מרכז חזותי אחד ב־Hero; תיעוד אמיתי מזוהה; הפניות עובדתיות בלבד. אין נכס חדש, עדות לקוח, הבטחת ביקור או בקשת רשת למקור חיצוני לפני לחיצה על הפניה.

## Task 3: קיצור הדף בלי אובדן תוכן

**Files:** שינוי Journey.jsx, Menu.jsx, TourVideos.jsx, MediaSection.jsx, InquiryApp.jsx, site-design.css ו־src/locales/{he,en}.json; יצירה tests/ui/home-disclosures.test.jsx; עדכון tour-videos/media-references/design-sections לפי הכוונה החדשה.

**Interfaces:** Journey ממשיך להיות #journey; Menu #menu; TourVideos({groups=tourVideos,compact=false}) שומר את המצב המלא הקיים, וב־compact משתמש ב־homeVideoSelection. MediaSection שומר את המסננים ו־#media. summary מתאר את מספר הפריטים הנוספים בכל שפה; המצב נשען על details טבעי, בלי aria-expanded ידני שעלול לצאת מסנכרון.

- [ ] להוסיף בדיקות: תשע תחנות קיימות ב־HTML, שלוש לפני details ושש אחריו בסדר המקורי; כל 18 כותרות/מקורות וידאו קיימים; כל 38 הפניות ניתנות לגישה; קבוצה ריקה או שני סרטונים בלבד אינם יוצרים שארית/מספרים שגויים. להריץ ולראות את הכישלון הנדרש.
- [ ] ב־Journey להציג שלוש ראשונות ואז details עם שש הנותרות. להשתמש בשתי רשימות ol תקינות, השנייה start=4, ולא להכניס details כילד לא תקין של ol. לשמור את הכותרות והמספור 01–09 ואת כל טקסט התחנות.
- [ ] במצב compact של TourVideos להציג שלושה נבחרים בסך הכול. details מכיל בתחילה רשימת כותרות וקישורי קובץ אמיתיים של השאר, שכבר קיימת ב־SSR. פתיחה עם JS מתקינה את הנגנים הנוספים, עם poster/captions/controls ו־preload=none; סגירה קוראת pause() לכל נגן שבתוך ההרחבה לפני הסרתו. פתיחה לפני hydration נשמרת בקריאת details.open בעת ההתחברות; ללא JS נשארים קישורי צפייה תקינים. אין הורדת 15 פוסטרים/נגנים לפני פתיחת ההרחבה.
- [ ] ב־MediaSection להציג שלוש הפניות בכל קטגוריה ורשימת השאר בתוך details; לשמור 38/15/12/11 לפי הנתונים, קישורים מקוריים, מונה ו־status. החלפת קטגוריה סוגרת הרחבה ומשאירה מיקוד בכפתור המסנן. מצב ללא JS ממשיך לאפשר את כל רשימת ברירת המחדל.
- [ ] בנייד להפוך את ששת כרטיסי האוכל לרשימה קומפקטית: תמונה 80–112px לצד טקסט, min-width:0 ושבירת כותרות טבעית; לא לקצר שמות או להסתיר את גילוי ההמחשה. במחשב לשמור גלריה מרווחת.
- [ ] להעביר ב־InquiryApp את גלריית המקור לפני Menu. לעדכן במפורש את בדיקת הסדר הישנה שמצפה לווידאו אחרי התפריט, תוך שמירת טענותיה לגבי inquiry, #videos ושתי שפות. לעדכן הערכות content-visibility לאזורים המצומצמים ולבדוק שאין פערי רווח אחרי קפיצה.
- [ ] להריץ את בדיקות המשימה, ולבדוק בממשק בנוי Space/Enter, פתיחה/סגירה לפני ואחרי hydration, ללא JS ונגינה שנעצרת. לבדוק תחנות עד 1,100px ב־390, וקיצור הבית 20% מול הבסיס. לשמור commit: feat: compact long homepage sections accessibly.

**קבלה:** התוכן המלא נגיש; רק שלושה נגנים מותקנים בתחילה; אין כפילויות בנבחרים ובשאר; אין אודיו אחרי סגירה או אובדן יעד עוגן. יעד הגובה לא מושג באמצעות הסתרת מידע חיוני.

## Task 4: ניווט ופעולות עקביים

**Files:** שינוי Header.jsx, Hero.jsx, BookingDiscovery.jsx, src/data/bookingConversion.js, src/booking-conversion.css, src/site-design.css ותרגומים רלוונטיים; עדכון mobile-header, mobile-menu-motion, navigation-settle/navigation-cancel ו־booking-discovery.

**Interfaces:** bookingConversionCopy(language).openAction = "בחירת מועד" / "Choose a date"; privateContact = "בירור סיור פרטי" / "Ask about a private tour". מקומות הכניסה הרלוונטיים צורכים את אותו מקור נוסח. callback, goToInquiry, onSelectDate, privateTourContactHref ו־data-contact-context הקיימים נשמרים.

- [ ] להוסיף/לעדכן בדיקות למטרת הפעולות: open מקדם לבחירת מועד, private פותח רק את קישור הבירור, פעולות הפרטים/תשלום שומרות את התנהגותן. לוודא שה־handlers אינם מופעלים פעמיים בגלל עטיפה חדשה.
- [ ] לאחד סגנון וגודל לפעולות הכניסה; להשאיר מדריכים ואסמכתאות כקישורים משניים. לא לשנות את ה־disabled/validation של פקדי ההזמנה ולא להוסיף כפתור קבוע נוסף בנייד.
- [ ] להציג במחשב about/journey/menu/faq, ועוד details ל־lectures/videos/media/terms; לבדוק הצגה מותנית של videos כשהקבוצות ריקות. כל קישור שומר href אמיתי ו־modified-click. Escape סוגר את details ומחזיר focus ל־summary; לחיצה בחוץ סוגרת בלי לקחת מיקוד מיעד הלחיצה. summary אינו role=menu אם הוא ניווט רגיל.
- [ ] לשמור בדיאלוג הנייד את כל היעדים, סגירה מיידית, החזרת focus ושחרור overflow. לבדוק 1279↔1280 כשדיאלוג או תפריט "עוד" פתוחים, והגעה מ־/booking לעוגן בבית בזמן טעינה.
- [ ] להריץ בדיקות המשימה וניווט מופחת תנועה בשתי שפות; לשמור commit: feat: simplify tour navigation and entry actions.

**קבלה:** אותה פעולה נקראת באותו שם, וכל כפתור בהמשך המשפך מתאר את השלב הבא שלו. אין קישור שבור, דיאלוג ללא יציאה, גלילה נעולה או קפיצה שזזה אחרי טעינת הלוח.

## Task 5: התאמת המדריכים לשפה המשותפת

**Files:** שינוי scripts/build-organic-pages.mjs, scripts/guide-growth.mjs, src/organic-guide.css; צריכת design-tokens.css; שינוי ממוקד ב־organic-seo.css רק אם נדרש. עדכון guide-growth, private-guide-facts ו־organic-seo.

**Interfaces:** מחוללי מדריך/וידאו מוסיפים class="guide-page" ל־body ומשתמשים באותם משתנים. שילוב CSS הוא typography + design-tokens + organic-seo + organic-guide. רכיבי פתיחת/סיום מדריך צורכים את נוסח הפעולה המתאים מ־bookingConversionCopy; privateTourContactHref נשמר.

- [ ] להוסיף בדיקות ל־guide-page בשלושת המדריכים ובעמוד הסרטון, שימור טקסט/FAQ/canonical/hreflang, והפרדה בין מעטפות ניהול/אישור/תקנון למדריכים. לבדוק את הכשל לפני הוספת העטיפה והסגנון.
- [ ] להחליף רק בתבניות מדריך/watch את רקע ה־body המקובע #121214 ברקע המשותף ולהחיל את כללי הקריאה תחת .guide-page. לא לעדכן ידנית dist ולא לצרף את כל site-design.css למדריכים.
- [ ] לקבוע רוחב קריאה עד 70ch, כותרת ראשית 28–40px, כותרות משנה קטנות ממנה, טקסט גוף 16px ומעלה וקישורים ברורים. לשמור את הווידאו הראשי סמוך לכותרתו, הפוסטר/הכיתובים וה־black matte של הנגן עצמו.
- [ ] לשמור במדויק VideoObject.uploadDate=2026-01-26T08:45:40-08:00 ואת creator Person. לא לשנות תאריכי עובדות בעלים או להמציא תאריכי תוכן; תאריך עריכה משתנה רק לעמוד שתוכנו נערך מהותית.
- [ ] לבנות booking/inquiry בסדר, לבדוק את שלושת המדריכים וה־watch ב־HTML ללא JS ובמחשב/נייד/טקסט 200%; לשמור commit: style: align organic guides with the tour site.

**קבלה:** מדריכים נראים חלק מהאתר, כל התוכן/התשובות והזהות במנועי חיפוש נשמרים; ניהול/אישור/תקנון לא קיבלו סגנון גלובלי בטעות.

## Task 6: קריאות בהרשמה ללא שינוי לוגיקה

**Files:** שינוי apps/protected-booking/src/components/BookingSection.css, src/booking-conversion.css ו־src/components/BookingSourceStory.css לפי צורך מדוד. BookingForm.jsx/BookingSection.jsx אינם יעד לשינוי לוגיקת הזמנה; יש לשנות JSX רק אם נדרש markup נגיש ומנומק.

**Interfaces:** public callbacks, שדות, form id, submit controls, live regions ו־MobileBookingBar נשארים. כללי עזר ≥14px, primary CTA≥16px/54px ושדות ≥16px מוגבלים לסלקטורים הציבוריים.

- [ ] להריץ את בדיקות ההרשמה הממוקדות לפני שינוי ולשמור בסיס למסך בחירה ולפרטים. אין צורך בבדיקות חדשות שמעתיקות ערכי CSS; ההתנהגות הקיימת והדפדפן הם האימות.
- [ ] להגדיל את כותרות המשנה והוראות 10–12px השימושיות: ניווט חודשים, תווית מועד/זמינות, מחיר לשניים, אבטחה, הודעת אי־חיוב, notices ושגיאות. לוודא שכרטיס מועד גדל כשצריך ואינו חותך את השנה או הטקסט.
- [ ] לשמור על מבנה סכום/משתתפים, פס ההמשך הקיים ו־safe-area. כאשר מקלדת פתוחה, שדה ושגיאה נשארים גלויים ואפשר לגלול אל הכפתור. אין focus שמוסתר מתחת לפס קבוע או לכותרת.
- [ ] לבדוק HE/EN ב־320/390/768/1440, טקסט 200%, שם חודש ארוך, מחיר של 20 משתתפים וסטטוס unavailable. להריץ booking-journey, booking-ui-regression, booking-month-navigation, booking-observation ו־payment-retry-confirmation; לשמור commit: style: improve booking readability on mobile.

**קבלה:** 14–16px נשאר קריא בפועל ולא מוקטן על ידי override מאוחר; בחירה, validation, retry, מחיר והמשך לתשלום נשארים זהים.

## Task 7: בדיקות שילוב, ביקורת ופרסום

**Files:** כלי QA וקבלות רק ב־.codex-local/design-qa-local/ וב־design-qa-live/; תיעוד סיכום/צילומים פרטיים. source/HTML סופיים נבדקים לפני הקפאת SHA. אין פרסום בשלב כתיבת התוכנית.

**Interfaces:** לשכפל ולהתאים את growth20-qa.cjs ו־growth20-live-verify.cjs הקיימים, בלי לדרוס את ראיות growth20. בסיס ראשון הוא dist-booking; בסיס שני הוא האתר החי; כל Auth/availability/createPayment/analytics/provider יורטו לפני navigation. GET ציבורי לזמינות אמיתית נעשה בנפרד, ללא נתונים אישיים.

- [ ] להריץ את שני ה־UI suites ולבדוק שכל הבדיקות הקיימות והחדשות עברו. הבסיס האחרון היה 287+164=451, אך אין לקבע את המספר הזה כשהתווספו בדיקות:

```powershell
npm run test:inquiry
npm --prefix apps/protected-booking run test:ui
```

- [ ] להריץ בניות ושער גבולות ברצף, כי יש ביניהן קבצי הכנה משותפים:

```powershell
npm run build:booking
npm run build:inquiry
npm run build:booking-demo
npm run verify:organic:boundaries
git diff --check
```

- [ ] להריץ QA על הקבצים הבנויים. כל שורה הבאה היא מקרה קבלה בדוח פרטי, לא סימון ידני ללא ראיה:
  - בית/הרשמה/שלושת המדריכים/watch ב־HE/EN ככל שהעמוד תומך, 320/390/768/1024/1279/1280/1440; אין ליצור גרסת אנגלית חדשה למדריך עברי.
  - גובה בית ותחנות אחרי layout מלא; הרחבות סגורות/פתוחות; שלוש בחירות גלריה ולא שש; ששת המאכלים; כל 18/38 הקישורים; מקרים של רשומות חסרות.
  - ללא JS, פתיחה לפני hydration, מקלדת, טקסט 200%, reduced-motion, fonts/images חסומים, תפריט פתוח בשינוי רוחב. אין console/page/hydration errors או overflow.
  - עוגנים journey/menu/videos/lectures/about/media/faq/date-selection בטעינה ישירה ובניווט תוך־אתרי; התאמת CSS המוטמע לבאנדל הסופי, כדי שלא יוחזר עיצוב ישן בטעינה מוקדמת.
  - אין טעינת MP4/WebM חדשה לפני Play מלבד רצף ה־Hero הקיים ובהתאם למנגנון הקיים. סגירת הרחבה עוצרת נגנים נוספים; אין autoplay או צד שלישי חדש.
  - שמונה זרימות מבודדות: HE/EN ×390/1440 ×26.11/10.12, שני משתתפים ו־500 ILS, כולל native invalid; 503 מבוקר וניסיון חוזר באותו idempotency key; בדיקה עם gtag זורק. אין פרטי שדות באירועי diagnostics ואין חיוב/חשבון/הזמנה אמיתיים.
- [ ] לקבע SHA נקי ולהעביר לסוכן Codex נפרד אחד, בסשן חדש שלא השתתף במימוש: האפיון, התוכנית, diff, פקודות ותוצאות, מגבלות QA וחומר המקור המאושר. לקבל GO על המועמד הסופי; תיקוני ביקורת חוזרים לאותו בודק והבדיקות הרלוונטיות מורצות שוב. אין צורך בסוכני ביקורת לכל קומיט.
- [ ] בעת ביצוע עתידי של הפרסום, לשמור snapshots חדשים ל־Hosting ול־18 Functions, ולרשום את ה־rollback החי באותו רגע. ליצור PR עם צילומי לפני/אחרי במחשב ובנייד ומגבלות בדיקת הסליקה. למזג רק את ה־SHA שקיבל GO ולפרסם Hosting בלבד:

```powershell
firebase deploy --only hosting --project hilik-site --config firebase.hosting.booking.json
```

- [ ] לאחר הפרסום לאמת hashes למסלולים/JS/CSS/גופנים, headers/404/noindex, schema ועוגנים; להריץ שוב את שמונה הזרימות המיורטות על הממשק החי. לקרוא זמינות ציבורית עד lastBookableDate מתוך functions/src/booking-horizon.json; לוודא 26.11/10.12, כיסוי 2027–2028 ומגבלות לפי היומן העדכני. לא לקבע "104 מועדים פתוחים" אם בינתיים נרשמו הזמנות או נקבעו פרטיים לגיטימיים, ולא לפתוח את 3.12 רק כדי להעביר בדיקה.
- [ ] לשמור קבלה ו־CHECKPOINT: SHA, מזהה Hosting ו־rollback, GO, צילומים, תוצאות מקומיות/חיות נפרדות, זמינות בזמן הבדיקה, 18 Functions שלא השתנו ותלויות בעלים. לסגור רק שרתי QA שנוצרו למשימה ולשמור צילום הוכחה של התוצאה החיה.

**קבלה:** כל תנאי האפיון והביקורת עברו; התוצאה החיה תואמת למועמד. במקרה רגרסיה מהפרסום מחזירים את גרסת Hosting שנרשמה לפניו, בלי לשנות הזמנות, Functions או נתוני מדידה.

## מדידה ותלויות שאינן חוסמות את העיצוב

- [ ] אחרי שבעה ימים מלאים, ואחר כך 28 ימים, לבדוק ידנית את המשפך הקיים לפי האפיון באותו מקור/מכשיר/שפה. לא להוסיף key events, לא לבחון הצלחה רק לפי קליק WhatsApp ולא להכריז על שיפור מובהק במדגם קטן. ב־Search Console להשוות חלונות מלאים ולעקוב אחר המדריכים והשאילתות הלא־ממותגות; אין הבטחת עלייה בדירוג מהעיצוב לבדו.
- [ ] כשיתקבלו מחיליק חומר ואישור, להחליף את יתר תמונות האוכל להמחשה ולהוסיף המלצות/סיפורי לקוח מאומתים. זהו שלב תוכן נפרד: כיום אין אישור חדש, אין צורך להמתין לו כדי לבצע Tasks 1–7, ואין לשלוח שוב את השאלות שכבר נשלחו.

## בדיקת כיסוי עצמית של התוכנית

- [x] D1 קיצור/תוכן מלא → Task 3 ובדיקות Task 7.
- [x] D2 תיעוד מקורי → Tasks 2–3, ותלות תוכן מפורשת לצילומי מנות חדשים.
- [x] D3 מסך ראשון → Task 2; D4 מדריכים → Task 5; D5 קריאות → Task 6.
- [x] D6 כפתורים/ניווט → Task 4; D7 אסמכתאות → Tasks 2–3.
- [x] חמשת מוקדי הביקורת מקבלים בדיקות מוגדרות; שמות הפונקציות, הנכסים ומסלולי המקור תואמים בין המשימות.
- [x] אין בדיקת יחידה לכל ריווח/צבע, שינוי backend, רכישה פיקטיבית, אוטומציה חדשה או תוכן בעלים מומצא. קיימים שער ביקורת נפרד, פרסום הפיך ובדיקת תשלום ללא חיוב.
