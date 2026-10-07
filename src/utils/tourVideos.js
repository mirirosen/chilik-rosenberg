// Vite serves public/tour-videos/... at /tour-videos/....
export function tourVideoSource(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const source = value.trim().replace(/^\/?public\/tour-videos\//, '/tour-videos/').replace(/^tour-videos\//, '/tour-videos/');
  try {
    const url = new URL(source, 'https://local.invalid');
    if (source.startsWith('/tour-videos/')) {
      return url.pathname.startsWith('/tour-videos/') ? `${url.pathname}${url.search}${url.hash}` : null;
    }
    return /^https:\/\//i.test(source) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function populatedTourVideoGroups(groups = []) {
  if (!Array.isArray(groups)) return [];
  return groups.filter(group => group?.id && Array.isArray(group.items)).map(group => ({
    ...group,
    items: group.items.filter(item => item?.id && tourVideoSource(item.src)
      && typeof item.title?.he === 'string' && item.title.he.trim()
      && typeof item.title?.en === 'string' && item.title.en.trim()).map(item => ({
        ...item,
        src: tourVideoSource(item.src),
        poster: tourVideoSource(item.poster) || undefined,
        aspectRatio: ['16/9', '9/16', '1/1'].includes(item.aspectRatio) ? item.aspectRatio : '16/9',
      })),
  })).filter(group => group.items.length > 0);
}
