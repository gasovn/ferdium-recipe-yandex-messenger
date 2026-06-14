# Ferdium recipe: Yandex Messenger

Ferdium recipe for Yandex Messenger (https://yandex.ru/chat). The same web client also runs Yandex 360 for Business at https://messenger.360.yandex.ru; add it as a second service with the custom URL option.

## Development

Link the recipe into Ferdium's development recipes folder, then restart Ferdium:

    scripts/dev-link.sh

The script handles both native and Flatpak installs. After restarting, add the service from the recipe list. For Yandex 360, enable "Use custom URL" and enter https://messenger.360.yandex.ru.

## Layout

    yandex-messenger/    the recipe, ready to copy into ferdium-recipes/recipes/
    scripts/dev-link.sh  symlink helper for local development

## License

MIT
