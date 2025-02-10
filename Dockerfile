# Use Node.js version 23.7.0
FROM node:23.7.0-alpine

# Set working directory in the container
WORKDIR /app
# Copy the rest of the application code
COPY . .


# Install global serve for serving React build
RUN npm install -g serve
RUN npm install -g pm2

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Build React app
WORKDIR /app/frontend

RUN REACT_APP_API_BASE_URL=http://localhost:3333/api npm run build

# Expose the ports for backend and frontend
EXPOSE 3333 5000

# Create a shell script to run backend and frontend separately
RUN echo "#!/bin/sh" > /start.sh \
    && echo "cd /app/backend && PORT=3333 pm2 start src/app.js &" >> /start.sh \
    && echo "cd /app/frontend && serve -s build -l 5000" >> /start.sh \
    && chmod +x /start.sh

# Command to run the application
CMD ["/start.sh"]