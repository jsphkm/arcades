#!/usr/bin/env bash
# Expo SDK 57 / Gradle need JDK 17. The Medium Phone AVD also needs a
# cold boot: a 1-core snapshot left bootanim running forever (Google G).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"

is_jdk17() {
  local home="$1"
  [[ -x "$home/bin/java" ]] || return 1
  "$home/bin/java" -version 2>&1 | grep -qE 'version "17[."]'
}

pick=""
for candidate in \
  "${JAVA_HOME:-}" \
  /Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home \
  /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home \
  /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
  /opt/homebrew/opt/openjdk@17 \
  /usr/libexec/java_home
do
  if [[ "$candidate" == "/usr/libexec/java_home" ]]; then
    candidate="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
  fi
  [[ -n "$candidate" ]] || continue
  if is_jdk17 "$candidate"; then
    pick="$candidate"
    break
  fi
done

if [[ -z "$pick" ]]; then
  echo "JDK 17 is required for Android builds (Expo SDK 57)." >&2
  echo "Install with: brew install --cask zulu@17" >&2
  exit 1
fi

export JAVA_HOME="$pick"
export PATH="$JAVA_HOME/bin:$PATH"
echo "JAVA_HOME=$JAVA_HOME"

boot_done() {
  adb devices 2>/dev/null | grep -qE 'emulator-[0-9]+[[:space:]]+device' || return 1
  local serial
  serial="$(adb devices | awk '/emulator-/{print $1; exit}')"
  [[ "$(adb -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]
}

if ! boot_done; then
  if ! pgrep -f 'qemu-system-aarch64' >/dev/null; then
    echo "Starting Medium_Phone_API_35 (cold boot, no snapshot)..."
    emulator -avd Medium_Phone_API_35 -no-snapshot -no-boot-anim -gpu host \
      >/tmp/arcades-emulator.log 2>&1 &
  else
    echo "Emulator is up; waiting for Android to finish booting..."
  fi
  for i in $(seq 1 90); do
    if boot_done; then
      echo "Emulator ready."
      break
    fi
    sleep 2
  done
  if ! boot_done; then
    echo "Emulator did not finish booting. Log: /tmp/arcades-emulator.log" >&2
    echo "Try: emulator -avd Medium_Phone_API_35 -no-snapshot -no-boot-anim" >&2
    exit 1
  fi
fi

cd "$ROOT/rn"
exec npx expo run:android "$@"
