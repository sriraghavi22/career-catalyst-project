import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, FileText, Download } from 'lucide-react';
import Sidebar from './Sidebar';

interface Job {
  _id: string;
  title: string;
  description: string;
  target_years: number[];
  target_departments: string[];
  created_at: string;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  department: string;
  year: number;
  resume_url?: string;
  created_at: string;
}

interface ResumeMatch {
  student_id: string;
  job_id: string;
  match_score: number;
  student: Student;
  job: Job;
}

const Jobs = () => {
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMatches, setShowMatches] = useState<string | null>(null);
  const [matches, setMatches] = useState<ResumeMatch[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [topN, setTopN] = useState<number>(10); // Default to top 10
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    target_years: [] as number[],
    target_departments: [] as string[]
  });
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: string]: boolean }>({});
  const [fetchingMatchesForJob, setFetchingMatchesForJob] = useState<string | null>(null);

  const years = [1, 2, 3, 4];
  const departments = [
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
  ];

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }
        const response = await fetch(`${import.meta.env.VITE_NODE_SERVER_URL}/institutions/api/jobs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch jobs (Status: ${response.status})`);
        }
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid response format: Expected an array of jobs');
        }
        setJobs(data.data);
        if (data.data.length === 0) {
          setError('No jobs found. Try creating a new job.');
        }
      } catch (error: any) {
        console.error('Error fetching jobs:', error);
        setError(error.message || 'An error occurred while fetching jobs. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const fetchMatches = async (jobId: string) => {
    setFetchingMatchesForJob(jobId);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      const response = await fetch(`${import.meta.env.VITE_NODE_SERVER_URL}/institutions/api/jobs/${jobId}/matches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch matches');
      }
      const data = await response.json();
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format: Expected an array of matches');
      }
      setMatches(data.data.sort((a: ResumeMatch, b: ResumeMatch) => 
        sortOrder === 'desc' ? b.match_score - a.match_score : a.match_score - b.match_score
      ));
      setShowMatches(jobId);
    } catch (error: any) {
      console.error('Error fetching matches:', error);
      alert(error.message || 'Failed to fetch matches');
    } finally {
      setFetchingMatchesForJob(null);
    }
  };

  const handleYearChange = (year: number) => {
    setNewJob({
      ...newJob,
      target_years: newJob.target_years.includes(year)
        ? newJob.target_years.filter(y => y !== year)
        : [...newJob.target_years, year]
    });
  };

  const handleDepartmentChange = (department: string) => {
    setNewJob({
      ...newJob,
      target_departments: newJob.target_departments.includes(department)
        ? newJob.target_departments.filter(d => d !== department)
        : [...newJob.target_departments, department]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      if (newJob.target_years.length === 0 || newJob.target_departments.length === 0) {
        alert('Please select at least one year and one department');
        return;
      }
      const response = await fetch(`${import.meta.env.VITE_NODE_SERVER_URL}/institutions/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newJob.title,
          description: newJob.description,
          target_years: newJob.target_years,
          target_departments: newJob.target_departments
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create job');
      }
      const newJobData = await response.json();
      setJobs([...jobs, newJobData.data]);
      setShowNewJobModal(false);
      setNewJob({
        title: '',
        description: '',
        target_years: [],
        target_departments: []
      });
      setError(null); // Clear any "No jobs found" error
    } catch (error: any) {
      console.error('Error creating job:', error);
      alert(error.message || 'Failed to create job');
    }
  };

  const handleDelete = async (jobId: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');
        const response = await fetch(`${import.meta.env.VITE_NODE_SERVER_URL}/institutions/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete job');
        }
        setJobs(jobs.filter(job => job._id !== jobId));
        if (showMatches === jobId) {
          setShowMatches(null);
          setMatches([]);
        }
        if (jobs.length === 1) {
          setError('No jobs found. Try creating a new job.');
        }
      } catch (error: any) {
        console.error('Error deleting job:', error);
        alert(error.message || 'Failed to delete job');
      }
    }
  };

  const handleSortChange = (order: 'asc' | 'desc') => {
    setSortOrder(order);
    setMatches([...matches].sort((a, b) => 
      order === 'desc' ? b.match_score - a.match_score : a.match_score - b.match_score
    ));
  };

  const handleTopNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (value >= 1) {
      setTopN(value);
    }
  };

  const toggleDescription = (jobId: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  const truncateDescription = (description: string, jobId: string) => {
    const lines = description.split('\n');
    if (lines.length <= 5 || expandedDescriptions[jobId]) {
      return description;
    }
    return lines.slice(0, 5).join('\n') + '...';
  };

  const downloadCSV = (job: Job) => {
  const sanitizeField = (field: string) => {
    // Replace en dash (–) with hyphen (-) and escape quotes
    const sanitized = field.replace(/–/g, '-').replace(/"/g, '""');
    // Wrap in quotes if it contains commas, newlines, or quotes
    return /[,\n"]/.test(sanitized) ? `"${sanitized}"` : sanitized;
  };

    const csvRows = [
      ['Student Name', 'Email', 'Department', 'Year', 'Match Score'].map(sanitizeField).join(','),
      ...matches.slice(0, topN).map(match => 
        [
          sanitizeField(match.student.name),
          sanitizeField(match.student.email),
          sanitizeField(match.student.department),
          match.student.year.toString(),
          Math.round(match.match_score).toString()
        ].join(',')
      )
    ];

    // Add UTF-8 BOM to ensure proper encoding
    const csvContent = `\uFEFF${csvRows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `top_matches_${job.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <h1 className="ml-2 text-xl font-semibold text-gray-900">Job Listings</h1>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Job Listings</h2>
                  <button
                    onClick={() => setShowNewJobModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    New Job
                  </button>
                </div>

                <div className="mt-8">
                  <div className="flex flex-col">
                    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                      <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                          <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                  Job Title
                                </th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                  Description
                                </th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                  Target Years
                                </th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                  Target Departments
                                </th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {loading ? (
                                <tr>
                                  <td colSpan={5} className="text-center py-4">Loading...</td>
                                </tr>
                              ) : error ? (
                                <tr>
                                  <td colSpan={5} className="text-center py-4 text-red-600">{error}</td>
                                </tr>
                              ) : jobs.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="text-center py-4">No jobs found. Try creating a new job.</td>
                                </tr>
                              ) : (
                                jobs.map((job) => (
                                  <React.Fragment key={job._id}>
                                    <tr>
                                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                        {job.title}
                                      </td>
                                      <td className="px-3 py-4 text-sm text-gray-500">
                                        <div className="whitespace-pre-wrap">
                                          {truncateDescription(job.description, job._id)}
                                        </div>
                                        {job.description.split('\n').length > 5 && (
                                          <button
                                            onClick={() => toggleDescription(job._id)}
                                            className="text-indigo-600 hover:text-indigo-900 mt-1 text-sm"
                                          >
                                            {expandedDescriptions[job._id] ? 'Read Less' : 'Read More'}
                                          </button>
                                        )}
                                      </td>
                                      <td className="px-3 py-4 text-sm text-gray-500">
                                        {job.target_years.join(', ')}
                                      </td>
                                      <td className="px-3 py-4 text-sm text-gray-500">
                                        {job.target_departments.join(', ')}
                                      </td>
                                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        <button
                                          onClick={() => fetchMatches(job._id)}
                                          className="text-indigo-600 hover:text-indigo-900 mr-2"
                                          disabled={fetchingMatchesForJob === job._id}
                                        >
                                          {fetchingMatchesForJob === job._id ? 'Loading...' : 'View Matches'}
                                        </button>
                                        <button
                                          onClick={() => handleDelete(job._id)}
                                          className="text-red-600 hover:text-red-900"
                                        >
                                          <Trash2 className="h-5 w-5" />
                                        </button>
                                      </td>
                                    </tr>
                                    {fetchingMatchesForJob === job._id && (
                                      <tr>
                                        <td colSpan={5} className="px-6 py-4">
                                          <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="text-center py-4">
                                              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                                              <p className="mt-2 text-sm text-gray-500">Fetching matches...</p>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                    {showMatches === job._id && fetchingMatchesForJob !== job._id && (
                                      <tr>
                                        <td colSpan={5} className="px-6 py-4">
                                          <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="flex justify-between items-center mb-4">
                                              <h3 className="text-lg font-medium">Top Matching Students</h3>
                                              <div className="flex items-center space-x-4">
                                                <div className="flex items-center">
                                                  <label htmlFor={`topN-${job._id}`} className="mr-2 text-sm font-medium text-gray-700">Show Top:</label>
                                                  <input
                                                    type="number"
                                                    id={`topN-${job._id}`}
                                                    value={topN}
                                                    onChange={handleTopNChange}
                                                    min="1"
                                                    className="border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm w-20"
                                                  />
                                                </div>
                                                <div className="flex items-center">
                                                  <label htmlFor={`sortOrder-${job._id}`} className="mr-2 text-sm font-medium text-gray-700">Sort by Score:</label>
                                                  <select
                                                    id={`sortOrder-${job._id}`}
                                                    value={sortOrder}
                                                    onChange={(e) => handleSortChange(e.target.value as 'asc' | 'desc')}
                                                    className="border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                  >
                                                    <option value="desc">High to Low</option>
                                                    <option value="asc">Low to High</option>
                                                  </select>
                                                </div>
                                                <button
                                                  onClick={() => downloadCSV(job)}
                                                  className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                >
                                                  <Download className="h-4 w-4 mr-1" />
                                                  Download CSV
                                                </button>
                                                <button
                                                  onClick={() => setShowMatches(null)}
                                                  className="ml-4 text-gray-400 hover:text-gray-500"
                                                >
                                                  <X className="h-5 w-5" />
                                                </button>
                                              </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                              <table className="min-w-full divide-y divide-gray-200">
                                                <thead>
                                                  <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                      Student Name
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                      Email
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                      Department
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                      Year
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                      Match Score
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                      Resume
                                                    </th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                  {matches.length === 0 ? (
                                                    <tr>
                                                      <td colSpan={6} className="text-center py-4 text-gray-500">
                                                        No matching students found.
                                                      </td>
                                                    </tr>
                                                  ) : (
                                                    matches.slice(0, topN).map((match) => (
                                                      <tr key={match.student_id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                          {match.student.name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                          {match.student.email}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                          {match.student.department}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                          {match.student.year}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                          {Math.round(match.match_score)}%
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                          <a
                                                            href={match.student.resume_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                                          >
                                                            <FileText className="h-5 w-5 mr-1" />
                                                            View Resume
                                                          </a>
                                                        </td>
                                                      </tr>
                                                    ))
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {showNewJobModal && (
              <div className="fixed z-10 inset-0 overflow-y-auto">
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                  <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                    <form onSubmit={handleSubmit}>
                      <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Create New Job</h3>
                        <div className="mt-4 space-y-4">
                          <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                              Job Title
                            </label>
                            <input
                              type="text"
                              id="title"
                              value={newJob.title}
                              onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                              Description
                            </label>
                            <textarea
                              id="description"
                              value={newJob.description}
                              onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                              rows={3}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Target Years
                            </label>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {years.map((year) => (
                                <label key={year} className="inline-flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={newJob.target_years.includes(year)}
                                    onChange={() => handleYearChange(year)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">Year {year}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Target Departments
                            </label>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {departments.map((department) => (
                                <label key={department} className="inline-flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={newJob.target_departments.includes(department)}
                                    onChange={() => handleDepartmentChange(department)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">{department}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                        <button
                          type="submit"
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                        >
                          Create
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNewJobModal(false)}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Jobs;