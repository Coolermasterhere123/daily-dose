'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './ChannelPage.module.css';

const PAGE_SIZE = 12;


function formatViews(n) {
  if (!n) return null;
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function formatSubs(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function formatDuration(secs) {
  if (!secs) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function timeAgo(published) {
  if (!published) return '';
  const diff = Date.now() / 1000 - published;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

function getBestThumb(thumbnails) {
  if (!thumbnails?.length) return null;
  return [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url;
}

function getAvatarUrl(authorThumbnails) {
  if (!authorThumbnails?.length) return null;
  return [...authorThumbnails].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url;
}

// ── Fullscreen Video Player ──────────────────────────────────────────────────
function VideoPlayer({ video, onClose, tvIp, channelId }) {
  const iframeRef = useRef(null);

  // Lock body scroll while player is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Send to SmartTube TV if paired
  useEffect(() => {
    if (tvIp) {
      fetch(`http://${tvIp}:7788/open?video_id=${video.videoId}`, {
        method: 'GET', mode: 'no-cors',
        signal: AbortSignal.timeout(3000),
      }).catch(() => {});
    }
  }, [video.videoId, tvIp]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <div className={styles.playerOverlay} onClick={onClose}>
      <div className={styles.playerBox} onClick={e => e.stopPropagation()}>
        <div className={styles.playerHeader}>
          <p className={styles.playerTitle}>{video.title}</p>
          <button className={styles.playerClose} onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className={styles.playerFrame}>
          <iframe
            ref={iframeRef}
            src={embedUrl}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className={styles.playerIframe}
            title={video.title}
          />
        </div>
        <div className={styles.playerFooter}>
          <a
            href={`https://www.youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.playerYtLink}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/></svg>
            Open in YouTube
          </a>
          {tvIp && (
            <span className={styles.playerTvSent}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>
              Sent to TV
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PWA Install Banner ───────────────────────────────────────────────────────
function InstallBanner({ onDismiss }) {
  return (
    <div className={styles.installBanner}>
      <div className={styles.installIcon}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
      </div>
      <div className={styles.installText}>
        <strong>Install App</strong>
        <span>Add to home screen for the best experience</span>
      </div>
      <div className={styles.installActions}>
        <button className={styles.installBtn} id="pwa-install-btn">Install</button>
        <button className={styles.installDismiss} onClick={onDismiss}>✕</button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ChannelPage({ channel, videos, channelId }) {
  const [activeTab, setActiveTab] = useState('videos');
  const [page, setPage] = useState(1);
  const [showInstall, setShowInstall] = useState(false);
  const [tvIp, setTvIp] = useState('');
  const [showTvSetup, setShowTvSetup] = useState(false);
  const [tvIpInput, setTvIpInput] = useState('');
  const [activeVideo, setActiveVideo] = useState(null);
  const deferredPrompt = useRef(null);

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); deferredPrompt.current = e; setShowInstall(true); };
    window.addEventListener('beforeinstallprompt', handler);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !isStandalone) setShowInstall(true);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const btn = document.getElementById('pwa-install-btn');
    if (!btn) return;
    const handleInstall = async () => {
      if (deferredPrompt.current) {
        deferredPrompt.current.prompt();
        const { outcome } = await deferredPrompt.current.userChoice;
        deferredPrompt.current = null;
        if (outcome === 'accepted') setShowInstall(false);
      }
    };
    btn.addEventListener('click', handleInstall);
    return () => btn.removeEventListener('click', handleInstall);
  }, [showInstall]);

  const avatar = getAvatarUrl(channel?.authorThumbnails);
  const totalPages = Math.ceil(videos.length / PAGE_SIZE);
  const pagedVideos = videos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openVideo(video) {
    setActiveVideo(video);
  }

  return (
    <div className={styles.root}>
      {/* Fullscreen player */}
      {activeVideo && (
        <VideoPlayer
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
          tvIp={tvIp}
          channelId={channelId}
          
        />
      )}

      {showInstall && <InstallBanner onDismiss={() => setShowInstall(false)} />}

      {/* TV setup modal */}
      {showTvSetup && (
        <div className={styles.modal} onClick={() => setShowTvSetup(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>
              Connect SmartTube TV
            </h3>
            <p className={styles.modalDesc}>
              Enter your TV&apos;s local IP. SmartTube must be open on the TV. Find the IP in SmartTube → Settings → About → Device info.
            </p>
            <div className={styles.modalInputRow}>
              <input
                className={styles.modalInput}
                type="text"
                placeholder="192.168.1.x"
                value={tvIpInput}
                onChange={e => setTvIpInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && tvIpInput.trim()) {
                    setTvIp(tvIpInput.trim()); setShowTvSetup(false);
                  }
                }}
              />
              <button className={styles.modalSave} onClick={() => {
                if (tvIpInput.trim()) { setTvIp(tvIpInput.trim()); setShowTvSetup(false); }
              }}>Save</button>
            </div>
            {tvIp && (
              <button className={styles.modalClear} onClick={() => { setTvIp(''); setTvIpInput(''); setShowTvSetup(false); }}>
                Disconnect TV
              </button>
            )}
            <p className={styles.modalNote}>Without a TV IP, videos play inline in the app.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.wordmark}>DAILY<span>DOSE</span></div>
          <nav className={styles.headerNav}>
            <button
              className={`${styles.tvBtn} ${tvIp ? styles.tvBtnActive : ''}`}
              onClick={() => setShowTvSetup(true)}
              title={tvIp ? `Sending to TV: ${tvIp}` : 'Connect SmartTube TV'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>
              {tvIp ? 'TV Connected' : 'Connect TV'}
            </button>
            <a href={`https://youtube.com/channel/${channelId}`} target="_blank" rel="noopener noreferrer" className={styles.invLink}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/></svg>
              YouTube
            </a>
          </nav>
        </div>
      </header>

      {/* Banner */}
      <div className={styles.bannerWrap}>
        <div className={styles.bannerFallback} />
        <div className={styles.bannerOverlay} />
      </div>

      {/* Channel info */}
      <div className={styles.channelInfoWrap}>
        <div className={styles.channelInfoInner}>
          <div className={styles.avatarWrap}>
            {avatar
              ? <img src={avatar} alt={channel.author} className={styles.avatar} />
              : <div className={styles.avatarFallback}>{channel.author?.[0] || 'D'}</div>
            }
            <div className={styles.avatarRing} />
          </div>
          <div className={styles.channelMeta}>
            <h1 className={styles.channelName}>{channel.author || 'Daily Dose Of Internet'}</h1>
            <div className={styles.channelStats}>
              <div className={styles.stat}>
                <span className={styles.statVal}>{formatSubs(channel.subCount)}</span>
                <span className={styles.statLabel}>subscribers</span>
              </div>
            </div>
            {channel.description && (
              <p className={styles.channelDesc}>{channel.description.slice(0, 200)}{channel.description.length > 200 ? '…' : ''}</p>
            )}
          </div>
        </div>

        <div className={styles.tabs}>
          {['videos', 'about'].map(tab => (
            <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`} onClick={() => setActiveTab(tab)}>
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {activeTab === 'videos' && (
          <>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>Latest Videos</span>
              <span className={styles.videoCount}>
                {videos.length} videos{totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}
              </span>
            </div>

            {videos.length === 0 ? (
              <div className={styles.empty}>No videos could be loaded right now.</div>
            ) : (
              <>
                <div className={styles.grid}>
                  {pagedVideos.map((v, i) => {
                    const thumb = getBestThumb(v.videoThumbnails);
                    const dur = formatDuration(v.lengthSeconds);
                    const views = formatViews(v.viewCount);
                    return (
                      <div
                        key={v.videoId}
                        className={styles.card}
                        style={{ animationDelay: `${i * 0.04}s` }}
                        onClick={() => openVideo(v)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && openVideo(v)}
                      >
                        <div className={styles.thumbWrap}>
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={v.title}
                              className={styles.thumb}
                              loading="lazy"
                              onError={e => {
                                if (e.target.src.includes('maxresdefault')) {
                                  e.target.src = `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
                                }
                              }}
                            />
                          ) : (
                            <div className={styles.thumbFallback}>
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            </div>
                          )}
                          {dur && <span className={styles.duration}>{dur}</span>}
                          <div className={styles.playOverlay}>
                            <div className={styles.playBtn}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            </div>
                          </div>
                        </div>
                        <div className={styles.cardBody}>
                          <h3 className={styles.videoTitle}>{v.title}</h3>
                          <div className={styles.videoMeta}>
                            {views && <span>{views} views</span>}
                            {v.published && <><span className={styles.dot}>·</span><span>{timeAgo(v.published)}</span></>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button className={styles.pageBtn} disabled={page === 1}
                      onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                      ← Prev
                    </button>
                    <div className={styles.pageNums}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                        <button key={n}
                          className={`${styles.pageNum} ${n === page ? styles.pageNumActive : ''}`}
                          onClick={() => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <button className={styles.pageBtn} disabled={page === totalPages}
                      onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'about' && (
          <div className={styles.about}>
            <div className={styles.aboutCard}>
              <h2 className={styles.aboutTitle}>About</h2>
              <p className={styles.aboutDesc}>{channel.description || 'No description available.'}</p>
            </div>
            <div className={styles.aboutCard}>
              <h2 className={styles.aboutTitle}>Video Playback</h2>
              <p className={styles.aboutDesc}>Videos play inline inside the app via Invidious embed. If you have a SmartTube TV paired, they also send to the TV automatically.</p>
            </div>
            <div className={styles.aboutCard}>
              <h2 className={styles.aboutTitle}>Links</h2>
              <div className={styles.links}>
                <a href={`https://youtube.com/channel/${channelId}`} target="_blank" rel="noopener noreferrer" className={styles.extLink}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/></svg>
                  YouTube Channel
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <span>Videos via YouTube · {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
