import pdfplumber
import spacy
import re
from io import BytesIO
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer, util
from spacy.matcher import PhraseMatcher
import PyPDF2
from pdf2image import convert_from_path
import pytesseract
import warnings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ResumeJobMatcher:
    def __init__(self):
        # Load spaCy model
        self.nlp = spacy.load('en_core_web_sm')
        self.matcher = PhraseMatcher(self.nlp.vocab)
        # Expanded key phrases
        self.key_phrases = [
            'full stack developer', 'machine learning', 'data analysis', 'business intelligence',
            'restful api', 'data scientist', 'tensorflow', 'pytorch', 'scikit-learn', 'react',
            'node.js', 'django', 'python', 'javascript', 'sql', 'nosql', 'aws', 'azure',
            'docker', 'kubernetes', 'frontend', 'backend', 'devops', 'agile', 'scrum'
        ]
        patterns = [self.nlp(phrase) for phrase in self.key_phrases]
        self.matcher.add("KeyPhrases", patterns)
        # Load SentenceTransformer model (lighter model for efficiency)
        self.transformer_model = SentenceTransformer('all-MiniLM-L6-v2')
        # Synonym dictionary for technical terms
        self.synonyms = {
            'ml': 'machine learning',
            'ai': 'artificial intelligence',
            'js': 'javascript',
            'node': 'node.js',
            'reactjs': 'react',
            'rest api': 'restful api',
            'nosql': 'no sql'
        }

    def extract_text_from_pdf(self, pdf_input):
        """Extract text from PDF using pdfplumber, PyPDF2, or OCR if needed"""
        text = ""
        
        try:
            # Handle BytesIO input
            if isinstance(pdf_input, BytesIO):
                try:
                    with pdfplumber.open(pdf_input) as pdf:
                        for page in pdf.pages:
                            try:
                                with warnings.catch_warnings():
                                    warnings.filterwarnings("ignore", message=".*PDFColorSpace.*")
                                    warnings.filterwarnings("ignore", message=".*Cannot convert.*")
                                    page_text = page.extract_text(layout=True)
                                    if page_text:
                                        text += page_text + "\n"
                            except Exception as e:
                                if "PDFColorSpace" not in str(e) and "Cannot convert" not in str(e):
                                    logger.error(f"Error extracting text from page with pdfplumber: {e}")
                except Exception as e:
                    logger.error(f"pdfplumber extraction failed: {e}")
                
                if text.strip():
                    logger.info("Successfully extracted text with pdfplumber (BytesIO)")
                    return text.strip()
                
                # Try PyPDF2 as a fallback
                logger.info("Trying PyPDF2 extraction method...")
                try:
                    pdf_input.seek(0)
                    pdf_reader = PyPDF2.PdfReader(pdf_input)
                    pdf_text = ""
                    for page in pdf_reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            pdf_text += page_text + "\n"
                    if pdf_text.strip():
                        logger.info("Successfully extracted text with PyPDF2 (BytesIO)")
                        return pdf_text.strip()
                except Exception as e:
                    logger.error(f"PyPDF2 extraction failed: {e}")
                
                logger.warning("BytesIO OCR not supported. Please provide a file path for OCR.")
                return ""
            
            # Handle file path input
            else:
                try:
                    with pdfplumber.open(pdf_input) as pdf:
                        for page in pdf.pages:
                            try:
                                with warnings.catch_warnings():
                                    warnings.filterwarnings("ignore", message=".*PDFColorSpace.*")
                                    warnings.filterwarnings("ignore", message=".*Cannot convert.*")
                                    page_text = page.extract_text(layout=True)
                                    if page_text:
                                        text += page_text + "\n"
                            except Exception as e:
                                if "PDFColorSpace" not in str(e) and "Cannot convert" not in str(e):
                                    logger.error(f"Error extracting text from page with pdfplumber: {e}")
                except Exception as e:
                    logger.error(f"pdfplumber extraction failed: {e}")
                
                if text.strip():
                    logger.info("Successfully extracted text with pdfplumber (file path)")
                    return text.strip()
                
                # Try PyPDF2 as a fallback
                logger.info("Trying PyPDF2 extraction method...")
                try:
                    pdf_text = ""
                    with open(pdf_input, 'rb') as file:
                        pdf_reader = PyPDF2.PdfReader(file)
                        for page in pdf_reader.pages:
                            page_text = page.extract_text()
                            if page_text:
                                pdf_text += page_text + "\n"
                    if pdf_text.strip():
                        logger.info("Successfully extracted text with PyPDF2 (file path)")
                        return pdf_text.strip()
                except Exception as e:
                    logger.error(f"PyPDF2 extraction failed: {e}")
                
                # Try OCR as a last resort
                try:
                    logger.info("Attempting OCR for image-based PDF. This may take a moment...")
                    images = convert_from_path(pdf_input, dpi=300)  # Higher DPI for better OCR
                    ocr_text = ""
                    for i, image in enumerate(images):
                        logger.info(f"Processing page {i+1} with OCR...")
                        page_text = pytesseract.image_to_string(image, config='--psm 6')  # Assume block text
                        ocr_text += page_text + "\n"
                    if ocr_text.strip():
                        logger.info("Successfully extracted text with OCR")
                        return ocr_text.strip()
                    else:
                        logger.error("OCR extraction yielded no text. Please check if the PDF contains actual text content.")
                except Exception as e:
                    logger.error(f"OCR processing failed: {e}")
                    logger.error("Ensure Tesseract OCR and Poppler are installed correctly.")
        
        except Exception as e:
            logger.error(f"PDF processing failed: {e}")
        
        logger.error("All text extraction methods failed. Please try a different PDF or manually extract the text.")
        return ""

    def clean_text(self, text, is_resume=False):
        """Clean text with improved filtering"""
        # Normalize synonyms
        text_lower = text.lower()
        for synonym, canonical in self.synonyms.items():
            text_lower = text_lower.replace(synonym, canonical)
        text = text_lower
        # Remove boilerplate
        text = re.sub(r'Job Description and Resume \(100% Match\)', '', text, flags=re.IGNORECASE)
        if is_resume:
            # Remove personal details
            text = re.sub(r'Name:.*?\n', '', text, flags=re.IGNORECASE)
            text = re.sub(r'Email:.*?\n', '', text, flags=re.IGNORECASE)
            text = re.sub(r'Phone:.*?\n', '', text, flags=re.IGNORECASE)
            text = re.sub(r'\d{3}-\d{3}-\d{4}', '', text)
            # Softer summary filter to preserve relevant content
            text = re.sub(r'Proven ability.*?(?=(Skills|Experience|Education|$))', '', text, flags=re.IGNORECASE | re.DOTALL)
        else:
            # Remove JD boilerplate
            text = re.sub(r'Company:.*?\n|join our dynamic team|apply now|we are an equal opportunity', '', text, flags=re.IGNORECASE)
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def extract_sections(self, text, is_resume=False):
        """Extract relevant sections with broader matching"""
        if is_resume:
            match = re.search(r'(Summary|Skills|Experience|Work History|Education|Professional Experience|Certifications).*',
                             text, re.DOTALL | re.IGNORECASE)
            return match.group(0).strip() if match else text
        else:
            match = re.search(r'(Job Title|Summary|Responsibilities|Requirements|Qualifications):.*?\n(.*)', text, re.DOTALL | re.IGNORECASE)
            return match.group(2).strip() if match else text

    def preprocess_text_tfidf(self, text):
        """Preprocess text for TF-IDF with synonym handling"""
        text = text.lower()
        for synonym, canonical in self.synonyms.items():
            text = text.replace(synonym, canonical)
        doc = self.nlp(text)
        tokens = []
        matches = self.matcher(doc)
        matched_phrases = set()
        for match_id, start, end in matches:
            phrase = doc[start:end].text.lower()
            matched_phrases.add(phrase)
            tokens.append(phrase.replace(' ', '_'))  # Preserve multi-word phrases
        for token in doc:
            if (not token.is_stop and not token.is_punct and
                token.pos_ in ['NOUN', 'VERB', 'ADJ', 'PROPN', 'NUM'] and
                token.text.lower() not in matched_phrases):
                tokens.append(token.lemma_)
        return ' '.join(tokens)

    def preprocess_text_transformer(self, text):
        """Preprocess text for transformers"""
        text = text.lower()
        for synonym, canonical in self.synonyms.items():
            text = text.replace(synonym, canonical)
        doc = self.nlp(text)
        tokens = [token.text for token in doc if not token.is_punct]
        return ' '.join(tokens)

    def calculate_tfidf_match_score(self, job_desc_text, resume_text):
        """Calculate match score using TF-IDF"""
        if not job_desc_text.strip() or not resume_text.strip():
            logger.error("Empty text after preprocessing.")
            return 0.0
        job_desc_processed = self.preprocess_text_tfidf(job_desc_text)
        resume_processed = self.preprocess_text_tfidf(resume_text)
        logger.debug(f"TF-IDF Job Desc (first 200): {job_desc_processed[:200]}")
        logger.debug(f"TF-IDF Resume (first 200): {resume_processed[:200]}")
        vectorizer = TfidfVectorizer(ngram_range=(1, 3))  # Include trigrams
        vectors = vectorizer.fit_transform([job_desc_processed, resume_processed])
        similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
        return similarity * 100

    def calculate_transformer_match_score(self, job_desc_text, resume_text):
        """Calculate match score using Sentence Transformers (whole-text embedding)"""
        if not job_desc_text.strip() or not resume_text.strip():
            logger.error("Empty text after preprocessing.")
            return 0.0
        job_desc_processed = self.preprocess_text_transformer(job_desc_text)
        resume_processed = self.preprocess_text_transformer(resume_text)
        logger.debug(f"Transformer Job Desc (first 200): {job_desc_processed[:200]}")
        logger.debug(f"Transformer Resume (first 200): {resume_processed[:200]}")
        # Whole-text embeddings
        job_desc_emb = self.transformer_model.encode(job_desc_processed, convert_to_tensor=True)
        resume_emb = self.transformer_model.encode(resume_processed, convert_to_tensor=True)
        similarity = util.cos_sim(job_desc_emb, resume_emb)[0][0]
        # Keyword bonus for critical terms
        key_term_matches = sum(1 for term in self.key_phrases if term in job_desc_processed.lower() and term in resume_processed.lower())
        keyword_bonus = min(0.1 * key_term_matches, 0.2)  # Max 20% bonus
        final_similarity = min(1.0, similarity + keyword_bonus)
        return max(0.0, final_similarity.item() * 100)

    def match_resume_to_job(self, resume_path, job_description, job_role=None):
        """Generate a match score (0–100) for a resume and job description"""
        resume_text = self.extract_text_from_pdf(resume_path)
        if not resume_text:
            return {"error": "Failed to extract text from resume"}
        if not job_description:
            return {"error": "Job description is required for matching"}

        try:
            # Clean and extract relevant sections
            job_desc_clean = self.clean_text(job_description, is_resume=False)
            resume_clean = self.clean_text(resume_text, is_resume=True)
            job_desc_section = self.extract_sections(job_desc_clean, is_resume=False)
            resume_section = self.extract_sections(resume_clean, is_resume=True)

            # Calculate match scores
            tfidf_score = self.calculate_tfidf_match_score(job_desc_section, resume_section)
            transformer_score = self.calculate_transformer_match_score(job_desc_section, resume_section)

            # Combine scores (30% TF-IDF, 70% Transformer)
            combined_score = 0.3 * tfidf_score + 0.7 * transformer_score

            # Dynamic job_role bonus
            if job_role:
                job_role_lower = job_role.lower()
                role_matches = sum(1 for phrase in self.key_phrases if phrase in job_role_lower and phrase in resume_section.lower())
                role_bonus = min(5 + 2 * role_matches, 10)  # Max 10 points
                combined_score = min(100, combined_score + role_bonus)

            logger.info(f"TF-IDF Score: {tfidf_score:.2f}, Transformer Score: {transformer_score:.2f}, Combined Score: {combined_score:.2f}")
            return {"match_score": round(combined_score, 2)}
        
        except Exception as e:
            logger.error(f"Matching failed: {str(e)}")
            return {"error": f"Matching failed: {str(e)}"}

if __name__ == "__main__":
    matcher = ResumeJobMatcher()
    job_description = "We are looking for a Full Stack Developer proficient in React, Node.js, and RESTful APIs."
    resume_path = "path/to/resume.pdf"
    result = matcher.match_resume_to_job(resume_path, job_description, job_role="Full Stack Developer")
    print(result)
