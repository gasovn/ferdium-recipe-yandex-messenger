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
      // A muted chat renders its unread counter without the accent modifier
      // (the badge component gets primary: !muted). While unreads exist this
      // is the only mute marker in the DOM: the crossed-bell icon is shown
      // only when the counter is empty, and data-test-tag attributes are
      // stripped from the production build.
      const counter = item.querySelector(
        '.ui-badge:not(.ui-badge_has-mentions)',
      );
      const muted =
        counter !== null && !counter.classList.contains('ui-badge_primary');
      // The mention badge is icon-only (no digits) and stays accented even
      // in a muted chat, so mentions can pierce mute.
      const mention = item.querySelector('.ui-badge_has-mentions') !== null;
      unreads.set(key, { count, mention });
      chats.push({ key, count, muted, mention, name, item });
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
      for (const { key, count, muted, mention, name, item } of chats) {
        const prev = lastUnreads.get(key) || { count: 0, mention: false };
        const newMention = mention && !prev.mention;
        if ((!muted && count > prev.count) || newMention) {
          const preview = item.querySelector('.ui-entity-block-multi-line');
          const avatar = item.querySelector('.ui-avatar__image');
          const options = {
            body: (preview && preview.textContent.trim()) || 'Новое сообщение',
          };
          // Pass the avatar only from the public CDN, since Ferdium loads the
          // notification icon from a context without the messenger session.
          if (
            avatar &&
            avatar.src.startsWith('https://avatars.mds.yandex.net/')
          ) {
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
