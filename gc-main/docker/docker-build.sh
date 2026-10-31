#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

TARGET_TAG="${1:-latest}"
export DOCKER_BUILDKIT=1

IMAGE="ghcr.io/usejdl/globalchats:${TARGET_TAG}"
echo "Building ${IMAGE}"
docker build \
  --platform linux/amd64 \
  --build-arg "GC_VERSION=${TARGET_TAG}" \
  -f docker/Dockerfile \
  -t "${IMAGE}" \
  .

echo "Built ${IMAGE}"
echo "Start database manually: docker compose -f docker/docker-compose.yml up -d db"
echo "Start example app only when needed: docker compose -f docker/docker-compose.yml --profile example up -d app"
