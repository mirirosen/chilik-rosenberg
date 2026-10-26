// User-supplied links and verified additions, 2026-10-08. Counts of followers
// and views are deliberately not stored as they change over time.
const groups = {
  articles: [
    ['maariv-cholent', 'מעריב', 'Maariv', 'הקרע מגיע עד הצ׳ולנט', 'The divide reaches the cholent', 'https://www.maariv.co.il/news/israel/article-1366350', '2026-09-15'],
    ['mako-tour', 'מאקו', 'Mako', 'סיור ליל שישי עם חיליק', 'Thursday-night food tour with Hilik', 'https://www.mako.co.il/food-restaurants/restaurant-news/Article-f69eb4533183e81027.htm', '2024-03-14'],
    ['yedioth-interview', 'ידיעות אחרונות', 'Yedioth Ahronoth', 'ראיון משותף עם אורטל בן דיין', 'Joint interview with Ortal Ben Dayan', 'https://www.ynet.co.il/yedioth/article/yokra14357576', '2025-05-09'],
    ['jdn-interview', 'JDN', 'JDN', 'ראיון על משבר הגיוס', 'Interview about the conscription debate', 'https://www.jdn.co.il/blog/2388488/', '2025-04-16'],
    ['bb-now-tour', 'בני ברק עכשיו', 'Bnei Brak Now', 'מפגינים שיבשו את הסיור ברחוב נחמיה', 'Protesters disrupted the tour on Nehemiah Street', 'https://bb-n.co.il/my-neighborhood/98411/', '2026-07-03'],
    ['kikar-quote', 'כיכר השבת', 'Kikar HaShabbat', 'אזכור חיליק בכתבה על הסקרנות בבני ברק', 'Hilik quoted in a report about curiosity in Bnei Brak', 'https://www.kikar.co.il/kikarfm/bnei-brak-curiosity-phenomenon', '2026-03-16'],
    ['walla-opposites', 'וואלה תרבות', 'Walla Culture', 'ביקורת על הסדרה ״הפוכים״', 'Review of the series “Opposites”', 'https://e.walla.co.il/item/3743669'],
    ['ynet-opposites', 'ynet', 'ynet', 'ביקורת על הסדרה ״הפוכים״', 'Review of the series “Opposites”', 'https://www.ynet.co.il/entertainment/article/bks4h8q1xl'],
    ['yedioth-opposites', 'ידיעות אחרונות', 'Yedioth Ahronoth', 'ביקורת על הסדרה ״הפוכים״', 'Review of the series “Opposites”', 'https://www.ynet.co.il/yedioth/article/yokra14340331'],
    ['hayom-opposites', 'ישראל היום', 'Israel Hayom', 'ביקורת על הסדרה ״הפוכים״', 'Review of the series “Opposites”', 'https://www.israelhayom.co.il/culture/tv/article/17785422'],
    ['morning-interview', 'רשת 13 · העולם הבוקר', 'Reshet 13 · The Morning Show', 'ראיון באולפן על המפגש ב״הפוכים״', 'Studio interview about “Opposites”', 'https://13tv.co.il/item/shows/opposites/season-01/articles/hyov2-904549204/', '2025-04-20', 'watch'],
    ['nos-profile', 'NOS · Nieuwsuur', 'NOS · Nieuwsuur', 'כתבת פרופיל בתקשורת ההולנדית', 'Profile in the Dutch news media', 'https://nos.nl/nieuwsuur/artikel/2628896-ultraorthodox-verzet-tegen-dienstplicht-belangrijk-verkiezingsthema-in-israel', '2026-08-30'],
    ['yuvi-yam', 'יובי ים', 'Yuvi Yam', 'קולינריה בבני ברק — בלוג אוכל', 'Bnei Brak culinary tour — food blog', 'https://www.yuviyam.com/post/bnei-brak', '2025-03-19'],
    ['hayom-challah', 'ישראל היום', 'Israel Hayom', 'פסטיבל החלה וסיור בני ברק עם חיליק', 'Challah festival and Hilik’s Bnei Brak tour', 'https://www.israelhayom.co.il/food/food-news/article/19225419', '2025-11-12'],
    ['walla-challah', 'וואלה אוכל', 'Walla Food', 'מדריך פסטיבל החלה — כולל הסיור של חיליק', 'Challah festival guide — including Hilik’s tour', 'https://food.walla.co.il/item/3793639'],
  ],
  programs: [
    ['opposites-series', 'רשת 13', 'Reshet 13', '״הפוכים״ — עם אורטל בן דיין', '“Opposites” — with Ortal Ben Dayan', 'https://13tv.co.il/shows/opposites/season-01/', null, 'watch'],
    ['donkey-tour', 'דונקי · YouTube', 'Donkey · YouTube', 'סיור אוכל בבני ברק', 'Bnei Brak food tour', 'https://www.youtube.com/watch?v=Ze4R4qmUBNo', null, 'watch'],
    ['provokatza-8', 'פרובוקצה · YouTube', 'Provokatza · YouTube', 'פרובוקצה — פרק 8', 'Provokatza — episode 8', 'https://www.youtube.com/watch?v=O45SRhgGgOc', null, 'watch'],
    ['raz-84', 'רז זאובר', 'Raz Sauber', 'הפודקאסט של רז זאובר — פרק 84', 'Raz Sauber’s podcast — episode 84', 'https://www.youtube.com/watch?v=lVezQVPE9A4', null, 'watch'],
    ['hani-podcast', 'חני שטיגליץ · YouTube', 'Hani Shtiglitz · YouTube', 'הפודקאסט של חני שטיגליץ', 'Hani Shtiglitz’s podcast', 'https://www.youtube.com/watch?v=BJybujLoOY8', null, 'watch'],
    ['unity-now', 'אחדות עכשיו · YouTube', 'Unity Now · YouTube', 'אחדות עכשיו', 'Unity Now', 'https://www.youtube.com/watch?v=iRUPTgevJSI', null, 'watch'],
    ['coffee-podcast', 'Spotify', 'Spotify', 'קפה הפוך — הפודקאסט של חיליק', 'Café Hafuch — Hilik’s podcast', 'https://open.spotify.com/show/7hAcCGg3RriHykzPMGA9hH', null, 'listen'],
    ['hazon-ish-live', 'YouTube', 'YouTube', 'קטע שידור חי מרחוב חזון איש', 'Live broadcast clip from Hazon Ish Street', 'https://www.youtube.com/watch?v=_YhNsub1tjc', null, 'watch'],
    ['kan-housing', 'כאן 11', 'Kan 11', 'מתחת לבלטות — הדיור החרדי', 'Under the Tiles — Haredi housing', 'https://www.kan.org.il/content/kan/kan-11/p-864341/s1/864346/', null, 'watch'],
    ['kan-moreshet', 'כאן מורשת · מנדי ביתאן', 'Kan Moreshet · Mendy Beitan', 'שיחה על הסיורים הקולינריים בבני ברק', 'Conversation about Bnei Brak culinary tours', 'https://omny.fm/shows/kan-moreshet/ec7aca2b-a94d-4e82-aa73-b1bd00b3bcab', null, 'listen'],
    ['reshet-feminists-clip', 'רשת 13 · הפוכים', 'Reshet 13 · Opposites', 'קטע מהמפגש עם נשים פמיניסטיות', 'Clip from the meeting with feminist women', 'https://13tv.co.il/item/shows/opposites/season-01/articles/ib7sa-904576640/', '2025-05-12', 'watch'],
    ['reshet-enlistment-clip', 'רשת 13 · הפוכים', 'Reshet 13 · Opposites', 'קטע מהביקור עם אורטל בלשכת הגיוס', 'Clip from the enlistment-office visit with Ortal', 'https://13tv.co.il/item/shows/opposites/season-01/all-clips/ngu04-904573811/', '2025-05-10', 'watch'],
  ],
  online: [
    ['facebook', 'Facebook', 'Facebook', 'חיליק בפייסבוק — סרטוני Reels', 'Hilik on Facebook — Reels', 'https://www.facebook.com/hylyq.rwznbrg/reels/', null, 'visit'],
    ['youtube-channel', 'YouTube', 'YouTube', 'ערוץ היוטיוב של חיליק', 'Hilik’s YouTube channel', 'https://www.youtube.com/channel/UCUZDnNWFEa6GsNW9NJCSMxg', null, 'visit'],
    ['instagram', 'Instagram', 'Instagram', 'חיליק באינסטגרם · @hilikrozenberg', 'Hilik on Instagram · @hilikrozenberg', 'https://www.instagram.com/hilikrozenberg/', null, 'visit'],
    ['x', 'X', 'X', 'חיליק ב־X · @HilikRozenberg', 'Hilik on X · @HilikRozenberg', 'https://x.com/HilikRozenberg', null, 'visit'],
    ['linkedin', 'LinkedIn', 'LinkedIn', 'הפרופיל של חיליק בלינקדאין', 'Hilik’s LinkedIn profile', 'https://www.linkedin.com/in/hilik-rosenberg-424250256', null, 'visit'],
    ['tiktok-magazine', 'TikTok · magazine_food', 'TikTok · magazine_food', 'סרטון מהסיור של magazine_food', 'Tour video by magazine_food', 'https://www.tiktok.com/@magazine_food/video/7370656118009253138', null, 'watch'],
    ['tiktok-eat-drink', 'TikTok · eat.drink.fly.repeat', 'TikTok · eat.drink.fly.repeat', 'סרטון מהסיור של eat.drink.fly.repeat', 'Tour video by eat.drink.fly.repeat', 'https://www.tiktok.com/@eat.drink.fly.repeat/video/7440874625111821586', null, 'watch'],
    ['tour-site', 'סיורי חיליק', 'Hilik Tours', 'אתר הסיורים הרשמי', 'The official tour website', 'https://www.chilik-tours.com/', null, 'visit'],
    ['gula-show', 'גולה', 'Gula', '״חרדי במופע חושף״ — המופע בגולה', '“A Haredi Revealing Show” — at Gula', 'https://gula.org.il/87356', null, 'visit'],
    ['foodish-tour', 'FOODISH · מוזיאון אנו', 'FOODISH · ANU Museum', 'סיור החלות בבני ברק — אירוע שהסתיים', 'Bnei Brak challah tour — past event', 'https://foodish.anumuseum.org.il/en/event/bnei-brak-challah-bakery-tour/', '2025-11-13', 'visit'],
    ['funzing', 'Funzing', 'Funzing', 'עמוד המארח של חיליק', 'Hilik’s host profile', 'https://il.funzing.com/host/436734', null, 'visit'],
  ],
};
const featured = new Set(['maariv-cholent', 'mako-tour', 'nos-profile', 'opposites-series', 'donkey-tour', 'kan-moreshet']);
export const mediaCategories = Object.keys(groups);
export const mediaReferences = Object.entries(groups).flatMap(([category, rows]) => rows.map(([id, heOutlet, enOutlet, heTitle, enTitle, url, date, action]) => ({
  id, category, outlet: { he: heOutlet, en: enOutlet }, title: { he: heTitle, en: enTitle }, url, date, action: action || 'read', featured: featured.has(id),
})));
