#!/usr/bin/env bash
# Makes the upload key that signs builds for Google Play, plus android/key.properties pointing at it.
# Run once, from the repo root:  bash scripts/make-upload-key.sh
#
# Google keeps the real app signing key (Play App Signing); this one only proves uploads come
# from you. If you lose it, Google can reset it, but that takes days, so BACK UP both
# android/upload-key.jks and the password (e.g. in a password manager). Neither goes into git.
set -euo pipefail

cd "$(dirname "$0")/.."
KEYSTORE=android/upload-key.jks
PROPS=android/key.properties

if [ -e "$KEYSTORE" ] || [ -e "$PROPS" ]; then
  echo "An upload key already exists ($KEYSTORE / $PROPS). Not overwriting it." >&2
  exit 1
fi

read -r -s -p "Choose a password for the upload key (at least 8 characters): " PASS; echo
read -r -s -p "Same password again: " PASS2; echo
if [ "$PASS" != "$PASS2" ] || [ ${#PASS} -lt 8 ]; then
  echo "Passwords don't match or are too short." >&2
  exit 1
fi
read -r -p "Your name (shown inside the certificate, not in the store): " NAME

keytool -genkeypair -v -keystore "$KEYSTORE" -alias upload -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$PASS" -keypass "$PASS" -dname "CN=${NAME}, O=PARtners"

cat > "$PROPS" <<EOF
storeFile=upload-key.jks
storePassword=$PASS
keyAlias=upload
keyPassword=$PASS
EOF

echo
echo "Done. Back up $KEYSTORE and the password now."
echo "Build for Play: npm run build && npx cap sync android && (cd android && ./gradlew bundleRelease)"
echo "The file to upload: android/app/build/outputs/bundle/release/app-release.aab"
