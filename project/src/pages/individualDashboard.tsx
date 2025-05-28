import React, { useState, useEffect } from 'react';
import { Upload, Download, FileText, ChevronDown, ChevronUp, User, LogOut } from 'lucide-react';
import GaugeChart from 'react-gauge-chart';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';

interface AnalysisResult {
  analysis?: string;
  resume_score?: number;
  ats_score?: number;
  error?: string;
  [key: string]: any;
}

interface JobListing {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
}

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  college: string;
  year: string;
  department: string;
  resumeFilePath?: string;
  reportFilePath?: string;
  resumeScore?: number;
  atsScore?: number;
  jobRole?: string;
  jobCategory?: string;
  analysisFilePath?: string;
  analysisResumeScore?: number;
  analysisAtsScore?: number;
}

const jobCategories = [
  "Software Development and Engineering",
  "Data Science and Analytics",
  "Product Management",
  "UI/UX Design",
  "DevOps and Infrastructure",
  "Cybersecurity",
];

const jobRoles = {
  "Software Development and Engineering": [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Mobile Developer",
    "Software Architect",
  ],
  "Data Science and Analytics": [
    "Data Scientist",
    "Data Analyst",
    "Machine Learning Engineer",
    "Business Intelligence Analyst",
  ],
  "Product Management": [
    "Product Manager",
    "Product Owner",
    "Technical Product Manager",
  ],
  "UI/UX Design": [
    "UI Designer",
    "UX Designer",
    "Product Designer",
    "Interaction Designer",
  ],
  "DevOps and Infrastructure": [
    "DevOps Engineer",
    "Site Reliability Engineer",
    "Cloud Engineer",
    "Infrastructure Engineer",
  ],
  "Cybersecurity": [
    "Security Engineer",
    "Security Analyst",
    "Penetration Tester",
    "Security Architect",
  ],
};

function IndividualDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [jobCategory, setJobCategory] = useState("Data Science and Analytics");
  const [jobRole, setJobRole] = useState("Data Scientist");
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [jobLoading, setJobLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setProfile(user);
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      alert('Please select a PDF file');
      setFile(null);
    }
  };

  const handleProfileFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setProfileFile(selectedFile);
    } else {
      alert('Please select a PDF file');
      setProfileFile(null);
    }
  };

  const handleProfileUpload = async () => {
    if (!profileFile) {
      alert('Please select a PDF file to upload');
      return;
    }

    const token = localStorage.getItem('token');
    const userId = profile?._id;

    if (!userId) {
      alert('User ID not found. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      if (profile?.resumeFilePath) {
        const deleteResponse = await fetch(`${import.meta.env.VITE_NODE_SERVER_URL}/individuals/delete/${userId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!deleteResponse.ok) {
          throw new Error(`Failed to delete previous resume: ${deleteResponse.statusText}`);
        }
        console.log(`Deleted previous resume for user ${userId}`);
      }

      const formData = new FormData();
      formData.append('pdf', profileFile);

      const uploadResponse = await fetch(`${import.meta.env.VITE_NODE_SERVER_URL}/individuals/upload/${userId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload resume: ${uploadResponse.statusText}`);
      }

      const data = await uploadResponse.json();
      alert('Resume uploaded successfully');
      setProfile({ ...profile!, resumeFilePath: data.filePath });
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...user, resumeFilePath: data.filePath }));
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred: ' + (error as Error).message);
    } finally {
      setLoading(false);
      setShowProfileModal(false);
      setProfileFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a PDF file first');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_FLASK_SERVER_URL}/upload_resume?job_category=${encodeURIComponent(jobCategory)}&job_role=${encodeURIComponent(jobRole)}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to analyze resume: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Received result:', data);
      if (data.error) {
        alert(`Analysis error: ${data.error}`);
        setResult(null);
      } else {
        setResult(data);
        setShowReport(true);
        // Trigger report upload after successful analysis
        await handleReportUpload(data);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while analyzing the resume: ' + (error as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const parseAnalysisSections = (analysis: string) => {
    const sections: { [key: string]: string } = {};
    const sectionRegex = /##\s*([^\n]+)\n([\s\S]*?)(?=(##\s*[\w\s]+)|$)/g;
    let match;
    while ((match = sectionRegex.exec(analysis)) !== null) {
      const sectionTitle = match[1].trim();
      const sectionContent = match[2].trim();
      sections[sectionTitle] = sectionContent;
    }
    return sections;
  };

 const handleReportUpload = async (analysisResult: AnalysisResult) => {
  if (!analysisResult || !profile?._id) {
    alert('Cannot upload report: Missing analysis result or user ID');
    return;
  }

  const token = localStorage.getItem('token');
  const userId = profile._id;

  // Generate the PDF report (unchanged PDF generation logic)
  const doc = new jsPDF();
  const margin = 15;
  let y = 20;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const maxLineWidth = pageWidth - 2 * margin;

  const addText = (text: string, x: number, fontSize: number, isBold = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxLineWidth);
    if (y + lines.length * (fontSize / 2.5) > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, x, y);
    y += lines.length * (fontSize / 2.5);
  };

  const addMarkdownContent = (content: string, title: string) => {
    addText(title, margin, 15, true, [0, 0, 100]);
    const lines = content.split('\n').filter(line => line.trim());
    lines.forEach(line => {
      let formattedLine = line;
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        formattedLine = `• ${line.replace(/^- |^\* /, '')}`;
      } else if (line.trim().match(/^\d+\.\s/)) {
        const match = line.trim().match(/^\d+\./);
        formattedLine = match ? `${match[0]} ${line.replace(/^\d+\.\s/, '')}` : line;
      }
      formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '$1');
      addText(formattedLine, margin + 5, 9, false, [50, 50, 50]);
    });
    y += 8;
  };

  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
    }
  };

  // Header
  addText('Resume Analysis Report', margin, 20, true, [0, 0, 255]);
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 255);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Scores
  if (analysisResult.resume_score !== undefined) {
    addText('Resume Score', margin, 15, true, [0, 0, 100]);
    addText(`${analysisResult.resume_score}/100`, margin, 11, false, [50, 50, 50]);
    y += 8;
  }
  if (analysisResult.ats_score !== undefined) {
    addText('ATS Optimization Score', margin, 15, true, [0, 0, 100]);
    addText(`${analysisResult.ats_score}/100`, margin, 11, false, [50, 50, 50]);
    y += 10;
  }

  // Key Strengths and Areas for Improvement (two columns)
  const sections = analysisResult.analysis ? parseAnalysisSections(analysisResult.analysis) : {};
  const leftColumnX = margin;
  const rightColumnX = pageWidth / 2 + margin / 2;
  const columnWidth = (pageWidth - 3.5 * margin) / 2;

  if (sections['Key Strengths'] || sections['Areas for Improvement']) {
    let yLeft = y;
    let yRight = y;
    
    if (sections['Key Strengths']) {
      addText('Key Strengths', leftColumnX, 12, true, [0, 0, 100]);
      yLeft += 8;
      const strengths = sections['Key Strengths'].split('\n').filter(line => line.trim());
      strengths.forEach(line => {
        let formattedLine = line.replace(/^- |^\* /, '• ').replace(/\*\*(.*?)\*\*/g, '$1');
        const lines = doc.splitTextToSize(formattedLine, columnWidth);
        if (yLeft + lines.length * (8 / 2) > pageHeight - 20) {
          doc.addPage();
          yLeft = 20;
          yRight = 20;
        }
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(lines, leftColumnX + 5, yLeft);
        yLeft += lines.length * (8 / 2);
      });
    }
    
    if (sections['Areas for Improvement']) {
      addText('Areas for Improvement', rightColumnX, 12, true, [0, 0, 100]);
      yRight += 8;
      const improvements = sections['Areas for Improvement'].split('\n').filter(line => line.trim());
      improvements.forEach(line => {
        let formattedLine = line.replace(/^- |^\* /, '• ').replace(/\*\*(.*?)\*\*/g, '$1');
        const lines = doc.splitTextToSize(formattedLine, columnWidth);
        if (yRight + lines.length * (8 / 2) > pageHeight - 20) {
          doc.addPage();
          yLeft = 20;
          yRight = 20;
        }
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(lines, rightColumnX + 5, yRight);
        yRight += lines.length * (8 / 2);
      });
    }
    
    y = Math.max(yLeft, yRight) + 10;
  }

  // Detailed Report
  addText('Detailed Analysis', margin, 16, true, [0, 0, 255]);
  y += 8;

  const sectionOrder = [
    'Overall Assessment',
    'Professional Profile Analysis',
    'Skills Analysis',
    'Experience Analysis',
    'Education Analysis',
    'ATS Optimization Assessment',
    'Recommended Courses/Certifications',
    'Role Alignment Analysis',
    'Job Match Analysis',
    'Key Job Requirements Not Met',
  ];

  sectionOrder.forEach(section => {
    if (sections[section]) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      addMarkdownContent(sections[section], section);
    }
  });

  if (analysisResult.error) {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    addText('Error', margin, 15, true, [255, 0, 0]);
    addText(analysisResult.error, margin, 9, false, [200, 0, 0]);
    y += 8;
  }

  addFooter();

  // Convert PDF to Blob
  const pdfBlob = doc.output('blob');
  const formData = new FormData();
  formData.append('pdf', pdfBlob, 'resume-analysis.pdf');
  formData.append('analysisResumeScore', analysisResult.resume_score?.toString() || '0');
  formData.append('analysisAtsScore', analysisResult.ats_score?.toString() || '0');
  formData.append('jobRole', jobRole || '');
  formData.append('jobCategory', jobCategory || '');

  // Log FormData for debugging
  console.log('Sending FormData:', {
    analysisResumeScore: analysisResult.resume_score?.toString() || '0',
    analysisAtsScore: analysisResult.ats_score?.toString() || '0',
    jobRole: jobRole || '',
    jobCategory: jobCategory || '',
    pdf: 'resume-analysis.pdf',
  });

  try {
    const uploadResponse = await fetch(`${import.meta.env.VITE_NODE_SERVER_URL}/individuals/upload-report/${userId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`Failed to upload analysis report: ${errorData.message || uploadResponse.statusText}`);
    }

    const data = await uploadResponse.json();
    console.log('Upload response:', data);

    setProfile({
      ...profile,
      analysisFilePath: data.filePath,
      analysisResumeScore: data.analysisResumeScore,
      analysisAtsScore: data.analysisAtsScore,
      jobRole: data.jobRole,
      jobCategory: data.jobCategory,
    });

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({
      ...user,
      analysisFilePath: data.filePath,
      analysisResumeScore: data.analysisResumeScore,
      analysisAtsScore: data.analysisAtsScore,
      jobRole: data.jobRole,
      jobCategory: data.jobCategory,
    }));
  } catch (error) {
    console.error('Error uploading analysis report:', error);
    alert('An error occurred while uploading the analysis report: ' + (error as any).message);
  }
};

  const handleDownload = () => {
    if (!result || (result.error && !result.analysis)) {
      alert('No analysis result to download');
      return;
    }

    const doc = new jsPDF();
    const margin = 15;
    let y = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const maxLineWidth = pageWidth - 2 * margin;

    const addText = (text: string, x: number, fontSize: number, isBold = false, color: [number, number, number] = [0, 0, 0]) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, maxLineWidth);
      if (y + lines.length * (fontSize / 2.5) > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines, x, y);
      y += lines.length * (fontSize / 2.5);
    };

    const addMarkdownContent = (content: string, title: string) => {
      addText(title, margin, 15, true, [0, 0, 100]);
      const lines = content.split('\n').filter(line => line.trim());
      lines.forEach(line => {
        let formattedLine = line;
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          formattedLine = `• ${line.replace(/^- |^\* /, '')}`;
        } else if (line.trim().match(/^\d+\.\s/)) {
          const match = line.trim().match(/^\d+\./);
          formattedLine = match ? `${match[0]} ${line.replace(/^\d+\.\s/, '')}` : line;
        }
        formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '$1');
        addText(formattedLine, margin + 5, 9, false, [50, 50, 50]);
      });
      y += 8;
    };

    const addFooter = () => {
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
      }
    };

    // Header
    addText('Resume Analysis Report', margin, 20, true, [0, 0, 255]);
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 255);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Scores
    if (result.resume_score !== undefined) {
      addText('Resume Score', margin, 15, true, [0, 0, 100]);
      addText(`${result.resume_score}/100`, margin, 11, false, [50, 50, 50]);
      y += 8;
    }
    if (result.ats_score !== undefined) {
      addText('ATS Optimization Score', margin, 15, true, [0, 0, 100]);
      addText(`${result.ats_score}/100`, margin, 11, false, [50, 50, 50]);
      y += 10;
    }

    // Key Strengths and Areas for Improvement (two columns)
    const sections = result.analysis ? parseAnalysisSections(result.analysis) : {};
    const leftColumnX = margin;
    const rightColumnX = pageWidth / 2 + margin / 2;
    const columnWidth = (pageWidth - 3.5 * margin) / 2;

    if (sections['Key Strengths'] || sections['Areas for Improvement']) {
      let yLeft = y;
      let yRight = y;
      
      if (sections['Key Strengths']) {
        addText('Key Strengths', leftColumnX, 12, true, [0, 0, 100]);
        yLeft += 8;
        const strengths = sections['Key Strengths'].split('\n').filter(line => line.trim());
        strengths.forEach(line => {
          let formattedLine = line.replace(/^- |^\* /, '• ').replace(/\*\*(.*?)\*\*/g, '$1');
          const lines = doc.splitTextToSize(formattedLine, columnWidth);
          if (yLeft + lines.length * (8 / 2) > pageHeight - 20) {
            doc.addPage();
            yLeft = 20;
            yRight = 20;
          }
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(lines, leftColumnX + 5, yLeft);
          yLeft += lines.length * (8 / 2);
        });
      }
      
      if (sections['Areas for Improvement']) {
        addText('Areas for Improvement', rightColumnX, 12, true, [0, 0, 100]);
        yRight += 8;
        const improvements = sections['Areas for Improvement'].split('\n').filter(line => line.trim());
        improvements.forEach(line => {
          let formattedLine = line.replace(/^- |^\* /, '• ').replace(/\*\*(.*?)\*\*/g, '$1');
          const lines = doc.splitTextToSize(formattedLine, columnWidth);
          if (yRight + lines.length * (8 / 2) > pageHeight - 20) {
            doc.addPage();
            yLeft = 20;
            yRight = 20;
          }
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(lines, rightColumnX + 5, yRight);
          yRight += lines.length * (8 / 2);
        });
      }
      
      y = Math.max(yLeft, yRight) + 10;
    }

    // Detailed Report
    addText('Detailed Analysis', margin, 16, true, [0, 0, 255]);
    y += 8;

    const sectionOrder = [
      'Overall Assessment',
      'Professional Profile Analysis',
      'Skills Analysis',
      'Experience Analysis',
      'Education Analysis',
      'ATS Optimization Assessment',
      'Recommended Courses/Certifications',
      'Role Alignment Analysis',
      'Job Match Analysis',
      'Key Job Requirements Not Met',
    ];

    sectionOrder.forEach(section => {
      if (sections[section]) {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        addMarkdownContent(sections[section], section);
      }
    });

    if (result.error) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      addText('Error', margin, 15, true, [255, 0, 0]);
      addText(result.error, margin, 9, false, [200, 0, 0]);
      y += 8;
    }

    addFooter();
    doc.save('resume-analysis.pdf');
  };

  const handleJobSearch = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a search query');
      return;
    }

    setJobLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_FLASK_SERVER_URL}/recommend-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ search_query: searchQuery }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch job recommendations: ${response.statusText}`);
      }

      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while fetching job recommendations: ' + (error as Error).message);
      setJobs([]);
    } finally {
      setJobLoading(false);
    }
  };

  const getScoreValue = (score?: number): number => {
    return score ? score / 100 : 0;
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={index} className="ml-4 text-gray-600" dangerouslySetInnerHTML={{ __html: line.replace(/^- |^\* /, '') }} />
        );
      }
      if (line.trim().match(/^\d+\.\s/)) {
        return (
          <li key={index} className="ml-4 text-gray-600" dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, '') }} />
        );
      }
      return (
        <p key={index} className="text-gray-600" dangerouslySetInnerHTML={{ __html: line }} />
      );
    });
  };

  const formatReport = (result: AnalysisResult) => {
    if (!result || !result.analysis || (result.error && !result.analysis)) {
      return <p className="text-gray-500">No detailed report available.</p>;
    }

    const sections = parseAnalysisSections(result.analysis);

    return (
      <div className="mt-4 p-6 bg-gray-50 rounded-lg overflow-auto max-h-96">
        <div className="space-y-8">
          {result.resume_score !== undefined && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Resume Score</h4>
              <p className="mt-2 text-gray-600">Score: {result.resume_score}/100</p>
            </div>
          )}
          {result.ats_score !== undefined && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">ATS Optimization Score</h4>
              <p className="mt-2 text-gray-600">Score: {result.ats_score}/100</p>
            </div>
          )}
          {sections['Overall Assessment'] && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Overall Assessment</h4>
              <div className="mt-2 space-y-2">{renderMarkdown(sections['Overall Assessment'])}</div>
            </div>
          )}
          {sections['Professional Profile Analysis'] && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Professional Profile Analysis</h4>
              <div className="mt-2 space-y-2">{renderMarkdown(sections['Professional Profile Analysis'])}</div>
            </div>
          )}
          {sections['Skills Analysis'] && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Skills Analysis</h4>
              <div className="mt-2 space-y-2">{renderMarkdown(sections['Skills Analysis'])}</div>
            </div>
          )}
          {sections['Experience Analysis'] && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Experience Analysis</h4>
              <div className="mt-2 space-y-2">{renderMarkdown(sections['Experience Analysis'])}</div>
            </div>
          )}
          {sections['Education Analysis'] && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Education Analysis</h4>
              <div className="mt-2 space-y-2">{renderMarkdown(sections['Education Analysis'])}</div>
            </div>
          )}
          {sections['Key Strengths'] && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Key Strengths</h4>
              <ul className="mt-2 list-disc list-inside space-y-2">
                {renderMarkdown(sections['Key Strengths'])}
              </ul>
            </div>
          )}
          {sections['Areas for Improvement'] && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Areas for Improvement</h4>
              <ul className="mt-2 list-decimal list-inside space-y-2">
                {renderMarkdown(sections['Areas for Improvement'])}
              </ul>
            </div>
          )}
          {sections['ATS Optimization Assessment'] && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">ATS Optimization Assessment</h4>
              <div className="mt-2 space-y-2">{renderMarkdown(sections['ATS Optimization Assessment'])}</div>
            </div>
          )}
          {sections['Recommended Courses/Certifications'] && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Recommended Courses/Certifications</h4>
              <ul className="mt-2 list-decimal list-inside space-y-2">
                {renderMarkdown(sections['Recommended Courses/Certifications'])}
              </ul>
            </div>
          )}
          {sections['Role Alignment Analysis'] && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Role Alignment Analysis</h4>
              <div className="mt-2 space-y-2">{renderMarkdown(sections['Role Alignment Analysis'])}</div>
            </div>
          )}
          {sections['Job Match Analysis'] && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Job Match Analysis</h4>
              <div className="mt-2 space-y-2">{renderMarkdown(sections['Job Match Analysis'])}</div>
            </div>
          )}
          {sections['Key Job Requirements Not Met'] && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Key Job Requirements Not Met</h4>
              <ul className="mt-2 list-disc list-inside space-y-2">
                {renderMarkdown(sections['Key Job Requirements Not Met'])}
              </ul>
            </div>
          )}
          {Object.keys(sections).length === 0 && (
            <div>
              <h4 className="text-xl font-semibold text-gray-800">Raw Report</h4>
              <div className="mt-2 space-y-2">{renderMarkdown(result.analysis)}</div>
            </div>
          )}
          {result.error && (
            <div>
              <h4 className="text-xl font-semibold text-red-800">Error</h4>
              <p className="mt-2 text-red-600">{result.error}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };


  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url("https://img.freepik.com/premium-photo/top-view-resumes-applicants-magnifying-glass-green-background-job-search-concept_35674-13811.jpg")',
      }}
    >
      <div className="min-h-screen bg-black/50 backdrop-blur-sm p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-4">AI Resume Analyzer</h1>
              <p className="text-gray-200">Upload your resume and get detailed insights powered by AI</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <User className="w-5 h-5" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>

          {showProfileModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">User Profile</h2>
                {profile ? (
                  <div className="space-y-4">
                    <p><strong>Name:</strong> {profile.name}</p>
                    <p><strong>Email:</strong> {profile.email}</p>
                    <p><strong>College:</strong> {profile.college || 'N/A'}</p>
                    <p><strong>Year:</strong> {profile.year || 'N/A'}</p>
                    <p><strong>Department:</strong> {profile.department || 'N/A'}</p>
                    <p><strong>Resume:</strong> {profile.resumeFilePath ? 'Uploaded' : 'Not uploaded'}</p>
                    <p><strong>Resume Score:</strong> {profile.resumeScore || 'N/A'}</p>
                    <p><strong>ATS Score:</strong> {profile.atsScore || 'N/A'}</p>
                    <p><strong>Job Role:</strong> {profile.jobRole || 'N/A'}</p>
                    <p><strong>Job Category:</strong> {profile.jobCategory || 'N/A'}</p>
                    <p><strong>Analysis Report:</strong> {profile.reportFilePath ? 'Uploaded' : 'Not uploaded'}</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload New Resume
                      </label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleProfileFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    {profileFile && (
                      <button
                        onClick={handleProfileUpload}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Upload Resume
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Loading profile...</p>
                )}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Category
                </label>
                <select
                  value={jobCategory}
                  onChange={(e) => {
                    setJobCategory(e.target.value);
                    setJobRole(jobRoles[e.target.value as keyof typeof jobRoles][0]);
                  }}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {jobCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Role
                </label>
                <select
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {jobRoles[jobCategory as keyof typeof jobRoles].map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-center mb-8">
              <label className="flex flex-col items-center justify-center w-64 h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF files only</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {file && (
              <div className="flex items-center justify-center gap-4 mb-8">
                <FileText className="text-gray-500" />
                <span className="text-gray-700">{file.name}</span>
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Analyze Resume'}
                </button>
              </div>
            )}
          </div>

          {result && (
            <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg p-8 mb-8">
              <div className="grid grid-cols-3 gap-8 mb-12">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4">Overall Score</h3>
                  <GaugeChart
                    id="overall-score"
                    nrOfLevels={20}
                    percent={getScoreValue(result.resume_score)}
                    textColor="#1f2937"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4">Resume Score</h3>
                  <GaugeChart
                    id="resume-score"
                    nrOfLevels={20}
                    percent={getScoreValue(result.resume_score)}
                    textColor="#1f2937"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-4">ATS Score</h3>
                  <GaugeChart
                    id="ats-score"
                    nrOfLevels={20}
                    percent={getScoreValue(result.ats_score)}
                    textColor="#1f2937"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Key Strengths</h3>
                  <ul className="space-y-2">
                    <li className="text-gray-500">See Full Report for details</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4">Areas for Improvement</h3>
                  <ul className="space-y-2">
                    <li className="text-gray-500">See Full Report for details</li>
                  </ul>
                </div>
              </div>

              {result && (
                <div className="mt-8">
                  <button
                    onClick={() => setShowReport(!showReport)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    {showReport ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    {showReport ? 'Hide Full Report' : 'Show Full Report'}
                  </button>
                  {showReport && formatReport(result)}
                </div>
              )}

              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="w-5 h-5" />
                  Download Analysis Report
                </button>
              </div>
            </div>
          )}

          <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Job Recommendations (Live)</h2>
            <div className="mb-4 flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter job title or keywords (e.g., Data Scientist)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handleJobSearch}
                disabled={jobLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {jobLoading ? 'Searching...' : 'Search Jobs'}
              </button>
            </div>
            {jobs.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Recommended Jobs</h3>
                <ul className="space-y-4">
                  {jobs.map((job, index) => (
                    <li key={index} className="border p-4 rounded-md">
                      <h4 className="font-medium">{job.title}</h4>
                      <p className="text-sm text-gray-600">Company: {job.company || 'N/A'}</p>
                      <p className="text-sm text-gray-600">Location: {job.location || 'N/A'}</p>
                      <p className="text-sm text-gray-600">Description: {job.description}</p>
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm">
                        View Job
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {jobs.length === 0 && !jobLoading && (
              <p className="text-gray-500">No job recommendations yet. Try searching!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IndividualDashboard;