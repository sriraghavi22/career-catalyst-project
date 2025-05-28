import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import UserSelection from './pages/UserSelection';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import IndividualDashboard from './pages/individualDashboard';
import OrgDash from './pages/OrganisationDashboard';
import InstitutionDashboard from './pages/institution/InstitutionDashboard';
import Students from './pages/institution/Students';
import Jobs from './pages/institution/Jobs';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/user-selection" element={<UserSelection />} />
        <Route path="/:userType/login" element={<Login />} />
        <Route path="/individual/signup" element={<SignUp />} />
        <Route path="/individual/dashboard" element={<IndividualDashboard />} />
        <Route path="/organization/dashboard" element={<OrgDash />} />
        <Route path="/institution/dashboard" element={<InstitutionDashboard />} />
        <Route path="/institution/students" element={<Students />} />
        <Route path="/institution/jobs" element={<Jobs />} />
        {/* Uncomment these when the pages are ready */}
        {/* <Route path="/about" element={<div className="pt-20">About Page Coming Soon</div>} /> */}
        {/* <Route path="/contact" element={<div className="pt-20">Contact Page Coming Soon</div>} /> */}
        {/* Uncomment these when the pages are ready */}
        {/* Uncomment these when About and Contact pages are ready */}
        {/* <Route path="/about" element={<div className="pt-20">About Page Coming Soon</div>} /> */}
        {/* <Route path="/contact" element={<div className="pt-20">Contact Page Coming Soon</div>} /> */}
      </Routes>
    </Router>
  );
}

export default App;