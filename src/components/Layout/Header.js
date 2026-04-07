import React from 'react';
import { Bell, Settings, User, Search, Calendar, BarChart3 } from 'lucide-react';

const Header = ({ backendStatus }) => {
  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <BarChart3 className="text-blue-400 mr-2" size={24} />
          <span className="text-white font-semibold">Development Dashboard</span>
        </div>
        <div className="hidden md:flex items-center bg-gray-700 rounded-lg px-3 py-2">
          <Search className="text-gray-400 mr-2" size={16} />
          <input 
            type="text" 
            placeholder="Search countries, indicators..." 
            className="bg-transparent text-white text-sm outline-none placeholder-gray-400 w-64"
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center text-gray-300 text-sm">
          <Calendar className="mr-2" size={16} />
          <span>Today: {getCurrentDate()}</span>
        </div>
        
        <button className="relative p-2 text-gray-300 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            2
          </span>
        </button>
        
        <button className="p-2 text-gray-300 hover:text-white transition-colors">
          <Settings size={20} />
        </button>
        
        <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors">
          <User size={16} />
          <span className="text-white text-sm hidden md:inline">Dashboard</span>
        </button>
      </div>
    </header>
  );
};

export default Header;