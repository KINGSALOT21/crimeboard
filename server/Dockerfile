FROM node:22-alpine

WORKDIR /app

# Install dependencies first (cached unless package.json changes).
COPY package*.json ./
RUN npm install

# Copy the rest of the server code.
COPY . .

EXPOSE 3001

CMD ["node", "index.js"]