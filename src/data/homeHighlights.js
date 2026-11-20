import { populatedTourVideoGroups } from '../utils/tourVideos';

const videoIds = ['MxVd7LEjkJyq1eXMAuuT', 'CUYEMWo96u8', '6i1rv_znrbk'];
const sourceIds = ['mako-tour', 'kan-moreshet', 'donkey-tour'];

export function homeVideoSelection(groups) {
  const seen = new Set();
  const uniqueGroups = populatedTourVideoGroups(groups).map(group => ({
    ...group,
    items: group.items.filter(video => {
      if (seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    }),
  })).filter(group => group.items.length);
  const all = uniqueGroups.flatMap(group => group.items);
  const featured = [];
  const selected = new Set();
  for (const id of [...videoIds, ...all.map(video => video.id)]) {
    const video = all.find(item => item.id === id);
    if (!video || selected.has(id)) continue;
    selected.add(id);
    featured.push(video);
    if (featured.length === 3) break;
  }
  const remainingGroups = uniqueGroups.map(group => ({
    ...group, items: group.items.filter(video => !selected.has(video.id)),
  })).filter(group => group.items.length);
  return { featured, remainingGroups, total: all.length };
}

export function mediaHighlightSelection(references) {
  return sourceIds.map(id => references.find(item => item.id === id)).filter(item => {
    if (!item?.url) return false;
    try {
      const url = new URL(item.url);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch { return false; }
  });
}
