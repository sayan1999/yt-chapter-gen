# Use Node.js version 23.7.0
FROM python:3.12.0a3-slim

# Set working directory in the container
WORKDIR /app
# Copy the rest of the application code
COPY . .

RUN pip install -r requirements.txt


EXPOSE 5000

# Command to run the application
CMD ["gunicorn", "src.app:app"]