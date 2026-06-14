const path = require('path');

module.exports = Ferdium => {
  Ferdium.injectJSUnsafe(path.join(__dirname, 'webview-unsafe.js'));

  let lastUnreads = new Map();
  let lastOtherSpace = 0;
  let primed = false;

  const getMessages = () => {
    // Title: "… — N новых сообщений" (RU) / "N new messages" (EN).
    const match = document.title.match(/(\d+)\s+(?:нов|new)/i);
    Ferdium.setBadge(match ? Ferdium.safeParseInt(match[1]) : 0);

    const focused = document.hasFocus();

    // Ferdium leaves background services with document.hidden = false, so the
    // page never notifies; do it ourselves when a chat's unread count grows.
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
        ? Ferdium.safeParseInt((badge.textContent.match(/\d+/) || [])[0])
        : 0;
      unreads.set(key, count);
      chats.push({ key, count, name, item });
    }

    // Inactive spaces aren't loaded; the org picker only exposes their total.
    const spaceBadge = document.querySelector(
      '.yamb-organization-picker__badge',
    );
    const otherSpace = spaceBadge
      ? Ferdium.safeParseInt((spaceBadge.textContent.match(/\d+/) || [])[0])
      : 0;

    // Don't fire on the first poll or a space switch (the list changes wholesale).
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
          new Notification(name.textContent.trim(), options);
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

  Ferdium.loop(getMessages);

  Ferdium.onNotify(notification => {
    if (typeof notification.title !== 'string') {
      notification.title = 'Yandex Messenger';
    }
    if (typeof notification.options.body !== 'string') {
      notification.options.body = '';
    }
    return notification;
  });

  Ferdium.handleDarkMode(() => {});

  document.addEventListener(
    'click',
    event => {
      const link = event.target.closest('a[href^="http"]');
      if (!link || Ferdium.isImage(link)) {
        return;
      }
      const url = link.getAttribute('href');
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        return;
      }
      if (parsed.host !== window.location.host) {
        event.preventDefault();
        event.stopPropagation();
        Ferdium.openNewWindow(url);
      }
    },
    true,
  );
};
