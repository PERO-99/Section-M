# Use the official Node.js lightweight Alpine image as the base
FROM node:18-alpine

# Set target workspace directory inside the container
WORKDIR /usr/src/app

# Copy dependency manifests for caching optimization
COPY package*.json ./

# Install standard dependencies
RUN npm ci --only=production

# Copy all application files (Frontend and Backend folders)
COPY . .

# Expose server port (Render will read PORT env and map it automatically)
ENV PORT=8000
EXPOSE 8000

# Start the full-stack Express server
CMD ["npm", "start"]
