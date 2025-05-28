import React, { useState, useEffect } from 'react';
import { Building2, GraduationCap, FileText, FileBarChart2, ChevronRight, Search, SortAsc, SortDesc, X, Loader2, LogOut, UserCircle, Download } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useNavigate } from 'react-router-dom';

// Configure PDF.js worker
const pdfjsWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

// Define types
interface Institution {
  id: string;
  name: string;
  studentCount: number;
}

interface Student {
  id: string;
  name: string;
  course: string;
  year: string;
  institution: string;
  resumeScore: number;
  resumeUrl: string;
  hasReport: boolean;
  analysisFilePath?: string;
}

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const [orgData, setOrgData] = useState<{ email: string; createdAt: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrgDetails = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('No authentication token found. Please log in.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/organizations/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch organization details');
        }
        const data = await response.json();
        setOrgData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchOrgDetails();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-96 relative p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X className="h-6 w-6" />
        </button>
        <div className="flex flex-col items-center">
          <UserCircle className="h-24 w-24 text-gray-700 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Organization Admin</h2>
          {loading && <p className="text-gray-600">Loading...</p>}
          {error && <p className="text-red-600">{error}</p>}
          {orgData && (
            <>
              <p className="text-gray-600 mb-4">{orgData.email}</p>
              <div className="w-full space-y-4">
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Organization Details</h3>
                  <p className="text-gray-600">Name: OrgDash Enterprise</p>
                  <p className="text-gray-600">License: Premium</p>
                  <p className="text-gray-600">
                    Registered: {new Date(orgData.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Role & Permissions</h3>
                  <p className="text-gray-600">Role: Administrator</p>
                  <p className="text-gray-600">Access Level: Full</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const OrgDash: React.FC = () => {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses] = useState<string[]>([
    'Computer Science and Engineering (CSE)',
    'CSE – Data Science (CSD)',
    'CSE – Artificial Intelligence and Machine Learning (CSM / AI & ML)',
    'Artificial Intelligence and Data Science (AI&DS)',
    'Information Technology (IT)',
    'Electronics and Communication Engineering (ECE)',
    'Electrical and Electronics Engineering (EEE)',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Biomedical Engineering',
    'Pharmaceutical Engineering'
  ]);
  const [years] = useState<string[]>(['1st', '2nd', '3rd', '4th']);
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [institutionSearchTerm, setInstitutionSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [sortBy, setSortBy] = useState<'analysisResumeScore' | null>('analysisResumeScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showProfile, setShowProfile] = useState(false);
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set());
  const [studentsWithReports, setStudentsWithReports] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const studentsPerPage = 8;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minSalary, setMinSalary] = useState<number | null>(10);
  const [maxSalary, setMaxSalary] = useState<number | null>(15);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [reportFilePath, setReportFilePath] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('No authentication token found. Please log in.');
        setLoading(false);
        return;
      }

      try {
        // Fetch institutions
        const instResponse = await fetch(`${import.meta.env.VITE_NODE_SERVER_URL}/organizations/institutions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!instResponse.ok) throw new Error('Failed to fetch institutions');
        const instData: Institution[] = await instResponse.json();
        setInstitutions(instData);

        // Fetch students with sorting parameters
        const params = new URLSearchParams({
          institutionId: selectedInstitution || '',
          search: studentSearchTerm,
          year: selectedYear,
          course: selectedCourse,
          sortBy: sortBy || 'analysisResumeScore',
          sortOrder: sortOrder || 'desc',
          page: currentPage.toString(),
          limit: studentsPerPage.toString(),
        });
        const stuResponse = await fetch(`${import.meta.env.VITE_NODE_SERVER_URL}/organizations/students?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!stuResponse.ok) throw new Error('Failed to fetch students');
        const stuData: { students: Student[]; totalPages: number } = await stuResponse.json();
        setStudents(stuData.students);
        setTotalPages(stuData.totalPages);

        // Update studentsWithReports based on hasReport
        const reportStudents = stuData.students
          .filter((student: Student) => student.hasReport)
          .map((student: Student) => student.id);
        setStudentsWithReports(new Set(reportStudents));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedInstitution, studentSearchTerm, selectedYear, selectedCourse, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [selectedYear, selectedCourse, studentSearchTerm, selectedInstitution]);

  const handleSortByScore = () => {
    setSortBy('analysisResumeScore');
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const handleGenerateReport = async (studentId: string) => {
    setGeneratingReports(prev => new Set([...prev, studentId]));
    try {
      const student = students.find(s => s.id === studentId);
      if (!student || minSalary === null || maxSalary === null) {
        setError('Please enter both minimum and maximum salary.');
        setGeneratingReports(prev => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
        return;
      }
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_FLASK_SERVER_URL}/report/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeFilePath: student.resumeUrl,
          min_salary: minSalary,
          max_salary: maxSalary
        }),
      });

      if (!response.ok) throw new Error('Failed to generate report');
      
      const reportFilePath = response.headers.get('X-Report-FilePath');
      if (!reportFilePath) {
        throw new Error('Report file path not provided by server');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      setReportUrl(url);
      setReportFilePath(reportFilePath);
      setStudentsWithReports(prev => new Set([...prev, studentId]));
      
      // Update student in backend to mark hasReport as true
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_NODE_SERVER_URL}/students/${studentId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hasReport: true, analysisFilePath: reportFilePath }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during report generation');
    } finally {
      setGeneratingReports(prev => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
      setLoading(false);
    }
  };

  const openPDFInNewTab = (url: string) => {
    const fullUrl = `${url}`;
    window.open(fullUrl, '_blank');
  };

  const openReport = () => {
    if (reportFilePath) {
      const fullUrl = `${reportFilePath}`;
      window.open(fullUrl, '_blank');
    } else {
      setError('No report available to view.');
    }
  };

  const filteredInstitutions = institutions.filter(institution =>
    institution.name.toLowerCase().includes(institutionSearchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      
      <nav className="bg-white shadow-lg border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">OrgDash</span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowProfile(true)}
                className="flex items-center text-gray-700 hover:text-gray-900"
              >
                <UserCircle className="h-6 w-6 mr-2" />
                <span>Profile</span>
              </button>
              <button
                className="flex items-center text-red-600 hover:text-red-700"
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  navigate('/');
                }}
              >
                <LogOut className="h-6 w-6 mr-2" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && <div className="text-center">Loading...</div>}
        {error && <div className="text-center text-red-600">{error}</div>}
        <div className="mb-6 flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Minimum Salary (LPA)</label>
            <input
              type="number"
              value={minSalary || ''}
              onChange={(e) => setMinSalary(parseFloat(e.target.value) || null)}
              className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Enter min salary (e.g., 10)"
              min="1"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Maximum Salary (LPA)</label>
            <input
              type="number"
              value={maxSalary || ''}
              onChange={(e) => setMaxSalary(parseFloat(e.target.value) || null)}
              className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Enter max salary (e.g., 15)"
              min="1"
              max="100"
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <div className="bg-white rounded-xl shadow-lg h-[calc(100vh-10rem)] overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Institutions</h2>
                <div className="relative">
                  <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search institutions..."
                    value={institutionSearchTerm}
                    onChange={(e) => setInstitutionSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="overflow-y-auto h-full p-4 space-y-2">
                <button
                  onClick={() => setSelectedInstitution(null)}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-200 ${
                    selectedInstitution === null
                      ? 'bg-indigo-50 text-indigo-700 shadow-inner'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <GraduationCap className="h-5 w-5 mr-3" />
                    <div>
                      <p className="font-medium">All Institutions</p>
                      <p className="text-sm text-gray-500">{students.length} students</p>
                    </div>
                  </div>
                </button>
                {filteredInstitutions.map(institution => (
                  <button
                    key={institution.id}
                    onClick={() => setSelectedInstitution(institution.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-200 ${
                      selectedInstitution === institution.id
                        ? 'bg-indigo-50 text-indigo-700 shadow-inner'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <GraduationCap className="h-5 w-5 mr-3" />
                      <div>
                        <p className="font-medium">{institution.name}</p>
                        <p className="text-sm text-gray-500">{institution.studentCount} students</p>
                      </div>
                    </div>
                    <ChevronRight className={`h-5 w-5 transition-transform duration-200 ${
                      selectedInstitution === institution.id ? 'transform rotate-90' : ''
                    }`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-9">
            <div className="bg-white rounded-xl shadow-lg h-[calc(100vh-10rem)] overflow-hidden flex flex-col">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedInstitution 
                      ? `Students - ${institutions.find(i => i.id === selectedInstitution)?.name || ''}`
                      : 'All Students'
                    }
                  </h2>
                </div>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Years</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year} Year</option>
                    ))}
                  </select>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Branches</option>
                    {courses.map(course => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSortByScore}
                    className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                  >
                    {sortOrder === 'desc' ? <SortDesc className="h-4 w-4 mr-2" /> : <SortAsc className="h-4 w-4 mr-2" />}
                    Sort by Score
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map(student => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.course}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.resumeScore}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openPDFInNewTab(student.resumeUrl)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            View Resume
                          </button>
                          {generatingReports.has(student.id) ? (
                            <button disabled className="text-gray-400 inline-flex items-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </button>
                          ) : studentsWithReports.has(student.id) ? (
                            <button
                              onClick={() => openReport()}
                              className="text-green-600 hover:text-green-900 mr-4"
                            >
                              View Report
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGenerateReport(student.id)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              Generate Report
                            </button>
                          )}
                          {student.analysisFilePath && (
                            <button
                              onClick={() => student.analysisFilePath && openPDFInNewTab(student.analysisFilePath)}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              View Analysis Report
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-gray-200 px-6 py-4 bg-white mt-auto">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, students.length)} of {students.length} results
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-md ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrgDash;