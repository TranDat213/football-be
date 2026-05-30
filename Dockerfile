FROM node:lts-alpine

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose port (default 3000, adjust if your app uses a different one)
EXPOSE 3000

# Start the application
# Note: Since the start script in package.json is 'node src/app.js', 
# if it fails because files compile to dist/, we override it to run the compiled file
CMD ["node", "dist/src/app.js"]
