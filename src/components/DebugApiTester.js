import React, { useState } from 'react';
import { useApi, buildApiUrl } from '../services/api';
import CountryInfoTable from './Tables/CountryInfoTable';
import EducationDataTable from './Tables/EducationDataTable';
import HealthDataTable from './Tables/HealthDataTable';
import EconomicDataTable from './Tables/EconomicDataTable';
import { Table, Code, RefreshCw, Globe, CheckCircle, XCircle, Loader, Zap, Database } from 'lucide-react';

const DebugApiTester = () => {
  const [selectedCountry, setSelectedCountry] = useState('UGA');
  const [selectedApi, setSelectedApi] = useState('countryInfo');
  const [viewMode, setViewMode] = useState('table');
  
  // Builds the URL based on selection
  const getTestUrl = () => {
    switch (selectedApi) {
      case 'countryInfo':
        return buildApiUrl.countryInfo(selectedCountry);
      case 'unesco':
        return buildApiUrl.unesco(selectedCountry, ['CR.1']);
      case 'who':
        return buildApiUrl.who(selectedCountry);
      case 'worldBank':
        return buildApiUrl.worldBank(selectedCountry, 'SP.POP.TOTL');
      default:
        return '';
    }
  };

  const testUrl = getTestUrl();
  const { data, loading, error, refetch } = useApi(testUrl);

  const apiOptions = [
    { 
      value: 'countryInfo', 
      label: 'Country Info',
      subtitle: 'REST Countries API',
      icon: Globe,
      color: 'blue'
    },
    { 
      value: 'unesco', 
      label: 'Education Data',
      subtitle: 'UNESCO Statistics',
      icon: Database,
      color: 'indigo'
    },
    { 
      value: 'who', 
      label: 'Health Data',
      subtitle: 'World Health Organization',
      icon: Zap,
      color: 'red'
    },
    { 
      value: 'worldBank', 
      label: 'Economic Data',
      subtitle: 'World Bank API',
      icon: Database,
      color: 'green'
    }
  ];

  const countryOptions = [
    { code: 'UGA', name: 'Uganda', flag: '🇺🇬' },
    { code: 'USA', name: 'United States', flag: '🇺🇸' },
    { code: 'GBR', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'KEN', name: 'Kenya', flag: '🇰🇪' },
    { code: 'DEU', name: 'Germany', flag: '🇩🇪' },
    { code: 'JPN', name: 'Japan', flag: '🇯🇵' },
    { code: 'FRA', name: 'France', flag: '🇫🇷' },
    { code: 'BRA', name: 'Brazil', flag: '🇧🇷' },
    { code: 'IND', name: 'India', flag: '🇮🇳' },
    { code: 'AUS', name: 'Australia', flag: '🇦🇺' },
    { code: 'CAN', name: 'Canada', flag: '🇨🇦' },
    { code: 'ZAF', name: 'South Africa', flag: '🇿🇦' },
    { code: 'NGA', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'EGY', name: 'Egypt', flag: '🇪🇬' },
    { code: 'TZA', name: 'Tanzania', flag: '🇹🇿' }
  ];

  const selectedApiData = apiOptions.find(api => api.value === selectedApi);
  const selectedCountryData = countryOptions.find(c => c.code === selectedCountry);

  // This Renders table based on API type
  const renderTableView = () => {
    if (!data) return null;

    switch (selectedApi) {
      case 'countryInfo':
        return <CountryInfoTable data={data} />;
      case 'unesco':
        return <EducationDataTable data={data} />;
      case 'who':
        return <HealthDataTable data={data} />;
      case 'worldBank':
        return <EconomicDataTable data={data} />;
      default:
        return null;
    }
  };

  // Gets status color
  const getStatusColor = () => {
    if (loading) return 'yellow';
    if (error) return 'red';
    if (data) return 'green';
    return 'gray';
  };

  const statusColor = getStatusColor();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6 border border-blue-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center">
              <Database className="mr-3 text-blue-400" size={32} />
              API Debug Tester
            </h2>
            <p className="text-blue-200">Test and explore development data APIs in real-time</p>
          </div>
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            statusColor === 'green' ? 'bg-green-900 border border-green-600' :
            statusColor === 'red' ? 'bg-red-900 border border-red-600' :
            statusColor === 'yellow' ? 'bg-yellow-900 border border-yellow-600' :
            'bg-gray-800 border border-gray-600'
          }`}>
            {loading && <Loader className="text-yellow-400 animate-spin" size={18} />}
            {!loading && error && <XCircle className="text-red-400" size={18} />}
            {!loading && !error && data && <CheckCircle className="text-green-400" size={18} />}
            <span className="text-sm font-medium text-white">
              {loading ? 'Loading...' : error ? 'Error' : data ? 'Success' : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* API Selection Cards */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Select Data Source</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {apiOptions.map((api) => {
            const Icon = api.icon;
            const isSelected = selectedApi === api.value;
            return (
              <button
                key={api.value}
                onClick={() => setSelectedApi(api.value)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? `border-${api.color}-500 bg-${api.color}-900/30`
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <Icon className={isSelected ? `text-${api.color}-400` : 'text-gray-400'} size={24} />
                  {isSelected && (
                    <CheckCircle className={`text-${api.color}-400`} size={18} />
                  )}
                </div>
                <h4 className="text-white font-semibold mb-1">{api.label}</h4>
                <p className="text-xs text-gray-400">{api.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Country Selection */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">Select Country</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {countryOptions.map((country) => (
            <button
              key={country.code}
              onClick={() => setSelectedCountry(country.code)}
              className={`p-3 rounded-lg border transition-all text-left ${
                selectedCountry === country.code
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{country.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{country.name}</p>
                  <p className="text-xs text-gray-400">{country.code}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Selection & Test Button */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Testing Configuration</h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Country:</span>
                <span className="px-3 py-1 bg-blue-900 text-blue-300 rounded text-sm font-medium">
                  {selectedCountryData?.flag} {selectedCountryData?.name}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">API:</span>
                <span className="px-3 py-1 bg-purple-900 text-purple-300 rounded text-sm font-medium">
                  {selectedApiData?.label}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Endpoint URL:</p>
              <code className="text-xs text-green-400 bg-gray-900 px-3 py-2 rounded block overflow-x-auto">
                {testUrl}
              </code>
            </div>
          </div>
          
          <button
            onClick={refetch}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
            <span>{loading ? 'Testing...' : 'Test API Call'}</span>
          </button>
        </div>
      </div>

      {/* Results Section */}
      {(data || error || loading) && (
        <div className="space-y-4">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white">Results</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  viewMode === 'table' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Table size={16} />
                <span className="text-sm font-medium">Table View</span>
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  viewMode === 'json' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Code size={16} />
                <span className="text-sm font-medium">JSON View</span>
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <XCircle className="text-red-400 flex-shrink-0 mt-1" size={24} />
                <div className="flex-1">
                  <h4 className="text-red-400 font-semibold text-lg mb-2">API Request Failed</h4>
                  <p className="text-red-300 text-sm mb-4">{error}</p>
                  
                  <div className="bg-red-950 rounded-lg p-4 border border-red-800">
                    <h5 className="text-red-400 text-sm font-medium mb-2">Common Issues:</h5>
                    <ul className="text-red-300 text-sm space-y-1">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>CORS policy blocking the request</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>API endpoint has changed or is unavailable</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Network connectivity issue</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Invalid country code or parameters</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>API rate limiting or service down</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-8">
              <div className="flex items-center justify-center space-x-3">
                <Loader className="text-yellow-400 animate-spin" size={32} />
                <div>
                  <p className="text-yellow-400 font-semibold text-lg">Fetching Data...</p>
                  <p className="text-yellow-300 text-sm">Please wait while we query the API</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Display - Table View */}
          {!loading && !error && data && viewMode === 'table' && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              {renderTableView()}
            </div>
          )}

          {/* Success Display - JSON View */}
          {!loading && !error && data && viewMode === 'json' && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="bg-gray-900 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Code className="text-green-400" size={18} />
                  <h4 className="text-green-400 font-semibold">Raw JSON Response</h4>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
                >
                  Copy JSON
                </button>
              </div>
              <div className="p-4">
                <pre className="text-green-300 text-xs overflow-auto max-h-96 bg-black p-4 rounded">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!data && !error && !loading && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
          <Database className="text-gray-600 mx-auto mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">Ready to Test</h3>
          <p className="text-gray-500">
            Select a data source and country, then click "Test API Call" to see results
          </p>
        </div>
      )}
    </div>
  );
};

export default DebugApiTester;