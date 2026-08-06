#!/bin/sh
set -e

# Railway and most hosts inject PORT at runtime; default for local use.
export PORT="${PORT:-80}"
export API_UPSTREAM="${API_UPSTREAM:-http://api:4000}"

envsubst '${PORT} ${API_UPSTREAM}' \
  < /etc/nginx/templates/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
