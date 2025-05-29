from flask import Flask, request, jsonify, Blueprint
from resume_analyzer import AIResumeAnalyzer
from resume_job_matcher import ResumeJobMatcher
from flask_cors import CORS
from job_recommendation import get_job_listings
import os
import requests
import json
from fpdf import FPDF
from datetime import datetime
import math
import logging
import re
import PyPDF2
import uuid
from dotenv import load_dotenv
from cloudinary.uploader import upload
from cloudinary import config, api
from cloudinary.utils import cloudinary_url
from io import BytesIO
import time
import tempfile

# Configure environment and logging
load_dotenv()
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Configure Cloudinary
config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
    secure=True
)

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:5173",
            "https://career-catalyst-project.vercel.app"
        ],
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],  
        "allow_headers": ["Content-Type", "Authorization"],  
        "expose_headers": ["X-Report-FilePath"],
        "supports_credentials": True
    }
})

analyzer = AIResumeAnalyzer()
matcher = ResumeJobMatcher()

report_bp = Blueprint('report', __name__, url_prefix='/report')

# Existing helper functions (unchanged)
def extract_pdf_text_and_links(pdf_file):
    logger.debug("Starting PDF text and hyperlink extraction")
    try:
        pdf_file.seek(0)
        reader = PyPDF2.PdfReader(pdf_file)
        extracted_text = []
        for page_num, page in enumerate(reader.pages):
            logger.debug(f"Processing page {page_num + 1}")
            page_text = page.extract_text() or ""
            if page_text:
                extracted_text.append(page_text)
            if "/Annots" in page:
                annotations = page["/Annots"]
                for annot in annotations:
                    annot_obj = annot.get_object()
                    if annot_obj.get("/Subtype") == "/Link" and "/A" in annot_obj:
                        action = annot_obj["/A"]
                        if "/URI" in action:
                            uri = action["/URI"]
                            logger.debug(f"Found hyperlink: {uri}")
                            extracted_text.append(uri)
        combined_text = "\n".join(extracted_text)
        if not combined_text.strip():
            logger.warning("No text or hyperlinks extracted from PDF")
            return ""
        logger.debug(f"Extracted text and hyperlinks: {combined_text[:100]}...")
        return combined_text
    except Exception as e:
        logger.error(f"Failed to extract text from PDF: {e}")
        return ""

def get_github_token():
    token = os.getenv('GITHUB_TOKEN')
    if not token:
        raise ValueError("GitHub token not found in environment variables")
    return token

def extract_github_id(resume_text):
    logger.debug(f"Extracting GitHub ID from resume text: {resume_text[:100]}...")
    github_patterns = [
        r"(?:GitHub:\s*([a-zA-Z0-9-]+)|https://github.com/([a-zA-Z0-9-]+))"
    ]
    combined_pattern = '|'.join(f'({pattern})' for pattern in github_patterns)
    matches = re.finditer(combined_pattern, resume_text, re.IGNORECASE)
    for match in matches:
        for group in match.groups():
            if group and re.match(r"^[a-zA-Z0-9-]+$", group):
                logger.debug(f"Found GitHub ID: {group}")
                return group
    logger.warning("No GitHub ID found in resume")
    return None

def safe_log(value, base):
    return math.log(value + 1, base)

def compute_github_rating(github_data):
    summary = github_data.get("summary_statistics", {})
    total_commits = summary.get("total_commits", 0)
    total_repos = summary.get("total_repositories", 0)
    total_workflows = summary.get("total_workflows", 0)
    total_prs = summary.get("total_pull_requests", 0)
    max_commits, max_repos, max_workflows, max_prs = 50, 20, 100, 10
    norm_commits = min(safe_log(total_commits, max_commits + 1) / safe_log(max_commits, max_commits + 1) * 10, 10)
    norm_repos = min(safe_log(total_repos, max_repos + 1) / safe_log(max_repos, max_repos + 1) * 10, 10)
    norm_workflows = min(safe_log(total_workflows, max_workflows + 1) / safe_log(max_workflows, max_workflows + 1) * 10, 10)
    norm_prs = min(safe_log(total_prs, max_prs + 1) / safe_log(max_prs, max_prs + 1) * 10, 10)
    return min((norm_commits * 0.35 + norm_repos * 0.25 + norm_workflows * 0.2 + norm_prs * 0.2), 10)

