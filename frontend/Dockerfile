# Use Node.js version 23.7.0
FROM node:23.7.0-alpine

# Set working directory in the container
WORKDIR /app
# Copy the rest of the application code
COPY . .


# Install global serve for serving React build
RUN npm install -g serve


# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Expose the ports for backend and frontend
EXPOSE 3000

# Command to run the application
CMD ["./serve.sh"]