#!/bin/sh
set -e
# node_modules es un volumen anónimo: debe alinearse con prisma/schema.prisma del bind mount
cd /app
npx prisma generate
exec "$@"
