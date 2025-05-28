import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const { userType } = useParams<{ userType: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = userType === 'individual'
      ? `${import.meta.env.VITE_NODE_SERVER_URL}/individuals/login`
      : userType === 'institution'
      ? `${import.meta.env.VITE_NODE_SERVER_URL}/institutions/login`
      : `${import.meta.env.VITE_NODE_SERVER_URL}/organizations/login`;

      interface LoginResponse {
        token: string;
        user: Record<string, any>;
      }

      const response = await axios.post<LoginResponse>(endpoint, { email, password });
      const { token, user } = response.data;
      // Store token (e.g., in localStorage or context)
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      // Navigate to a dashboard or home page
      navigate(
        userType === 'individual' 
          ? '/individual/dashboard' 
          : userType === 'organization'
            ? '/organization/dashboard'
            : '/institution/dashboard'
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const images = {
    individual: 'https://cdn-icons-png.flaticon.com/512/4727/4727382.png',
    institution: 'https://cdn-icons-png.flaticon.com/512/21/21079.png',
    organization: 'https://cdn-icons-png.flaticon.com/512/3891/3891670.png'
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
              src={images[userType as keyof typeof images]}
              alt={userType}
              className="w-20 h-20 mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-800">
              Login as {userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : 'User'}
            </h2>
          </div>

          {error && <p className="text-red-500 text-center mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white rounded-md py-2 px-4 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Login
            </button>
          </form>

          {userType === 'individual' && (
            <p className="mt-4 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/individual/signup" className="text-indigo-600 hover:text-indigo-500">
                Sign up
              </Link>
            </p>
          )}

          <Link
            to="/user-selection"
            className="block mt-4 text-center text-sm text-gray-600 hover:text-gray-500"
          >
            Back to selection
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
