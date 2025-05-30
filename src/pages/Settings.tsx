import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Application Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="form-checkbox" />
                  <span>Enable email notifications</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="form-checkbox" />
                  <span>Enable desktop notifications</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Theme Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Theme Mode</label>
                <select className="form-select block w-full">
                  <option>Light</option>
                  <option>Dark</option>
                  <option>System</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 