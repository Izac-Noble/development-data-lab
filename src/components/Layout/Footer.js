import React from 'react';
import { Download, RefreshCw } from 'lucide-react';

const Footer = ({ backendStatus }) => {
  // Simple refresh function
  const handleRefresh = () => {
    window.location.reload();
  };

  // Simple export function (placeholder)
  const handleExport = () => {
    alert('Export functionality - Coming soon!');
  };

  // Determine status color and text
  const getStatusInfo = () => {
    switch (backendStatus) {
      case 'connected':
        return { color: 'bg-green-500', text: 'Connected' };
      case 'disconnected':
        return { color: 'bg-red-500', text: 'Disconnected' };
      case 'checking':
        return { color: 'bg-yellow-500', text: 'Checking...' };
      default:
        return { color: 'bg-gray-500', text: 'Unknown' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <footer className="bg-gray-800 border-t border-gray-700 px-6 py-4">
      <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
        <div className="flex items-center space-x-6 text-sm text-gray-400">
          <span>© 2025 Development Dashboard</span>
          <span className="hidden md:inline">|</span>
          <div className="flex items-center space-x-4">
            <button className="hover:text-white transition-colors">
              Privacy Policy
            </button>
            <button className="hover:text-white transition-colors">
              Terms of Service
            </button>
            <button className="hover:text-white transition-colors">
              Data Sources
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-gray-400">
            <div className={`w-2 h-2 rounded-full mr-2 ${statusInfo.color}`}></div>
            <span>Backend Status: {statusInfo.text}</span>
          </div>
          
          <button 
            onClick={handleExport}
            className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <Download size={14} />
            <span>Export Report</span>
          </button>
          
          <button 
            onClick={handleRefresh}
            className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw size={14} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;