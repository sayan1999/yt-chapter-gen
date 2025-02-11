# Use Node.js version 23.7.0
FROM nikolaik/python-nodejs:python3.11-nodejs22-slim

# Set working directory in the container
WORKDIR /app
# Copy the rest of the application code
COPY . .

RUN pip install yt-dlp

# Install backend dependencies
WORKDIR /app
RUN npm install

EXPOSE 3333

# Command to run the application
CMD ["node", "src/app.js"]