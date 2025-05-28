import React from 'react';
import { useNavigate } from 'react-router-dom';

interface UserTypeCard {
  type: string;
  image: string;
  title: string;
}

const userTypes: UserTypeCard[] = [
  {
    type: 'individual',
    image: 'https://cdn-icons-png.flaticon.com/512/4727/4727382.png',
    title: 'Individual'
  },
  {
    type: 'institution',
    image: 'https://cdn-icons-png.flaticon.com/512/21/21079.png',
    title: 'Institution'
  },
  {
    type: 'organization',
    image: 'https://cdn-icons-png.flaticon.com/512/3891/3891670.png',
    title: 'Organization'
  }
];

function UserSelection() {
  const navigate = useNavigate();

  const handleSelection = (type: string) => {
    navigate(`/${type}/login`);
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
      <div className="min-h-screen backdrop-blur-sm bg-white/30">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-3xl font-bold text-center mb-12 text-gray-800">Choose Your Account Type</h1>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {userTypes.map((user) => (
              <div
                key={user.type}
                onClick={() => handleSelection(user.type)}
                className="bg-white rounded-xl shadow-lg p-6 cursor-pointer transform transition-transform hover:scale-105 hover:shadow-xl"
              >
                <div className="flex flex-col items-center">
                  <img src={user.image} alt={user.title} className="w-24 h-24 mb-4" />
                  <h2 className="text-xl font-semibold text-gray-800">{user.title}</h2>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSelection;