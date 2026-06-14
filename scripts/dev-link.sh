#!/usr/bin/env bash
set -euo pipefail

recipe_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/yandex-messenger"

candidates=(
  "$HOME/.config/Ferdium/recipes/dev"
  "$HOME/.var/app/org.ferdium.Ferdium/config/Ferdium/recipes/dev"
)

dev_dir=""
for c in "${candidates[@]}"; do
  if [ -d "$(dirname "$(dirname "$c")")" ]; then
    dev_dir="$c"
    break
  fi
done

if [ -z "$dev_dir" ]; then
  echo "Ferdium config directory not found. Is Ferdium installed and started once?" >&2
  exit 1
fi

mkdir -p "$dev_dir"
target="$dev_dir/yandex-messenger"
rm -rf "$target"
ln -s "$recipe_dir" "$target"

echo "Linked $recipe_dir -> $target"
echo "Restart Ferdium to load the recipe."
