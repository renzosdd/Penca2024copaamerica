#!/bin/sh
# Installs backend and frontend dependencies for running tests in CI

set -e

# Install backend dependencies only if node_modules is missing
if [ ! -d node_modules ]; then
  npm ci
fi

# Install frontend dev dependencies if the frontend folder exists and they aren't installed
if [ -d frontend ]; then
  (cd frontend && [ ! -d node_modules ] && npm ci)
fi
