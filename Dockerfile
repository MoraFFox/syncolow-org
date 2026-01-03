# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application's source code to the working directory
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port 3001 to the outside world
EXPOSE 3001

# Command to run the application
CMD ["npm", "start"]