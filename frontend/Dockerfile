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


# Create a shell script to run backend and frontend separately
RUN echo "#!/bin/sh" > /start.sh \
    && echo "if [ -z \"\${UI_PORT}\" ]; then echo 'PORT environment variable is not set'; exit 1; fi" >> /start.sh \
    && echo "cd /app && serve -s build --listen tcp://0.0.0.0:\${UI_PORT}" >> /start.sh \
    && chmod +x /start.sh


# Command to run the application
CMD ["/start.sh"] 