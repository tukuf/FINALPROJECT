# Virtual House Renting Platform

This project consists of a Django backend and a React frontend. Follow the instructions below to set up and run the application locally.

## Prerequisites

Make sure you have the following installed on your system:
- [Python](https://www.python.org/) (>= 3.8 recommended)
- [Node.js](https://nodejs.org/) & npm
- Git

## 1. Clone the Repository

First, clone the project from GitHub and navigate into the root directory:

```bash
git clone <your-repository-url>
cd HOUSE_RENTING
```

## 2. Backend Setup (Django)

The backend is built with Django and is located in the `END/rentproject` directory.

1. Navigate to the backend directory:
   ```bash
   cd END/rentproject
   ```

2. Create a virtual environment:
   ```bash
   python3 -m venv .venv
   ```

3. Activate the virtual environment:
   - On Linux/macOS:
     ```bash
     source .venv/bin/activate
     ```
   - On Windows:
     ```bash
     .venv\Scripts\activate
     ```

4. Install the Python dependencies from `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```

5. Set up the environment file:
   ```bash
   cp .env.example .env
   ```
   *Note: Update the `DB_*` variables and other settings in your `.env` file according to your local database setup.*

6. Run database migrations to create the necessary tables:
   ```bash
   python manage.py migrate
   ```

7. Start the Django development server:
   ```bash
   python manage.py runserver
   ```
   The backend API will usually be available at `http://127.0.0.1:8000`.

## 3. Frontend Setup (React)

The frontend is built with React and is located in the `FRONT/rentapp` directory.

1. Open a new terminal window/tab, and navigate to the frontend directory:
   ```bash
   cd FRONT/rentapp
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```
   The frontend will usually be available at `http://localhost:3000`. Ensure that both the frontend and backend servers are running simultaneously for the application to function fully.
