#!/bin/sh

set -e

ROLE=${ROLE:-app}

cd /usr/app/

if [ "$ROLE" = "supervisor" ]; then
  exec node supervisor.js
elif [ "$ROLE" = "manager" ]; then
  exec node channel-manager.js
else
  echo "Unsupported role: $ROLE"
  exit 1
fi