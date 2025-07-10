# Career Catalyst: Resume Analysis and Job Matching Platform

Career Catalyst is a comprehensive platform designed to empower students, educational institutions, and organizations by providing advanced resume analysis, job matching, and talent scouting capabilities. Leveraging AI , web scraping, and NLP techniques, Career Catalyst streamlines the process of career development and recruitment.

## 🚀 Features

### For Students
- **Resume Analysis** (via Gemini API):
  - Resume score and ATS (Applicant Tracking System) optimization score.
  - Detailed analysis of professional profile, skills, experience, and education.
  - Identification of key strengths and areas for improvement.
  - ATS optimization assessment with actionable feedback.
  - Personalized recommendations for courses and certifications.
- **LinkedIn Job Scraping**:
  - Scrapes LinkedIn for job listings tailored to specific roles using Adzuna.

### For Institutions
- **Dashboard**:
  - Displays total students, active job listings, recent job matches, and student lists.
- **Filtering**:
  - Filter students by branch, year, or search by name.
- **Job Matching**:
  - Matches student resumes to relevant job profiles using NLP techniques (cosine similarity, keyword matching, weighted experience).


### For Organizations
- **Student Discovery**:
  - View students across institutions with advanced filtering options.
- **Report Generation**:
  - Scrapes LinkedIn for professional experience data (via Selenium).
  - Fetches repository data (commits, PRs, language analysis) via GitHub API.
  - Aggregates data into comprehensive PDF reports using PyPDF2 and pdfplumber.
- **Job Management**:
  - Add job listings with details (title, description, branch, year).
  - View student matches with match percentages calculated using NLP techniques.
- **Salary Suggestion**:
  - Provides salary recommendations based on skill analysis, GitHub contributions, experience, and user-provided min/max salary inputs.

## 🛠️ Tech Stack

### Frontend
- **TypeScript**: For building a robust and scalable frontend.
- **Hosted on Vercel**: For seamless deployment and scalability.

### Backend
- **Node.js + Express**: Core logic for handling API requests and business logic, hosted on Render.
- **Flask**: Handles Python-related tasks, including Gemini API integration and web scraping.
- **Database**: MongoDB for storing user data, resumes, and job listings.
- **File Handling**:
  - **Multer**: For handling resume uploads.
  - **Cloudinary**: For secure resume storage.
- **PDF Processing**:
  - **PyPDF2** and **pdfplumber**: For extracting data from resumes and generating reports.

### Authentication
- **JWT**: Secure authentication mechanism.
- **Gunicorn**: For deploying the Flask backend.

### APIs & Tools
- **Gemini API**: Powers resume analysis and scoring.
- **Adzuna**: Scrapes LinkedIn for job listings and experience data.
- **GitHub API**: Fetches repository statistics (commits, PRs, languages).
- **NLP Techniques**:
  - Cosine similarity and keyword matching for job matching.
  - Weighted experience analysis for accurate match percentages.

### Deployment
- **Frontend**: Hosted on Vercel for fast and reliable deployment.
- **Backend**:
  - Node.js + Express hosted on Render.
  - Flask for Python logic, deployed separately for modularity.

## 📋 Prerequisites
- Node.js (v16 or higher)
- Python (v3.8 or higher)
- MongoDB
- Vercel account (for frontend deployment)
- Render account (for backend deployment)
- Cloudinary account (for resume storage)
- API keys for:
  - Gemini API
  - GitHub API
  - LinkedIn scraping (Selenium setup)

## 🛠️ Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-repo/careersync.git
   cd careersync
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Deploy to Vercel:
   ```bash
   vercel
   ```

3. **Backend Setup (Node.js)**:
   ```bash
   cd backend-node
   npm install
   npm start
   ```
   Deploy to Render:
   - Follow Render's documentation to deploy the Node.js backend.

4. **Backend Setup (Flask)**:
   ```bash
   cd backend-flask
   pip install -r requirements.txt
   gunicorn --bind 0.0.0.0:8000 app:app
   ```
   Deploy to Render:
   - Configure Render for Python/Flask deployment.

5. **Environment Variables**:
   Create a `.env` file in both `backend-node` and `backend-flask` directories with the following:
   ```env
   MONGODB_URI=<your-mongodb-uri>
   CLOUDINARY_URL=<your-cloudinary-url>
   GEMINI_API_KEY=<your-gemini-api-key>
   GITHUB_API_TOKEN=<your-github-api-token>
   JWT_SECRET=<your-jwt-secret>
   ```

6. **Database Setup**:
   - Set up MongoDB locally or use a cloud provider (e.g., MongoDB Atlas).
   - Ensure the database is accessible via the `MONGODB_URI`.

## 📖 Usage

1. **Students**:
   - Upload your resume via the frontend interface.
   - Receive a detailed analysis, including scores, strengths, and course recommendations.
   - Browse matched job listings tailored to your profile.

2. **Institutions**:
   - Access the dashboard to view student data and job matches.
   - Add or manage job listings and filter students as needed.

3. **Organizations**:
   - Explore student profiles across institutions.
   - Generate detailed reports and view salary suggestions based on candidate data.

## 📂 Project Structure
```
careersync/
├── frontend/                # TypeScript frontend (Vercel)
├── backend-node/           # Node.js + Express backend (Render)
├── backend-flask/          # Flask backend for Python tasks
├── docs/                   # Documentation and assets
└── README.md
```

## 👥 Contributors

This project was developed as a **collaborative group effort** by:

- [K Sri Raghavi](https://github.com/sriraghavi22)
- [A Abhijith Reddy](https://github.com/abhijithreddy05)
- [CH Shriya](https://github.com/shriyacheruvu)

