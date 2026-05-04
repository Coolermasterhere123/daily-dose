import ChannelPage from '@/components/ChannelPage';

const CHANNEL_ID = 'UCdC0An4ZPNr_YiFiYoVbwaw';

const CHANNEL_INFO = {
  author: 'Daily Dose Of Internet',
  description: 'Welcome to your Daily Dose of Internet where I search for the best trending videos, or videos people have forgotten about, and put them all in one video.',
  subCount: 18400000,
  authorThumbnails: [{
    url: 'https://yt3.ggpht.com/ytc/AIdro_lTbCn6hS4i-R3Qpb3lEpGlAHMKlWPIKJhLBxhE=s800-c-k-c0x00ffffff-no-rj',
    width: 800,
  }],
};

function parseRSS(xml) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>'));
      return m ? m[1].trim() : null;
    };
    const getAttr = (tag, attr) => {
      const m = block.match(new RegExp('<' + tag + '[^>]*' + attr + '="([^"]*)"[^>]*>'));
      return m ? m[1] : null;
    };
    const videoId = get('yt:videoId');
    const rawTitle = get('title') || '';
    const title = rawTitle.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"');
    const published = get('published');
    const views = getAttr('media:statistics', 'views');
    if (videoId && title) {
      entries.push({
        videoId, title,
        published: published ? Math.floor(new Date(published).getTime() / 1000) : null,
        viewCount: views ? parseInt(views, 10) : null,
        videoThumbnails: [
          { url: 'https://i.ytimg.com/vi/' + videoId + '/maxresdefault.jpg', width: 1280 },
          { url: 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg', width: 480 },
        ],
      });
    }
  }
  return entries;
}

async function fetchRSS(url) {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 }, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    return parseRSS(await res.text());
  } catch { return []; }
}

async function getChannelData() {
  const longFormId = 'UULF' + CHANNEL_ID.slice(2); // skips Shorts → older videos
  const [all, longForm] = await Promise.all([
    fetchRSS('https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID),
    fetchRSS('https://www.youtube.com/feeds/videos.xml?playlist_id=' + longFormId),
  ]);
  const seen = new Set();
  const merged = [];
  for (const v of [...all, ...longForm]) {
    if (!seen.has(v.videoId)) { seen.add(v.videoId); merged.push(v); }
  }
  merged.sort((a, b) => (b.published || 0) - (a.published || 0));
  return { channel: CHANNEL_INFO, videos: merged };
}

export default async function Home() {
  const { channel, videos } = await getChannelData();
  return <main><ChannelPage channel={channel} videos={videos} channelId={CHANNEL_ID} /></main>;
}
