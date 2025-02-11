# Use Node.js version 23.7.0
FROM node:23.7.0-alpine

# Set working directory in the container
WORKDIR /app
# Copy the rest of the application code
COPY . .

RUN npm install -g pm2

# Install backend dependencies
WORKDIR /app
RUN npm install

EXPOSE 3333

# Command to run the application
CMD ["./run.sh"]