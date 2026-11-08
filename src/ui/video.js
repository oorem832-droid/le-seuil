// LE SEUIL — protected video player for lessons.
// YouTube (unlisted) videos play inside the page with LE SEUIL's own controls. A transparent layer covers the
// YouTube frame so its right-click menu, title and logo links cannot be used, and nothing sends people to YouTube.
// MP4 files get the browser player without download, picture-in-picture or right-click menu.
// This discourages copying; it cannot make a video secret (the browser always receives it).
import { esc, icon } from "./util.js";

export function youtubeId(url){
  const m = String(url || "").match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const ic = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
  vol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
};

export function playerHTML(url, title, captions, autoplay){
  const yt = youtubeId(url);
  if (yt) return `<div class="vid vid-yt" data-yt="${yt}"${autoplay ? " data-autoplay=\"1\"" : ""}>
    <div class="yt-frame"></div>
    <div class="yt-shield" data-yt-toggle role="presentation"><span class="yt-big">${ic.play}</span></div>
    <div class="yt-bar">
      <button type="button" class="yt-btn" data-yt-toggle aria-label="Lecture">${ic.play}</button>
      <input class="yt-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Position dans la vidéo">
      <span class="yt-time">0:00</span>
      <button type="button" class="yt-btn yt-cc" data-yt-cc aria-pressed="false" aria-label="Sous-titres en français"><span aria-hidden="true">CC</span></button>
      <button type="button" class="yt-btn" data-yt-mute aria-label="Couper le son">${ic.vol}</button>
      <button type="button" class="yt-btn" data-yt-full aria-label="Plein écran">${ic.full}</button>
    </div></div>`;
  return `<video class="vid" controls preload="metadata" controlslist="nodownload noremoteplayback noplaybackrate" disablepictureinpicture disableremoteplayback oncontextmenu="return false" src="${esc(url)}">${captions ? `<track kind="captions" srclang="fr" label="Français" src="${esc(captions)}" default>` : ""}</video>`;
}

/* ---------- YouTube IFrame API ---------- */
let apiPromise = null;
function loadApi(){
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise(res => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); res(window.YT); };
    const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; s.async = true;
    document.head.appendChild(s);
  });
  return apiPromise;
}
const fmt = t => { t = Math.max(0, Math.floor(t || 0)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

async function setup(box){
  box.dataset.ready = "1";
  const YT = await loadApi();
  if (!box.isConnected) return;
  const holder = box.querySelector(".yt-frame");
  const seek = box.querySelector(".yt-seek"), time = box.querySelector(".yt-time");
  const toggles = box.querySelectorAll("[data-yt-toggle]"), playBtn = box.querySelector(".yt-btn[data-yt-toggle]");
  const muteBtn = box.querySelector("[data-yt-mute]"), fullBtn = box.querySelector("[data-yt-full]"), ccBtn = box.querySelector("[data-yt-cc]");
  let ccOn = false;
  let timer = null, dragging = false;
  const player = new YT.Player(holder, {
    host: "https://www.youtube-nocookie.com",
    videoId: box.dataset.yt,
    playerVars: { controls: 0, disablekb: 1, fs: 0, rel: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, cc_load_policy: 0, hl: document.documentElement.lang || "fr", origin: location.origin },
    events: {
      onReady: () => { if (box.dataset.autoplay) player.playVideo(); },
      onStateChange: e => {
        const playing = e.data === YT.PlayerState.PLAYING;
        box.classList.toggle("playing", playing);
        playBtn.innerHTML = playing ? ic.pause : ic.play;
        playBtn.setAttribute("aria-label", playing ? "Pause" : "Lecture");
        clearInterval(timer);
        if (playing) timer = setInterval(tick, 400);
        if (e.data === YT.PlayerState.ENDED) { player.seekTo(0, true); player.pauseVideo(); box.classList.remove("started"); }
        if (playing) box.classList.add("started");
        tick();
      }
    }
  });
  function tick(){
    if (!box.isConnected) { clearInterval(timer); try { player.destroy(); } catch(e) {} return; }
    const d = player.getDuration?.() || 0, t = player.getCurrentTime?.() || 0;
    if (!dragging && d) seek.value = Math.round(t / d * 1000);
    time.textContent = `${fmt(t)} / ${fmt(d)}`;
  }
  toggles.forEach(el => el.addEventListener("click", e => { e.preventDefault(); const st = player.getPlayerState?.(); st === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo(); }));
  seek.addEventListener("input", () => { dragging = true; const d = player.getDuration?.() || 0; time.textContent = `${fmt(seek.value / 1000 * d)} / ${fmt(d)}`; });
  seek.addEventListener("change", () => { const d = player.getDuration?.() || 0; player.seekTo(seek.value / 1000 * d, true); dragging = false; });
  muteBtn.addEventListener("click", () => { if (player.isMuted()) { player.unMute(); muteBtn.innerHTML = ic.vol; muteBtn.setAttribute("aria-label", "Couper le son"); } else { player.mute(); muteBtn.innerHTML = ic.mute; muteBtn.setAttribute("aria-label", "Activer le son"); } });
  ccBtn.addEventListener("click", () => {
    ccOn = !ccOn;
    try {
      if (ccOn) { player.loadModule("captions"); player.setOption("captions", "track", { languageCode: "fr" }); }
      else player.unloadModule("captions");
    } catch(e) {}
    ccBtn.setAttribute("aria-pressed", String(ccOn)); ccBtn.classList.toggle("on", ccOn);
  });
  fullBtn.addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen?.(); else (box.requestFullscreen || box.webkitRequestFullscreen)?.call(box); });
}

// Block the right-click menu and drag on every lesson video, and start players as they appear.
document.addEventListener("contextmenu", e => { if (e.target.closest?.(".vid")) e.preventDefault(); }, true);
document.addEventListener("dragstart", e => { if (e.target.closest?.(".vid")) e.preventDefault(); }, true);
new MutationObserver(() => document.querySelectorAll(".vid-yt:not([data-ready])").forEach(setup))
  .observe(document.documentElement, { childList: true, subtree: true });
