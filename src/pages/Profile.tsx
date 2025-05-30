import React from 'react';

const Profile: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gray-300 rounded-full"></div>
            <div>
              <h2 className="text-xl font-semibold">John Doe</h2>
              <p className="text-gray-600 dark:text-gray-400">Software Developer</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                className="form-input block w-full"
                defaultValue="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                className="form-input block w-full"
                defaultValue="john.doe@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                className="form-textarea block w-full"
                rows={4}
                defaultValue="Software developer with a passion for creating efficient and user-friendly applications."
              />
            </div>
          </div>

          <div className="pt-4">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              Update Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 