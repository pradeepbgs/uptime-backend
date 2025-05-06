FROM oven/bun:latest

WORKDIR /app

COPY package.json tsconfig.json ./

COPY . .

RUN bun install

EXPOSE 3001

ENTRYPOINT ["bun", "run", "start"]