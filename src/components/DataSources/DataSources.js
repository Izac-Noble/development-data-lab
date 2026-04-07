import React from 'react';
import { Database, Globe, ExternalLink, TrendingUp, Activity, GraduationCap } from 'lucide-react';

const DataSources = () => {
  const dataSources = [
    {
      name: 'World Bank',
      icon: TrendingUp,
      color: 'blue',
      description: 'Economic indicators including GDP, population, and poverty statistics.',
      website: 'https://data.worldbank.org',
      indicators: ['Population', 'GDP per Capita', 'Economic Growth', 'Unemployment Rate']
    },
    {
      name: 'WHO (World Health Organization)',
      icon: Activity,
      color: 'red',
      description: 'Global health statistics and disease data.',
      website: 'https://www.who.int/data',
      indicators: ['Life Expectancy', 'Mortality Rates', 'Disease Prevalence', 'Healthcare Access']
    },
    {
      name: 'UNESCO',
      icon: GraduationCap,
      color: 'indigo',
      description: 'Education statistics and literacy data worldwide.',
      website: 'https://uis.unesco.org',
      indicators: ['School Enrollment', 'Literacy Rates', 'Education Spending', 'Completion Rates']
    },
    {
      name: 'REST Countries',
      icon: Globe,
      color: 'green',
      description: 'Country information including flags, capitals, and languages.',
      website: 'https://restcountries.com',
      indicators: ['Country Names', 'Capitals', 'Flags', 'Languages', 'Currencies']
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-900/20 border-blue-500 text-blue-400',
      red: 'bg-red-900/20 border-red-500 text-red-400',
      indigo: 'bg-indigo-900/20 border-indigo-500 text-indigo-400',
      green: 'bg-green-900/20 border-green-500 text-green-400'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h1 className="text-3xl font-bold text-white flex items-center mb-2">
          <Database className="mr-3 text-blue-400" size={32} />
          Data Sources
        </h1>
        <p className="text-gray-400">
          Real-time data from trusted international organizations
        </p>
      </div>

      {/* Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dataSources.map((source, index) => {
          const Icon = source.icon;
          const colorClass = getColorClasses(source.color);
          
          return (
            <div
              key={index}
              className={`${colorClass} rounded-lg p-6 border`}
            >
              {/* Icon & Name */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <Icon size={28} />
                </div>
                <h2 className="text-2xl font-bold text-white">{source.name}</h2>
              </div>

              {/* Description */}
              <p className="text-gray-300 mb-4">{source.description}</p>

              {/* Indicators */}
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-2">Key Indicators:</h3>
                <div className="flex flex-wrap gap-2">
                  {source.indicators.map((indicator, idx) => (
                    <span
                      key={idx}
                      className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm"
                    >
                      {indicator}
                    </span>
                  ))}
                </div>
              </div>

              {/* Link */}
              <a
                href={source.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <ExternalLink size={16} />
                <span>Visit Website</span>
              </a>
            </div>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">About This Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
          <div>
            <h3 className="text-white font-semibold mb-2">Data Quality</h3>
            <p className="text-sm">
              All data comes from official international organizations with strict validation protocols.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Real-Time Updates</h3>
            <p className="text-sm">
              Data is fetched directly from API endpoints, ensuring current information.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Coverage</h3>
            <p className="text-sm">
              Includes data for 200+ countries across economic, health, and education indicators.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">API Integration</h3>
            <p className="text-sm">
              Built with React hooks for efficient data fetching and state management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSources;