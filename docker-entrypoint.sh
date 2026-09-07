#!/bin/sh
# Les migrations doivent passer avant que Next demarre : en cas d'echec on
# arrete le conteneur plutot que de servir une app branchee sur un schema faux.
set -e

echo "> prisma migrate deploy"
node /prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema /app/prisma/schema.prisma

exec "$@"
