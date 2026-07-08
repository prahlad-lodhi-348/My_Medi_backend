# MY MEDI BACKEND

This repository contains the Django REST API backend for the MY MEDI application. It supports user authentication, profile management, medicine tracking, medication schedules, stock alerts, and AI-powered medicine image analysis.

## Features

- User registration and email verification
- Secure authentication using Django REST Framework tokens
- User profile management
- Medicine management APIs
- Regimen and dosage management
- Stock alert tracking
- AI-based medicine analysis using Gemini
- Reminder and AI insight endpoints

## Tech Stack

- Python 3.11+
- Django 6.0.4
- Django REST Framework
- PostgreSQL
- Google Generative AI
- Pillow

## Project Structure

```bash
my_medi_django_backend/
├── api/                 # API app with models, views, serializers, and URLs
├── my_medi_backend/     # Django project settings and routing
├── templates/           # HTML and email templates
├── static/              # Static files
└── manage.py            # Django management script
```

## Installation

Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Environment Configuration

Create a `.env` file in the project root and add values like the following:

```env
SECRET_KEY=your-secret-key
DEBUG=True
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=your_email@gmail.com
GEMINI_API_KEY=your_gemini_api_key
```

## Database Setup

Run migrations:

```bash
python manage.py migrate
```

Create a superuser:

```bash
python manage.py createsuperuser
```

## Run the Server

```bash
python manage.py runserver
```

The API will be available at:

```bash
http://127.0.0.1:8000/
```

## API Endpoints

Common endpoints include:

- POST /api/register/
- GET /api/verify/<token>/
- POST /api/login/
- GET /api/profile/
- GET/POST /api/medicines/
- POST /api/analyze-medicine/
- GET/POST /api/regimens/
- GET/POST /api/stock-alerts/

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
