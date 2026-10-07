export const stations = [
  { 
    icon: "layers", 
    title: "הזרמים החרדיים", 
    desc: "נכיר את ההבדלים בין חסידים לליטאים והמבנה החברתי המרתק." 
  },
  { 
    icon: "heart", 
    title: "עולם השידוכים", 
    desc: "איך בונים בית יהודי? מהפגישה בלובי המלון ועד לחתונה." 
  },
  { 
    icon: "home", 
    title: "בנייה יצירתית", 
    desc: "המרפסות המעופפות והפתרונות האדריכליים לצפיפות הבני ברקית." 
  },
  { 
    icon: "book-open", 
    title: "חנויות ספרים", 
    desc: "ביקור במוסדות הספר היהודי שבהם המילה הכתובה היא המלכה." 
  },
  { 
    icon: "coins", 
    title: "גמ\"חים וחסד", 
    desc: "הצצה לעולם המדהים של השאלת מוצצים ועד קופות הצדקה." 
  },
  { 
    icon: "users", 
    title: "ישיבות וחיידרים", 
    desc: "נחווה מקרוב מה באמת עושים כל היום בישיבה ואיך גדל ילד חרדי." 
  },
  { 
    icon: "croissant", 
    title: "מאפיית ויז'ניץ", 
    desc: "ניכנס ללב המאפייה המיתולוגית ונראה איך קולעים חלות." 
  },
  { 
    icon: "heart-handshake", 
    title: "התנדבות ותרומה", 
    desc: "נכיר את הארגונים שמניעים את החברה החרדית - חסד כדרך חיים." 
  },
  { 
    icon: "monitor", 
    title: "חדרי האינטרנט", 
    desc: "איך טכנולוגיה פוגשת מסורת ואיך גולשים בבני ברק?" 
  }
];

export const foods = [
  { 
    icon: "soup", 
    title: "הטשולנט שלי", 
    desc: "חמין עשיר בבישול ארוך עם בשר נימוח, קישקע וטעמים של בית." 
  },
  { 
    icon: "fish", 
    title: "חגיגת דגים וסביצ'ה", 
    desc: "פלטת דגים יוקרתית: סביצ'ה סלמון טרי, סביצ'ה טונה אדומה והערינג משובח." 
  },
  { 
    icon: "layers", 
    title: "קוגל ירושלמי", 
    desc: "הקוגל הירושלמי האותנטי - שחום, חריף ומתובל בפלפל שחור גרוס." 
  },
  { 
    icon: "utensils", 
    title: "כבד קצוץ מסורתי", 
    desc: "כבד קצוץ במרקם קטיפתי עם ריבת בצל ושפע של אהבה יהודית." 
  },
  { 
    icon: "scale", 
    title: "דו-קרב המאפיות", 
    desc: "מבחן טעימות עיוור בין ענקיות החלה: מאפיית הצבי מול ויז'ניץ. מי תנצח?" 
  },
  { 
    icon: "cookie", 
    title: "בלינצ'ס אגדיים", 
    desc: "קינוח חם ומתוק של בלינצ'ס גבינה עשירים שסוגרים את הפינה." 
  }
];

export const faqs = [
  { 
    q: "האם ניתן לתאם סיור פרטי?", 
    a: "בוודאי! אני מציע סיורים מותאמים אישית לקבוצות של 10 משתתפים ומעלה בכל ימות השבוע בתיאום מראש." 
  },
  { 
    q: "מה עושים בבני ברק בחמישי בערב?", 
    a: "חמישי בערב בבני ברק הוא 'ליל שישי' - זמן הקסם שבו העיר מתעוררת לחיים עם הכנות לשבת." 
  },
  { 
    q: "כמה זמן נמשך הסיור ואיפה נפגשים?", 
    a: "הסיור נמשך בין שעתיים וחצי לשלוש שעות. פרטי המפגש המדויקים יישלחו אליכם לאחר סגירת ההרשמה." 
  },
  { 
    q: "איך מתלבשים לסיור?", 
    a: "חשוב להגיע בלבוש מכבד וצנוע כדי שנוכל להיכנס למקומות הכי סודיים." 
  },
  { 
    q: "איפה קונים אוכל מוכן לשבת?", 
    a: "במהלך הסיור נבקר במקומות הטובים ביותר לקניית אוכל מוכן ותקבלו ממני המלצות חמות." 
  }
];

export const mediaLinks = [
  {
    name: "מאקו",
    icon: "utensils",
    colorClass: "media-mako", // Uses Tailwind color from config
    url: "https://www.mako.co.il/food-restaurants/restaurant-news/Article-f69eb4533183e81027.htm",
    buttonText: "לקריאת הכתבה"
  },
  {
    name: "כאן 11",
    icon: "tv",
    colorClass: "media-kan", // Uses Tailwind color from config
    url: "https://www.kan.org.il/content/kan/kan-11/p-864341/s1/864346/",
    buttonText: "לצפייה בפרק"
  },
  {
    name: "רשת 13",
    icon: "tv",
    colorClass: "media-reshet", // Uses Tailwind color from config
    url: "https://13tv.co.il/allshows/series/696/",
    buttonText: "לצפייה בסדרה"
  }
];

