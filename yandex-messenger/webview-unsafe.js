// Yandex Passport login is a window.open() popup that Ferdium would send to the
// system browser (no shared session). Keep it in-frame. The userActivation
// guard skips Yandex's own automatic window.open calls, which would loop.
(() => {
  const nativeOpen = window.open;
  window.open = (url, target, features) => {
    try {
      const u = new URL(String(url), window.location.href);
      if (
        u.hostname === 'passport.yandex.ru' &&
        u.pathname.startsWith('/auth') &&
        navigator.userActivation &&
        navigator.userActivation.isActive
      ) {
        window.location.assign(u.href);
        return null;
      }
    } catch {}
    return nativeOpen(url, target, features);
  };
})();