def map_rating_to_salary(rating, min_salary, max_salary):
    return min_salary + (max_salary - min_salary) * (rating / 10)

def format_bytes(bytes_count):
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_count < 1024:
            return f"{bytes_count:.1f} {unit}"
        bytes_count /= 1024
    return f"{bytes_count:.1f} TB"

def draw_language_bar(pdf, language, bytes_written, max_bytes, start_y):
    bar_width, bar_height, left_margin = 160, 12, 30
    if start_y + bar_height + 5 > pdf.h - pdf.b_margin:
        pdf.add_page()
        start_y = pdf.t_margin
    start_x = pdf.l_margin + left_margin
    percentage = (bytes_written / max_bytes) * 100
    actual_bar_width = (bytes_written / max_bytes) * bar_width
    pdf.set_xy(pdf.l_margin + 2, start_y + 2)
    pdf.set_font('helvetica', 'B', 10)
    pdf.cell(left_margin - 5, bar_height, language, ln=0, align='R')
    pdf.set_fill_color(240, 240, 240)
    pdf.rect(start_x, start_y, bar_width, bar_height, style='F')
    pdf.set_fill_color(41, 128, 185)
    if actual_bar_width > 0:
        pdf.rect(start_x, start_y, actual_bar_width, bar_height, style='F')
    stats_text = f"{percentage:.1f}% ({format_bytes(bytes_written)})"
    text_width = pdf.get_string_width(stats_text)
    text_x = start_x + 5
    if actual_bar_width > text_width + 10:
        pdf.set_text_color(255, 255, 255)
    else:
        pdf.set_text_color(0, 0, 0)
    pdf.set_xy(text_x, start_y + 2)
    pdf.set_font('helvetica', '', 10)
    pdf.cell(bar_width - 10, bar_height - 4, stats_text, ln=1)
    pdf.set_text_color(0, 0, 0)
    return start_y + bar_height + 1

class PDFReport(FPDF):
    def header(self):
        self.set_font("helvetica", "B", 16)
        self.set_text_color(50, 50, 50)
        self.cell(0, 10, "Developer Report", border=0, ln=1, align="C")
        self.image("https://cdn-icons-png.flaticon.com/512/3891/3891670.png", x=10, y=10, w=30)
        self.ln(15)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Page {self.page_no()} | OrgDash Enterprise", 0, 0, "C")

def section_header(pdf, title):
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(255, 255, 255)
    pdf.set_fill_color(0, 102, 204)
    pdf.cell(0, 10, title, ln=1, fill=True, align="C")
    pdf.ln(3)

# Updated REST API function for workflows
def fetch_workflow_count(owner, repo_name, token):
    logger.debug(f"Fetching workflow count for {owner}/{repo_name}")
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.v3+json"}
    url = f"https://api.github.com/repos/{owner}/{repo_name}/actions/workflows"
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            workflows = response.json().get("workflows", [])
            return len(workflows)
        else:
            logger.error(f"Failed to fetch workflows for {owner}/{repo_name}: Status {response.status_code}")
            return 0
    except Exception as e:
        logger.error(f"Error fetching workflows for {owner}/{repo_name}: {str(e)}")
        return 0

