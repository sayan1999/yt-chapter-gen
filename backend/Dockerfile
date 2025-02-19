# Use Node.js version 23.7.0
FROM python:3.12.0a3-slim

# Set working directory in the container
WORKDIR /app
# Copy the rest of the application code
COPY . .

RUN pip install -r requirements.txt


EXPOSE 3333

RUN echo "#!/bin/sh" > /start.sh \
    && echo "if [ -z \"\${FLASK_RUN_PORT}\" ]; then echo 'FLASK_RUN_PORT environment variable is not set'; exit 1; fi" >> /start.sh \
    && echo "cd /app && gunicorn src.app:app --bind 0.0.0.0:\${FLASK_RUN_PORT} -t 300 --keep-alive 60" >> /start.sh \
    && chmod +x /start.sh

# Command to run the application
CMD ["/start.sh"]