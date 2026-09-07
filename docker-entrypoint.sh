#!/bin/sh
# Les migrations doivent passer avant que Next demarre : en cas d'echec on
# arrete le conteneur plutot que de servir une app branchee sur un schema faux.
set -e

PRISMA="node /prisma-cli/node_modules/prisma/build/index.js"
SCHEMA="/app/prisma/schema.prisma"

deploy() {
  $PRISMA migrate deploy --schema "$SCHEMA" 2>&1
}

echo "> prisma migrate deploy"
OUTPUT=$(deploy) && STATUS=0 || STATUS=$?
echo "$OUTPUT"

# P3009 : une migration en echec bloque toutes les suivantes et laisse le
# conteneur en boucle de redemarrage jusqu'a intervention manuelle sur le VPS.
# PostgreSQL applique chaque migration dans une transaction : une migration
# "failed" n'a rien laisse derriere elle, la marquer annulee est donc sur et
# permet de rejouer la version corrigee au deploiement suivant.
if [ "$STATUS" -ne 0 ] && echo "$OUTPUT" | grep -q "P3009"; then
  FAILED=$(echo "$OUTPUT" | sed -n 's/^The `\(.*\)` migration started at.*failed$/\1/p')

  for migration in $FAILED; do
    echo "> migration en echec : $migration — marquee annulee, nouvelle tentative"
    $PRISMA migrate resolve --rolled-back "$migration" --schema "$SCHEMA"
  done

  if [ -n "$FAILED" ]; then
    echo "> prisma migrate deploy (2e tentative)"
    deploy
  else
    exit "$STATUS"
  fi
elif [ "$STATUS" -ne 0 ]; then
  exit "$STATUS"
fi

exec "$@"
