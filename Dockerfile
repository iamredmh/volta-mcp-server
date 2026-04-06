FROM node:18-slim

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY src/ src/
COPY idl/ idl/

RUN npm ci
RUN npx tsc

ENTRYPOINT ["node", "dist/index.js"]
