// After Passport login the in-frame redirect lands on a build=passport-done
// callback page that renders blank (it expects to be a popup). Reload the clean
// URL so the authenticated app boots.
if (location.search.includes('build=passport-done')) {
  location.replace(location.origin + location.pathname);
}

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

// Notifications run in the page's main world so they go through Ferdium's own
// Notification: it brings the window forward and switches to this service on
// click, and the onclick opens the chat the message arrived in. A background
// service keeps document.hidden = false in Ferdium, so this timer is not throttled.
(() => {
  if (window.__yandexMessengerNotifier) {
    return;
  }
  window.__yandexMessengerNotifier = true;

  const toInt = text => {
    const n = Number.parseInt(text, 10);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  };

  let lastUnreads = new Map();
  let lastOtherSpace = 0;
  let primed = false;

  const check = () => {
    const focused = document.hasFocus();

    const unreads = new Map();
    const chats = [];
    for (const item of document.querySelectorAll('.yamb-chat-list-item')) {
      const name = item.querySelector('.yamb-chat-list-item__name');
      if (!name) {
        continue;
      }
      const key = name.id || name.textContent.trim();
      const badge = item.querySelector('.yamb-chat-list-item__badges');
      const count = badge
        ? toInt((badge.textContent.match(/\d+/) || [])[0])
        : 0;
      unreads.set(key, count);
      chats.push({ key, count, name, item });
    }

    const spaceBadge = document.querySelector(
      '.yamb-organization-picker__badge',
    );
    const otherSpace = spaceBadge
      ? toInt((spaceBadge.textContent.match(/\d+/) || [])[0])
      : 0;

    const switched =
      unreads.size > 0 &&
      ![...unreads.keys()].some(key => lastUnreads.has(key));

    if (primed && !focused && !switched) {
      for (const { key, count, name, item } of chats) {
        if (count > (lastUnreads.get(key) || 0)) {
          const preview = item.querySelector('.ui-entity-block-multi-line');
          const avatar = item.querySelector('.ui-avatar__image');
          const options = {
            body: (preview && preview.textContent.trim()) || 'Новое сообщение',
          };
          if (avatar && /^https?:/.test(avatar.src)) {
            options.icon = avatar.src;
          }
          const notification = new Notification(
            name.textContent.trim(),
            options,
          );
          notification.onclick = () => {
            const row =
              document.getElementById(key)?.closest('.yamb-chat-list-item') ||
              item;
            row?.click();
          };
        }
      }
      if (otherSpace > lastOtherSpace) {
        new Notification('Yandex Messenger', {
          body: 'Новое сообщение в другом пространстве',
        });
      }
    }

    lastUnreads = unreads;
    lastOtherSpace = otherSpace;
    primed = true;
  };

  setInterval(check, 2000);
})();
