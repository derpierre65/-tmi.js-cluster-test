#!/bin/sh

set -e

ROLE=${ROLE:-app}

cd /usr/app/

if [ "$ROLE" = "supervisor" ]; then
  node supervisor.js
elif [ "$ROLE" = "manager" ]; then
  node channel-manager.js
else
  echo "Unsupported role: $ROLE"
  exit 1
fi