# Updated GraphQL function (added owner field)
def fetch_github_data_graphql(username, token):
    logger.debug(f"Fetching GitHub data for {username} using GraphQL")
    query = """
    query($username: String!) {
      user(login: $username) {
        id
        login
        repositories(first: 100, affiliations: [OWNER, COLLABORATOR]) {
          totalCount
          nodes {
            name
            isFork
            owner {
              login
            }
            languages(first: 10) {
              edges {
                node { name }
                size
              }
            }
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 100) {
                    totalCount
                    nodes {
                      author {
                        user {
                          login
                        }
                      }
                    }
                  }
                }
              }
            }
            pullRequests(first: 100, states: [OPEN, CLOSED, MERGED]) {
              totalCount
              nodes {
                author {
                  login
                }
              }
            }
          }
        }
      }
    }
    """
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        "https://api.github.com/graphql",
        json={"query": query, "variables": {"username": username}},
        headers=headers,
        timeout=10
    )
    if response.status_code != 200:
        logger.error(f"GraphQL request failed: {response.text}")
        raise Exception(f"GraphQL request failed: Status {response.status_code}")
    data = response.json()
    if "errors" in data:
        logger.error(f"GraphQL errors: {data['errors']}")
        raise Exception(f"GraphQL errors: {data['errors']}")
    logger.debug(f"GraphQL response: {json.dumps(data, indent=2)[:200]}...")
    return data

