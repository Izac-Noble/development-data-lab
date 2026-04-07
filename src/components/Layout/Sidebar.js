import React from 'react';
import { Home, Map, Upload, BarChart3, Globe, TrendingUp } from 'lucide-react';

const Sidebar = ({ activeSection, setActiveSection }) => {
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, description: 'Overview & Stats' },
    { id: 'maps', label: 'Maps', icon: Map, description: 'Geographic View' },
    { id: 'compare', label: 'Compare', icon: BarChart3, description: 'Country Comparison' },
    { id: 'upload', label: 'Data Sources', icon: Upload, description: 'Manage Data' },
  ];

  return (
    <div className="w-64 bg-gray-900 shadow-lg border-r border-gray-700">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center">
          <Globe className="text-blue-400 mr-3" size={28} />
          <div>
            <h1 className="text-xl font-bold text-white">DevDash</h1>
            <p className="text-gray-400 text-sm">Development Dashboard</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="mt-6">
        <div className="px-6 mb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Navigation
          </h2>
        </div>
        
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center px-6 py-3 text-left transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-600 text-white border-r-2 border-blue-400'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon 
                className={`mr-3 transition-colors ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`} 
                size={20} 
              />
              <div className="flex-1">
                <div className="font-medium">{item.label}</div>
                <div className={`text-xs ${
                  isActive ? 'text-blue-100' : 'text-gray-500 group-hover:text-gray-400'
                }`}>
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 text-center">
          <p>Global Development Data</p>
          <p className="text-gray-500">Multiple Sources</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;