FROM node:18-bullseye

RUN apt-get update && apt-get install -y --no-install-recommends \
  bash \
  openssh-client \
  sshpass \
  curl \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install ttyd binary from official releases
RUN curl -L https://github.com/tsl0922/ttyd/releases/latest/download/ttyd.x86_64 -o /usr/local/bin/ttyd \
  && chmod +x /usr/local/bin/ttyd

WORKDIR /app
COPY ttyd-proxy.js .
COPY ttyd/package.json .

RUN npm install

EXPOSE 7681

ENTRYPOINT ["node", "ttyd-proxy.js"]
