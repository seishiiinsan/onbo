#!/bin/sh
set -e

echo "> prisma migrate deploy"
node node_modules/prisma/build/index.js migrate deploy || echo "! migrate deploy failed (pas encore de migration ?) - on continue"

exec "$@"
