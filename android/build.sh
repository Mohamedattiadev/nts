#!/usr/bin/env bash
# 96: builds the "Nts'e kaydet" helper APK with the plain Android SDK tools (no Gradle, no libraries).
# Needs: JDK 17, Android SDK (build-tools + platform 35). Key OUTSIDE the repo: ~/.nts-android/nts.jks + keystore.properties
# (storeFile, storePassword, keyAlias, keyPassword). Out: android/out/nts-kaydet.apk
set -euo pipefail
cd "$(dirname "$0")"
SDK=${ANDROID_HOME:-$HOME/Android/Sdk}; BT=$(ls -d "$SDK"/build-tools/* | sort -V | tail -1); JAR=$SDK/platforms/android-35/android.jar
KP=$HOME/.nts-android/keystore.properties; prop() { grep "^$1=" "$KP" | cut -d= -f2-; }
rm -rf out && mkdir -p out/res out/gen out/cls
"$BT/aapt2" compile --dir res -o out/res.zip
"$BT/aapt2" link -I "$JAR" --manifest AndroidManifest.xml -o out/base.apk --java out/gen out/res.zip
javac --release 8 -nowarn -classpath "$JAR" -d out/cls $(find src out/gen -name '*.java') 2>&1 | grep -v 'warning' || true
"$BT/d8" --release --min-api 23 --lib "$JAR" --output out $(find out/cls -name '*.class')
cp out/base.apk out/unsigned.apk && (cd out && zip -q unsigned.apk classes.dex)
"$BT/zipalign" -f 4 out/unsigned.apk out/aligned.apk
"$BT/apksigner" sign --ks "$(prop storeFile)" --ks-key-alias "$(prop keyAlias)" --ks-pass "pass:$(prop storePassword)" --key-pass "pass:$(prop keyPassword)" --out out/nts-kaydet.apk out/aligned.apk
"$BT/apksigner" verify out/nts-kaydet.apk && ls -la out/nts-kaydet.apk
