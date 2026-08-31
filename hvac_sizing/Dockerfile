FROM ghcr.io/home-assistant/base:latest

ARG BUILD_VERSION=0.1.0
ARG BUILD_ARCH

LABEL \
  io.hass.name="Dimensionamento Climatizzazione Pro" \
  io.hass.description="Calcolo dei carichi frigoriferi e termici per locale" \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="app" \
  io.hass.arch="${BUILD_ARCH}"

RUN apk add --no-cache python3

WORKDIR /app
COPY app.py /app/app.py
COPY calc_engine.py /app/calc_engine.py
COPY www /app/www
COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD ["/run.sh"]

