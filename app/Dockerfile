FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app source code
COPY . .

# Expose Expo Metro Bundler ports
# 8081 is the default port for Metro Bundler
EXPOSE 8081

# Start the Expo development server
CMD ["npm", "start"]