export const whatsappNumber = "972506724312";

// Nine user-provided KEEP clips. Empty groups produce no public section.
// See docs/TOUR_VIDEOS.md; additional assets arrive separately.
export const tourVideos = [
  { id: 'hilik-bnei-brak', items: [
    {
      id: 'MxVd7LEjkJyq1eXMAuuT',
      src: 'https://storage.googleapis.com/hilik-site-tour-videos/hilik-bnei-brak/bneibrak-zoo-720p.mp4',
      poster: '/media/posters/bneibrak-zoo-720p.webp',
      title: { he: 'סיור בבני ברק + מעדניית שאבעס', en: 'Bnei Brak tour + Shabes deli' },
      durationSec: 90,
    },
    {
      id: 'ZUh34zcXVyiUPmbWPWAR',
      src: 'https://storage.googleapis.com/hilik-site-tour-videos/hilik-bnei-brak/bneibrak-150s.mp4',
      poster: '/media/posters/bneibrak-150s.webp',
      title: { he: 'קידוש של שבת עם וויסקי ודגים', en: 'Shabbat kiddush with whiskey and fish' },
      durationSec: 150,
    },
    {
      id: 'XEN797qZSr8SCo5xshoP',
      src: 'https://storage.googleapis.com/hilik-site-tour-videos/hilik-bnei-brak/bneibrak-120s.mp4',
      poster: '/media/posters/bneibrak-120s.webp',
      title: { he: 'קידוש עם וויסקי ודגים בבני ברק', en: 'Kiddush with whiskey and fish in Bnei Brak' },
      durationSec: 120,
    },
    {
      id: 'חלק-49',
      src: 'https://storage.googleapis.com/hilik-site-tour-videos/hilik-bnei-brak/part-49-hilik-invite-tour.mp4',
      poster: '/media/posters/part-49-hilik-invite-tour.webp',
      title: { he: 'חיליק מזמין לסיור', en: 'Hilik invites to the tour' },
      durationSec: 44,
    },
    {
      id: 'חלק-50',
      src: 'https://storage.googleapis.com/hilik-site-tour-videos/hilik-bnei-brak/part-50-tourists-to-bnei-brak.mp4',
      poster: '/media/posters/part-50-tourists-to-bnei-brak.webp',
      title: { he: 'תיירים לקראת בני ברק', en: 'Tourists heading to Bnei Brak' },
      durationSec: 46,
    },
    {
      id: 'חלק-51',
      src: 'https://storage.googleapis.com/hilik-site-tour-videos/hilik-bnei-brak/part-51-hilik-street-tourists.mp4',
      poster: '/media/posters/part-51-hilik-street-tourists.webp',
      title: { he: 'חיליק ברחוב עם תיירים', en: 'Hilik on the street with tourists' },
      durationSec: 44,
    },
    {
      id: 'חלק-58',
      src: 'https://storage.googleapis.com/hilik-site-tour-videos/hilik-bnei-brak/part-58-food-yapchik-tour.mp4',
      poster: '/media/posters/part-58-food-yapchik-tour.webp',
      title: { he: 'אוכל וסיור — יפצ׳יק', en: 'Food tour — yapchik' },
      durationSec: 46,
    },
    {
      id: 'חלק-59',
      src: 'https://storage.googleapis.com/hilik-site-tour-videos/hilik-bnei-brak/part-59-hilik-gefilte-tasting.mp4',
      poster: '/media/posters/part-59-hilik-gefilte-tasting.webp',
      title: { he: 'גפילטע וחריין עם חיליק', en: 'Gefilte fish and chrein with Hilik' },
      durationSec: 44,
    },
    {
      id: 'חלק-60',
      src: 'https://storage.googleapis.com/hilik-site-tour-videos/hilik-bnei-brak/part-60-zac-samantha-tour-react.mp4',
      poster: '/media/posters/part-60-zac-samantha-tour-react.webp',
      title: { he: 'תגובת זאק וסמנתה לסיור', en: 'Zac and Samantha react to the tour' },
      durationSec: 46,
    },
  ] },
  { id: 'donkey-bnei-brak', items: [] },
];

export const siteMetadata = {
  title: "חיליק רוזנברג | סיורים בבני ברק - מסע קולינרי ותרבותי בלב העיר",
  description: "אני מזמין אתכם לסיור קולינרי בבני ברק בכל חמישי בערב. ראו אותי במאקו, כאן 11, ורשת 13. הצטרפו למסע מרתק בלב העיר החרדית הליטאית.",
  author: "חיליק רוזנברג"
};
