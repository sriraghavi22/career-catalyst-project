import React, { useState, useEffect } from 'react';
import { FileText, Search } from 'lucide-react';
import Sidebar from './Sidebar';

interface Student {
  _id: string;
  name: string;
  email: string;
  department: string;
  year: number;
  resumeFilePath?: string;
}

const Students = () => {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    'Pharmaceutical Engineering',
  ];
  const years = [1, 2, 3, 4];

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found. Please log in.');
          setStudents([]);
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_NODE_SERVER_URL}/individuals/students?year=${selectedYear}&department=${selectedDepartment}&search=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();
        if (data.success) {
          setStudents(data.data || []);
        } else {
          setError(data.message || 'Failed to fetch students');
          setStudents([]);
        }
      } catch (error) {
        console.error('Fetch error:', error);
        setError('An error occurred while fetching students');
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [selectedYear, selectedDepartment, searchQuery]);

  const viewResume = (resumeFilePath?: string) => {
    if (resumeFilePath) {
      // Construct the URL using the uploads folder and the resumeFilePath
      const resumeUrl = `${resumeFilePath}`;
      window.open(resumeUrl, '_blank');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <h1 className="ml-2 text-xl font-semibold text-gray-900">Students Directory</h1>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Students Directory</h2>
                  <div className="mt-4 sm:mt-0 flex space-x-4">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="all">All Years</option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          Year {year}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="all">All Departments</option>
                      {departments.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col">
                  <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                Name
                              </th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Department
                              </th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Year
                              </th>
                              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Resume
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {loading ? (
                              <tr>
                                <td colSpan={4} className="text-center py-4">Loading...</td>
                              </tr>
                            ) : error ? (
                              <tr>
                                <td colSpan={4} className="text-center py-4 text-red-500">{error}</td>
                              </tr>
                            ) : students.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="text-center py-4">No students found</td>
                              </tr>
                            ) : (
                              students.map((student) => (
                                <tr key={student._id}>
                                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                    {student.name}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {student.department}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {student.year}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    <button
                                      onClick={() => viewResume(student.resumeFilePath)}
                                      className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
                                      disabled={!student.resumeFilePath}
                                    >
                                      <FileText className="h-5 w-5 mr-2" />
                                      View Resume
                                    </button>
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
        </main>
      </div>
    </div>
  );
};

export default Students;
