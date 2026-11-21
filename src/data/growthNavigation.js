export const growthPaths = {
  choosing: '/guides/culinary-tour.html',
  culture: '/guides/bnei-brak-culture.html',
  questions: '/guides/questions-about-haredim.html',
  lectures: '/lectures/haredi-society.html',
};

export function growthGuideLinks(language = 'he') {
  const english = String(language).startsWith('en');
  const labels = english
    ? ['Choosing a culinary tour (Hebrew)', 'Bnei Brak culture guide (Hebrew)', 'Lectures with Hilik (Hebrew)', 'Questions about Jewish and Haredi life (Hebrew)']
    : ['איך בוחרים סיור קולינרי?', 'להכיר את בני ברק והחיים החרדיים', 'הרצאות על החברה החרדית', 'שאלות על חרדים, יהדות, חיליק ואוכל'];
  return ['choosing', 'culture', 'lectures', 'questions'].map((id, index) => ({ href: growthPaths[id], label: labels[index] }));
}
