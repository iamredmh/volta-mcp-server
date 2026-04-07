FROM node:18-slim@sha256:fc3faf127a182135fd956e68d570b1932a758f8008866d8dd6e131cf89de9605

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY src/ src/
COPY idl/ idl/

RUN npm ci
RUN npx tsc

USER node

ENTRYPOINT ["node", "dist/index.js"]
