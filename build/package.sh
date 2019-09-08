#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

rm -rf release
mkdir -p release/lib
cp -R lib/* release/lib
cp package.json release
cp package-lock.json release
cp LICENSE release
cp README.md release
cp CHANGELOG.md release
cp config.schema.json release
