const path = require('path');

module.exports = Ferdium => {
  Ferdium.injectJSUnsafe(path.join(__dirname, 'webview-unsafe.js'));

  const getMessages = () => {
    // Title: "… — N новых сообщений" (RU) / "N new messages" (EN).
    const match = document.title.match(/(\d+)\s+(?:нов|new)/i);
    Ferdium.setBadge(match ? Ferdium.safeParseInt(match[1]) : 0);
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
