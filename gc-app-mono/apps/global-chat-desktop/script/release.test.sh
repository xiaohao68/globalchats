#!/bin/zsh

# workspace apps/global-chat-desktop
cd ./src-tauri || exit
cargo clean
cd ..

# environments
CN_APPLICATION="chathub/global-chats-test"
VERSION=$(jq -r '.version' ./src-tauri/tauri.conf.json)
APP_NAME=$(jq -r '.productName' ./src-tauri/tauri.conf.json)
NOTES=$(cat ./release-notes/release-notes.md)
SENTRY_DSN=https://aae53d1cf7a3812573ee2bbeea1ca71e@o4509418064510976.ingest.us.sentry.io/4509514402168832
ENV_MODE=test

# 打印结果
echo "版本号: $VERSION"
echo "更新日志: $NOTES"

# build app
bun install
rustup target add x86_64-apple-darwin
rustup target add x86_64-pc-windows-msvc
bun tauri build -t x86_64-apple-darwin -c ./src-tauri/tauri.conf.json --debug
bun tauri build -t aarch64-apple-darwin -c ./src-tauri/tauri.conf.json --debug
bun tauri build --runner cargo-xwin -t x86_64-pc-windows-msvc -c ./src-tauri/tauri.conf.json --debug

# release
CN_RELEASE_OUTPUT=$(cn release draft "$CN_APPLICATION" --framework tauri --notes "$NOTES")
CN_RELEASE_ID=$(echo "$CN_RELEASE_OUTPUT" | grep -o '"id": "[^"]*"' | cut -d '"' -f4)

#cn release draft $CN_APPLICATION --framework tauri --notes "$NOTES"
#cn release upload $CN_APPLICATION --framework tauri

cn release upload $CN_APPLICATION $CN_RELEASE_ID --public-platform nsis-x86_64 --update-platform windows-x86_64	--file "./src-tauri/target/x86_64-pc-windows-msvc/debug/bundle/nsis/${APP_NAME}_${VERSION}_x64-setup.exe"
cn release upload $CN_APPLICATION $CN_RELEASE_ID --update-platform darwin-x86_64 --file "./src-tauri/target/x86_64-apple-darwin/debug/bundle/macos/${APP_NAME}.app.tar.gz"
cn release upload $CN_APPLICATION $CN_RELEASE_ID --public-platform dmg-x86_64	--file "./src-tauri/target/x86_64-apple-darwin/debug/bundle/dmg/${APP_NAME}_${VERSION}_x64.dmg"
cn release upload $CN_APPLICATION $CN_RELEASE_ID --update-platform darwin-aarch64 --file "./src-tauri/target/aarch64-apple-darwin/debug/bundle/macos/${APP_NAME}.app.tar.gz"
cn release upload $CN_APPLICATION $CN_RELEASE_ID --public-platform dmg-aarch64 --file "./src-tauri/target/aarch64-apple-darwin/debug/bundle/dmg/${APP_NAME}_${VERSION}_aarch64.dmg"

cn release publish $CN_APPLICATION --framework tauri




