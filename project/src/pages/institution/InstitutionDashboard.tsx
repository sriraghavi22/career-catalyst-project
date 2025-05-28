import React, { useState, useEffect } from 'react';
import { Users, Briefcase, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const InstitutionDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeJobs: 0,
  });
  interface Match {
    student_id: string;
    job_id: string;
    match_score: number;
    student: {
      name: string;
      department: string;
    };
    job: {
      title: string;
    };
  }
  
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('desc');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');

        // Fetch students
        const studentsResponse = await fetch(`${import.meta.env.VITE_NODE_SERVER_URL}/individuals/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!studentsResponse.ok) throw new Error('Failed to fetch students');
        const studentsData = await studentsResponse.json();
        if (!studentsData.success) throw new Error(studentsData.message || 'Failed to fetch students');

        // Fetch jobs
        const jobsResponse = await fetch(`${import.meta.env.VITE_NODE_SERVER_URL}/institutions/api/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!jobsResponse.ok) throw new Error('Failed to fetch jobs');
        const jobsData = await jobsResponse.json();

        // Fetch matches for all jobs
        interface Job {
          _id: string;
        }

        interface MatchData {
          data: Match[];
        }

        const matchesPromises: Promise<Match[]>[] = jobsData.data.map(async (job: Job) => {
          const matchesResponse: Response = await fetch(`${import.meta.env.VITE_NODE_SERVER_URL}/institutions/api/jobs/${job._id}/matches`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!matchesResponse.ok) throw new Error(`Failed to fetch matches for job ${job._id}`);
          const matchesData: MatchData = await matchesResponse.json();
          return matchesData.data;
        });
        const matchesArrays = await Promise.all(matchesPromises);
        const allMatches = matchesArrays.flat();

        setStats({
          totalStudents: studentsData.data.length,
          activeJobs: jobsData.data.length,
        });
        setRecentMatches(
          allMatches
            .sort((a, b) => (sortOrder === 'desc' ? b.match_score - a.match_score : a.match_score - b.match_score))
            .slice(0, 5)
        );
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, [sortOrder]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleSortChange = (order: 'asc' | 'desc'): void => {
    setSortOrder(order);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <h1 className="ml-2 text-xl font-semibold text-gray-900">Institution Dashboard</h1>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Students</dt>
                        <dd className="text-3xl font-semibold text-gray-900">{stats.totalStudents}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Briefcase className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Jobs</dt>
                        <dd className="text-3xl font-semibold text-gray-900">{stats.activeJobs}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Job Matches</h3>
                  <div>
                    <label htmlFor="sortOrder" className="mr-2 text-sm font-medium text-gray-700">
                      Sort by Score:
                    </label>
                    <select
                      id="sortOrder"
                      value={sortOrder}
                      onChange={(e) => handleSortChange(e.target.value as 'asc' | 'desc')}
                      className="border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="desc">High to Low</option>
                      <option value="asc">Low to High</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex flex-col">
                    <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                      <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Student
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Job Title
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Match Score
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {loading ? (
                                <tr>
                                  <td colSpan={3} className="text-center py-4">
                                    Loading...
                                  </td>
                                </tr>
                              ) : recentMatches.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="text-center py-4">
                                    No matches found
                                  </td>
                                </tr>
                              ) : (
                                recentMatches.map((match) => (
                                  <tr key={`${match.student_id}-${match.job_id}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900">{match.student.name}</div>
                                      <div className="text-sm text-gray-500">{match.student.department}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{match.job.title}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{Math.round(match.match_score)}%</div>
                                    </td>
                                  </tr>
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default InstitutionDashboard;
