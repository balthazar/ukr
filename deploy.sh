#!/usr/bin/env bash
# Build, push and roll out from this machine (CI does the same on push to master).
# Needs: docker logged in to ghcr.io with a PAT that has write:packages.
set -euo pipefail
cd "$(dirname "$0")"

CONTEXT="${KUBE_CONTEXT:-dadonew}"
NAMESPACE=apps
IMAGE=ghcr.io/balthazar/ukr
TAG="$(git rev-parse --short HEAD)"

docker buildx build --platform linux/amd64 -t "$IMAGE:$TAG" -t "$IMAGE:latest" --push .
kubectl --context "$CONTEXT" apply -f k8s/app.yaml
kubectl --context "$CONTEXT" -n "$NAMESPACE" set image deployment/ukr "ukr=$IMAGE:$TAG"
kubectl --context "$CONTEXT" -n "$NAMESPACE" rollout status deployment/ukr --timeout=180s
