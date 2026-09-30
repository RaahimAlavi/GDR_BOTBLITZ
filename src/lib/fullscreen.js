let requestGeneration = 0;
let ownedFullscreen = false;
export async function enterGameFullscreen() {
  const generation = ++requestGeneration;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      ownedFullscreen = true;
    }
    if (generation !== requestGeneration) {
      if (ownedFullscreen && document.fullscreenElement) await document.exitFullscreen();
      ownedFullscreen = false;
      return;
    }
    if (document.fullscreenElement && screen.orientation?.lock) {
      await screen.orientation.lock('landscape').catch(() => {});
    }
  } catch { /* Unsupported or declined: the viewport-filling game still works. */ }
}
export function leaveGameFullscreen() {
  requestGeneration += 1;
  try { screen.orientation?.unlock?.(); } catch { /* Unsupported. */ }
  if (ownedFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  ownedFullscreen = false;
}