@report_bp.route('/generate-report', methods=['POST'])
def generate_report():
    logger.debug("Entering /report/generate-report endpoint")
    data = request.get_json()
    resume_file_path = data.get('resumeFilePath')
    min_salary = data.get('min_salary')
    max_salary = data.get('max_salary')

    if not resume_file_path:
        logger.error("Missing resumeFilePath in request")
        return jsonify({"error": "resumeFilePath is required"}), 400
    if min_salary is None or max_salary is None:
        logger.error("Missing min_salary or max_salary in request")
        return jsonify({"error": "Both min_salary and max_salary are required"}), 400
    if min_salary >= max_salary:
        logger.error("Invalid salary range: min_salary must be less than max_salary")
        return jsonify({"error": "min_salary must be less than max_salary"}), 400

    try:
        # Fetch resume from Cloudinary
        logger.debug(f"Fetching resume from {resume_file_path}")
        resume_response = requests.get(resume_file_path, timeout=10)
        if resume_response.status_code != 200:
            logger.error(f"Failed to fetch resume: Status {resume_response.status_code}")
            return jsonify({"error": "Failed to fetch resume", "details": f"Status {resume_response.status_code}"}), 400

        # Extract GitHub ID
        resume_text = extract_pdf_text_and_links(BytesIO(resume_response.content))
        if not resume_text:
            logger.error("No text extracted from resume PDF")
            return jsonify({"error": "Failed to extract text from resume"}), 400
        github_id = extract_github_id(resume_text)
        if not github_id:
            logger.error("No GitHub ID found in resume")
            return jsonify({"error": "No GitHub ID found in resume"}), 400
        logger.debug(f"Extracted GitHub ID: {github_id}")

        # Fetch GitHub data using GraphQL
        token = get_github_token()
        github_data = fetch_github_data_graphql(github_id, token)
        user_data = github_data["data"]["user"]
        repositories = []
        languages_analysis = {}
        summary_stats = {
            "total_repositories": user_data["repositories"]["totalCount"],
            "total_commits": 0,
            "total_pull_requests": 0,
            "total_workflows": 0
        }

        for repo in user_data["repositories"]["nodes"]:
            # Count user-specific commits
            commit_count = 0
            if repo["defaultBranchRef"] and repo["defaultBranchRef"]["target"]:
                for commit in repo["defaultBranchRef"]["target"]["history"]["nodes"]:
                    if commit["author"] and commit["author"]["user"] and commit["author"]["user"]["login"] == github_id:
                        commit_count += 1
            # Count user-specific pull requests
            pr_count = sum(1 for pr in repo["pullRequests"]["nodes"] if pr["author"] and pr["author"]["login"] == github_id)
            # Fetch workflow count using REST API
            workflow_count = fetch_workflow_count(repo["owner"]["login"], repo["name"], token)
            primary_language = repo["languages"]["edges"][0]["node"]["name"] if repo["languages"]["edges"] else None
            summary_stats["total_commits"] += commit_count
            summary_stats["total_pull_requests"] += pr_count
            summary_stats["total_workflows"] += workflow_count
            repositories.append({
                "Name": repo["name"],
                "Language": primary_language,
                "fork": repo["isFork"],
                "commit_count": commit_count,
                "pull_request_count": pr_count,
                "workflow_count": workflow_count
            })
            for lang in repo["languages"]["edges"]:
                lang_name = lang["node"]["name"]
                lang_size = lang["size"]
                languages_analysis[lang_name] = languages_analysis.get(lang_name, 0) + lang_size

        logger.debug(f"Repositories: {len(repositories)}, Languages: {languages_analysis}, Summary: {summary_stats}")

        # Calculate ratings
        github_rating = compute_github_rating({"summary_statistics": summary_stats})
        offered_salary = map_rating_to_salary(github_rating, min_salary, max_salary)
        overall_rating = github_rating
        logger.debug(f"GitHub rating: {github_rating}, Offered salary: {offered_salary}")

        # Generate PDF
        pdf = PDFReport()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=20)
        pdf.set_font("helvetica", "", 12)
        pdf.cell(0, 10, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=1, align="C")
        pdf.ln(5)

        # GitHub Summary Statistics
        section_header(pdf, "GitHub Summary Statistics")
        pdf.set_text_color(0, 0, 0)
        for key, value in summary_stats.items():
            pdf.cell(0, 8, f"{key.replace('_', ' ').title()}: {value}", ln=1)
        pdf.ln(5)

        # Skills Analysis (All Repositories)
        all_repos_skills = {repo["Language"]: sum(1 for r in repositories if r["Language"] == repo["Language"]) for repo in repositories if repo["Language"]}
        section_header(pdf, "Skills Analysis (All Repositories)")
        pdf.set_text_color(0, 0, 0)
        for skill, count in all_repos_skills.items():
            pdf.cell(0, 8, f"{skill}: {count} repositories", ln=1)
        pdf.ln(5)

        # Skills Analysis (User-Owned Repositories)
        user_owned_repos = [repo for repo in repositories if not repo.get("fork", False)]
        user_owned_repos_skills = {repo["Language"]: sum(1 for r in user_owned_repos if r["Language"] == repo["Language"]) for repo in user_owned_repos if repo["Language"]}
        section_header(pdf, "Skills Analysis (User-Owned Repositories)")
        pdf.set_text_color(0, 0, 0)
        for skill, count in user_owned_repos_skills.items():
            pdf.cell(0, 8, f"{skill}: {count} repositories", ln=1)
        pdf.ln(5)

        # Languages Used (User-Owned Repositories)
        user_owned_repos_languages = {k: v for k, v in languages_analysis.items() if any(k == repo["Language"] for repo in user_owned_repos)}
        section_header(pdf, "Languages Used (User-Owned Repositories)")
        pdf.set_text_color(0, 0, 0)
        if user_owned_repos_languages:
            pdf.set_font("helvetica", "B", 12)
            pdf.cell(0, 8, "Language Distribution:", ln=1)
            pdf.ln(5)
            max_bytes = max(user_owned_repos_languages.values())
            current_y = pdf.get_y()
            for lang, bytes_written in sorted(user_owned_repos_languages.items(), key=lambda x: x[1], reverse=True):
                current_y = draw_language_bar(pdf, lang, bytes_written, max_bytes, current_y)
        else:
            pdf.cell(0, 8, "No data available.", ln=1)
        pdf.ln(5)

        # Candidate Evaluation
        section_header(pdf, "Candidate Evaluation")
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("helvetica", "", 12)
        pdf.cell(0, 8, f"GitHub Rating: {github_rating:.2f}/10", ln=1)
        pdf.cell(0, 8, f"Suggested Salary: {offered_salary:.2f} LPA", ln=1)
        pdf.cell(0, 8, f"Overall Rating: {overall_rating:.2f}/10", ln=1)

        # Save and upload PDF
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            pdf.output(temp_file.name)
            temp_file_path = temp_file.name
            temp_file_size = os.path.getsize(temp_file_path)
            logger.debug(f"Temporary PDF created at {temp_file_path}, size: {temp_file_size} bytes")

        if temp_file_size == 0:
            logger.error("Generated PDF is empty")
            os.unlink(temp_file_path)
            return jsonify({"error": "Failed to generate PDF: empty file"}), 500

        report_filename = f"report_{github_id}_{uuid.uuid4().hex[:8]}"
        result = upload(
            temp_file_path,
            folder='reports',
            public_id=report_filename,
            resource_type='raw',
            access_mode='public'
        )
        report_url = result['secure_url']
        os.unlink(temp_file_path)
        logger.debug(f"PDF uploaded to Cloudinary: {report_url}")

        # Verify uploaded PDF
        pdf_response = requests.get(report_url, timeout=10)
        if pdf_response.status_code != 200 or pdf_response.headers.get('Content-Type') != 'application/pdf':
            logger.error(f"Uploaded PDF invalid: Status {pdf_response.status_code}")
            return jsonify({"error": "Uploaded PDF is not accessible or invalid"}), 500

        response = jsonify({"filePath": report_url})
        response.headers['X-Report-FilePath'] = report_url
        response.headers['Content-Disposition'] = f'attachment; filename="report_{github_id}.pdf"'
        logger.debug("Report generation completed successfully")
        return response

    except Exception as e:
        logger.error(f"Unexpected error in generate_report: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    
@app.route('/upload_resume', methods=['POST'])
def upload_resume():
    if 'resume' not in request.files:
        logger.error("No file part in request")
        return jsonify({"error": "No file part"}), 400
    file = request.files['resume']
    if file.filename == '':
        logger.error("No selected file")
        return jsonify({"error": "No selected file"}), 400
    if not file.mimetype == 'application/pdf':
        logger.error(f"Invalid file type: {file.mimetype}")
        return jsonify({"error": "Only PDF files are allowed"}), 400
    if file.content_length > 5 * 1024 * 1024:  # 5MB limit
        logger.error(f"File too large: {file.content_length} bytes")
        return jsonify({"error": "File size exceeds 5MB limit"}), 400

    job_category = request.args.get('job_category')
    job_role = request.args.get('job_role')
    logger.debug(f"Uploading resume: {file.filename}, job_category: {job_category}, job_role: {job_role}")

    try:
        file_content = file.read()
        result = upload(
            file_content,
            folder='resumes',
            public_id=f"resume_{uuid.uuid4().hex[:8]}",
            resource_type='raw',
            access_mode='public',
            upload_preset='flask_public_upload'
        )
        file_url = result['secure_url']
        public_id = result.get('public_id')
        access_mode = result.get('access_mode', 'unknown')
        logger.debug(f"Resume uploaded to Cloudinary: {file_url}, public_id: {public_id}, access_mode: {access_mode}")

        if access_mode != 'public':
            logger.warning(f"Uploaded file {public_id} has access_mode: {access_mode}. Updating to public.")
            try:
                api.update(
                    public_id,
                    resource_type='raw',
                    access_mode='public'
                )
                logger.debug(f"Updated {public_id} to access_mode: public")
            except Exception as e:
                logger.error(f"Failed to update access_mode for {public_id}: {str(e)}")
                return jsonify({"error": "Failed to set public access for resume", "details": str(e)}), 500

        # Verify file accessibility
        verify_response = requests.get(file_url, timeout=10)
        if verify_response.status_code != 200:
            logger.error(f"Uploaded file is not publicly accessible: {file_url}, Status: {verify_response.status_code}")
            return jsonify({"error": "Uploaded file is not publicly accessible", "details": f"Status {verify_response.status_code}"}), 500

        resume_text = analyzer.extract_text_from_pdf(BytesIO(file_content))
        if not resume_text:
            logger.error("Failed to extract text from PDF")
            return jsonify({"error": "Failed to extract text from PDF"}), 400

        analysis_result = analyzer.analyze_resume_with_gemini(resume_text, job_role=job_role if job_role else None)
        logger.debug(f"Resume analysis result: {analysis_result}")

        return jsonify({"filePath": file_url, **analysis_result})
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {str(e)}")
        if "Upload preset not found" in str(e):
            return jsonify({
                "error": "Cloudinary configuration error",
                "details": "Upload preset 'flask_public_upload' not found. Please create it in Cloudinary."
            }), 500
        return jsonify({"error": "Failed to upload resume to Cloudinary", "details": str(e)}), 500

@app.route('/recommend-jobs', methods=['POST'])
def recommend_jobs():
    data = request.get_json()
    search_query = data.get("search_query", "")
    if not search_query:
        logger.error("Search query is required")
        return jsonify({"error": "Search query is required"}), 400
    jobs = get_job_listings(search_query)
    logger.debug(f"Job listings: {jobs}")
    return jsonify(jobs)

@app.route('/match_resume_job', methods=['POST'])
def match_resume_job():
    data = request.get_json()
    logger.debug(f"Received request data: {data}")
    resume_file_path = data.get('resumeFilePath')
    job_description = data.get('jobDescription')
    job_role = data.get('jobRole')

    if not resume_file_path:
        logger.error("resumeFilePath is missing in request")
        return jsonify({"error": "resumeFilePath is required"}), 400
    if not job_description:
        logger.error("jobDescription is missing in request")
        return jsonify({"error": "jobDescription is required"}), 400

    try:
        # Fetch resume from Cloudinary
        logger.debug(f"Fetching resume from: {resume_file_path}")
        resume_response = requests.get(resume_file_path, timeout=10)
        if resume_response.status_code != 200:
            logger.error(f"Failed to fetch resume from {resume_file_path}: Status {resume_response.status_code}")
            return jsonify({"error": "Failed to fetch resume", "details": f"Status {resume_response.status_code}"}), 400

        # Save PDF content to a temporary file
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(resume_response.content)
            temp_file_path = temp_file.name
            logger.debug(f"Temporary PDF saved at {temp_file_path}, size: {os.path.getsize(temp_file_path)} bytes")

        try:
            # Try matching with the temporary file path
            match_result = matcher.match_resume_to_job(temp_file_path, job_description, job_role)

            if "error" in match_result:
                logger.error(f"Matching failed: {match_result['error']}")
                return jsonify({"error": match_result['error']}), 400

            logger.debug(f"Match result: {match_result}")
            return jsonify(match_result)

        except Exception as e:
            logger.warning(f"Matching with file path failed: {str(e)}. Falling back to BytesIO method.")
            # Fallback to original BytesIO method
            match_result = matcher.match_resume_to_job(BytesIO(resume_response.content), job_description, job_role)

            if "error" in match_result:
                logger.error(f"Matching failed: {match_result['error']}")
                # Try extracting text with existing method as a last resort
                resume_text = extract_pdf_text_and_links(BytesIO(resume_response.content))
                if not resume_text:
                    logger.error("Fallback text extraction failed")
                    return jsonify({"error": "Failed to extract text from resume using fallback method"}), 400
                # If text is extracted, you may need to modify ResumeJobMatcher to accept text directly
                return jsonify({"error": "Text extracted but matching not implemented for raw text", "extracted_text": resume_text[:500]})

            logger.debug(f"Fallback match result: {match_result}")
            return jsonify(match_result)

        finally:
            # Clean up the temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                logger.debug(f"Cleaned up temporary file: {temp_file_path}")

    except Exception as e:
        logger.error(f"Error in match_resume_job: {str(e)}")
        return jsonify({"error": str(e)}), 500

app.register_blueprint(report_bp)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)
