FROM nikolaik/python-nodejs:python3.12-nodejs22-slim

# Set working directory in the container
WORKDIR /app
# Copy the rest of the application code
COPY . .


# Install global serve for serving React build
RUN npm install -g serve

# Install backend dependencies
WORKDIR /app/backend
RUN pip install -r requirements.txt

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Expose the ports for backend and frontend
EXPOSE 3333 10000

# Create a shell script to run backend and frontend separately
RUN echo "#!/bin/sh" > /start.sh \
    && echo "if [ -z \"\${PORT}\" ]; then echo 'PORT environment variable is not set'; exit 1; fi" >> /start.sh \
    && echo "if [ -z \"\${FLASK_RUN_PORT}\" ]; then echo 'FLASK_RUN_PORT environment variable is not set'; exit 1; fi" >> /start.sh \
    && echo "cd /app/backend && gunicorn src.app:app --bind 0.0.0.0:\${FLASK_RUN_PORT} -t 300 --keep-alive 60 &" >> /start.sh \
    && echo "cd /app/frontend && serve -s build --listen \${PORT}" >> /start.sh \
    && chmod +x /start.sh

# Command to run the application
CMD ["/start.sh"]