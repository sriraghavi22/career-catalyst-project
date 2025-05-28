import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Link as ScrollLink } from 'react-scroll';
import { Home, Info, Phone, ArrowRight, Mail, MapPin, PhoneCall, LogIn } from 'lucide-react';

function HomePage() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/user-selection');
  };

  const handleLogin = () => {
    navigate('/user-selection');
  };

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="bg-white/90 backdrop-blur-sm fixed w-full z-10 shadow-lg">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and Brand Name */}
            <div className="flex items-center">
              <img 
                src="https://www.shutterstock.com/image-illustration/people-logo-3-persons-260nw-307832234.jpg" 
                alt="Logo" 
                className="h-10 w-10 object-contain" 
              />
              <span className="ml-3 text-xl font-bold text-gray-800">CareerCatalyst</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <NavLink 
                to="home" 
                icon={<Home size={18} />} 
                text="Home" 
              />
              <NavLink 
                to="about" 
                icon={<Info size={18} />} 
                text="About" 
              />
              <NavLink 
                to="contact" 
                icon={<Phone size={18} />} 
                text="Contact" 
              />
              <button
                onClick={handleLogin}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <LogIn size={18} />
                <span>Login</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="min-h-screen bg-cover bg-center" style={{ backgroundImage: 'url(https://www.shutterstock.com/image-photo/career-acceleration-concept-personal-development-260nw-435949057.jpg)' }}>
        {/* Hero Section */}
        <section id="home" className="min-h-screen pt-20">
          <div className="container mx-auto px-6 py-20">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="md:w-1/2 text-white">
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  Transform Your Career Journey
                </h1>
                <p className="text-xl mb-8">
                  Connecting students, institutions, and organizations in one powerful platform.
                  Your gateway to endless opportunities.
                </p>
                <p className="text-lg mb-8">
                  Upload your resume, match with dream jobs, and let AI power your career growth.
                </p>
                <button
                  onClick={handleGetStarted}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition text-lg"
                >
                  <span>Get Started</span>
                  <ArrowRight size={20} />
                </button>
              </div>
              <div className="md:w-1/2 mt-10 md:mt-0">
                <img 
                  src="https://thumbs.dreamstime.com/b/teamwork-concept-team-building-team-metaphor-together-concept-vector-illustration-flat-cartoon-character-graphic-design-teamwork-141427385.jpg"
                  alt="Team Illustration"
                  className="rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="min-h-screen bg-white/90 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-20">
            <h2 className="text-4xl font-bold text-center mb-12">Our Interfaces</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <InterfaceCard
                title="For Students"
                description="Upload your resume and get matched with the perfect job opportunities. Let our AI-powered system highlight your strengths."
                imageUrl="https://cdn-icons-png.flaticon.com/512/4727/4727382.png"
              />
              <InterfaceCard
                title="For Institutions"
                description="Match student profiles with job requirements efficiently. Find the perfect candidates for your positions."
                imageUrl="https://cdn-icons-png.flaticon.com/512/21/21079.png"
              />
              <InterfaceCard
                title="For Organizations"
                description="Access comprehensive candidate data through LinkedIn integration and smart resume parsing."
                imageUrl="https://cdn-icons-png.flaticon.com/512/3891/3891670.png"
              />
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="min-h-screen bg-gray-900/90 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-20">
            <h2 className="text-4xl font-bold text-center text-white mb-12">Contact Us</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <ContactCard
                icon={<PhoneCall className="w-8 h-8 text-blue-500" />}
                title="Phone"
                details={['+1 (555) 123-4567', '+1 (555) 987-6543']}
              />
              <ContactCard
                icon={<Mail className="w-8 h-8 text-blue-500" />}
                title="Email"
                details={['info@careercatalyst.com', 'support@careercatalyst.com']}
              />
              <ContactCard
                icon={<MapPin className="w-8 h-8 text-blue-500" />}
                title="Address"
                details={['123 Innovation Drive', 'Silicon Valley, CA 94025']}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function NavLink({ to, icon, text }: { to: string; icon: React.ReactNode; text: string }) {
  return (
    <ScrollLink
      to={to}
      smooth={true}
      duration={500}
      className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 cursor-pointer transition"
    >
      {icon}
      <span>{text}</span>
    </ScrollLink>
  );
}

function InterfaceCard({ title, description, imageUrl }: { title: string; description: string; imageUrl: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition">
      <div className="flex justify-center mb-6">
        <img src={imageUrl} alt={title} className="w-24 h-24 object-contain" />
      </div>
      <h3 className="text-xl font-bold mb-4 text-center">{title}</h3>
      <p className="text-gray-600 text-center">{description}</p>
    </div>
  );
}

function ContactCard({ icon, title, details }: { icon: React.ReactNode; title: string; details: string[] }) {
  return (
    <div className="bg-white p-8 rounded-lg shadow-lg text-center">
      <div className="flex justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      {details.map((detail, index) => (
        <p key={index} className="text-gray-600">{detail}</p>
      ))}
    </div>
  );
}

export default HomePage;