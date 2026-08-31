#!/usr/bin/with-contenv bashio
set -e

export HVAC_DATA_DIR="/data"
export HVAC_PORT="8099"

bashio::log.info "Avvio Dimensionamento Climatizzazione Pro"
exec python3 /app/app.py

