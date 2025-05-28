import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [college, setCollege] = useState('');
  const [year, setYear] = useState('');
  const [department, setDepartment] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [institutions, setInstitutions] = useState<{ _id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch institutions on component mount
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await axios.get<{ _id: string; name: string }[]>(`${import.meta.env.VITE_NODE_SERVER_URL}/institutions/institutions`);
        setInstitutions(response.data);
      } catch (err) {
        setError('Failed to fetch institutions');
      }
    };
    fetchInstitutions();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('college', college); // Send the selected institution ID
    formData.append('year', year);
    formData.append('department', department);
    if (resume) {
      formData.append('resume', resume);
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_NODE_SERVER_URL}/individuals/register`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.status === 201) {
        navigate('/individual/login');
      }
    } catch (err) {
      setError((err as any).response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: 'url("https://c8.alamy.com/comp/2R6HCYB/a-blue-colour-based-abstract-wave-background-vector-object-2R6HCYB.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="min-h-screen backdrop-blur-sm bg-white/30 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-6">
            <img
              src="https://cdn-icons-png.flaticon.com/512/4727/4727382.png"
              alt="Individual"
              className="w-20 h-20 mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-800">Sign Up</h2>
          </div>

          {error && <p className="text-red-500 text-center mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="college" className="block text-sm font-medium text-gray-700">
                College
              </label>
              <select
                id="college"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              >
                <option value="">Select College</option>
                {institutions.map((inst) => (
                  <option key={inst._id} value={inst._id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                Year
              </label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              >
                <option value="">Select Year</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <select
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              >
                <option value="">Select Department</option>
                <option value="Computer Science and Engineering (CSE)">Computer Science and Engineering (CSE)</option>
                <option value="CSE – Data Science (CSD)">CSE – Data Science (CSD)</option>
                <option value="CSE – Artificial Intelligence and Machine Learning (CSM / AI & ML)">CSE – Artificial Intelligence and Machine Learning (CSM / AI & ML)</option>
                <option value="Artificial Intelligence and Data Science (AI&DS)">Artificial Intelligence and Data Science (AI&DS)</option>
                <option value="Information Technology (IT)">Information Technology (IT)</option>
                <option value="Electronics and Communication Engineering (ECE)">Electronics and Communication Engineering (ECE)</option>
                <option value="Electrical and Electronics Engineering (EEE)">Electrical and Electronics Engineering (EEE)</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Chemical Engineering">Chemical Engineering</option>
                <option value="Biomedical Engineering">Biomedical Engineering</option>
                <option value="Pharmaceutical Engineering">Pharmaceutical Engineering</option>
              </select>
            </div>

            <div>
              <label htmlFor="resume" className="block text-sm font-medium text-gray-700">
                Resume (PDF)
              </label>
              <input
                type="file"
                id="resume"
                accept="application/pdf"
                onChange={(e) => setResume(e.target.files ? e.target.files[0] : null)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white rounded-md py-2 px-4 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Sign Up
            </button>
          </form>

          <Link
            to="/individual/login"
            className="block mt-4 text-center text-sm text-gray-600 hover:text-gray-500"
          >
            Already have an account? Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
