import React from 'react';
import { TrendingUp, Users, Building, GraduationCap, Heart, Activity, MapPin, DollarSign } from 'lucide-react';

const StatsCards = ({ countryCode, countryName, countryInfo, educationData, healthData, economicData }) => {
  
  // Helper to safely extract values from different API responses
  const extractValue = (data, path, fallback = 'N/A') => {
    if (!data) return fallback;
    
    try {
      // Handle World Bank array response [metadata, data]
      if (Array.isArray(data) && data.length > 1) {
        const dataArray = data[1];
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          // Find first non-null value
          const validItem = dataArray.find(item => item.value !== null);
          return validItem?.value || fallback;
        }
      }
      
      // Handle direct array data (WHO, UNESCO)
      if (Array.isArray(data)) {
        const latest = data.find(item => item.value !== null) || data[0];
        return latest?.value || latest?.NumericValue || fallback;
      }
      
      // Handle nested object data
      if (typeof data === 'object') {
        const keys = path.split('.');
        let current = data;
        for (const key of keys) {
          current = current?.[key];
        }
        return current || fallback;
      }
      
      return data || fallback;
    } catch (error) {
      console.error('Error extracting value:', error);
      return fallback;
    }
  };

  // Format numbers nicely
  const formatNumber = (value) => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') {
      if (value > 1000000000) return (value / 1000000000).toFixed(1) + 'B';
      if (value > 1000000) return (value / 1000000).toFixed(1) + 'M';
      if (value > 1000) return (value / 1000).toFixed(1) + 'K';
      return value.toFixed(0);
    }
    return value;
  };

  // Extract population from economicData
  const getPopulation = () => {
    if (!economicData) return 'Loading...';
    
    // World Bank returns [metadata, data] array
    if (Array.isArray(economicData) && economicData.length > 1) {
      const dataArray = economicData[1];
      if (Array.isArray(dataArray) && dataArray.length > 0) {
        // Get the most recent non-null value
        const validData = dataArray.find(item => item.value !== null);
        if (validData) {
          return formatNumber(validData.value);
        }
      }
    }
    
    return 'N/A';
  };

  // Build stats array with dynamic data
  const statsData = [
    {
      title: 'Population',
      value: getPopulation(),
      icon: Users,
      color: 'blue',
      source: 'World Bank'
    },
    {
      title: 'Capital City',
      value: countryInfo?.[0]?.capital?.[0] || 'N/A',
      icon: Building,
      color: 'green',
      source: 'Country Info'
    },
    {
      title: 'Region',
      value: countryInfo?.[0]?.region || 'N/A',
      icon: MapPin,
      color: 'purple',
      source: 'Country Info'
    },
    {
      title: 'Currency',
      value: (() => {
        const currencies = countryInfo?.[0]?.currencies;
        if (currencies) {
          const currencyKey = Object.keys(currencies)[0];
          return currencies[currencyKey]?.name || 'N/A';
        }
        return 'N/A';
      })(),
      icon: DollarSign,
      color: 'yellow',
      source: 'Country Info'
    },
    {
      title: 'Education Data',
      value: (() => {
        if (!educationData) return 'Loading...';
        const eduArray = educationData?.data?.value || educationData?.value || [];
        return Array.isArray(eduArray) ? `${eduArray.length} indicators` : 'Available';
      })(),
      icon: GraduationCap,
      color: 'indigo',
      source: 'UNESCO'
    },
    {
      title: 'Health Data',
      value: (() => {
        if (!healthData) return 'Loading...';
        const healthArray = healthData?.value || [];
        return Array.isArray(healthArray) ? `${healthArray.length} records` : 'Available';
      })(),
      icon: Heart,
      color: 'red',
      source: 'WHO'
    }
  ];

  // Color scheme
  const getColors = (color) => {
    const colors = {
      blue: { border: 'border-blue-500', icon: 'text-blue-400', bg: 'bg-blue-900/20' },
      green: { border: 'border-green-500', icon: 'text-green-400', bg: 'bg-green-900/20' },
      purple: { border: 'border-purple-500', icon: 'text-purple-400', bg: 'bg-purple-900/20' },
      yellow: { border: 'border-yellow-500', icon: 'text-yellow-400', bg: 'bg-yellow-900/20' },
      indigo: { border: 'border-indigo-500', icon: 'text-indigo-400', bg: 'bg-indigo-900/20' },
      red: { border: 'border-red-500', icon: 'text-red-400', bg: 'bg-red-900/20' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          {countryName} Overview
        </h2>
        <div className="text-sm text-gray-400">
          Country Code: {countryCode}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          const colors = getColors(stat.color);
          
          return (
            <div 
              key={index} 
              className={`${colors.bg} p-4 rounded-lg border ${colors.border} hover:border-opacity-75 transition-all duration-200`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-300 text-sm mb-1">{stat.title}</p>
                  <p className="text-lg font-bold text-white mb-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-400">
                    {stat.source}
                  </p>
                </div>
                <Icon className={`${colors.icon} ml-2 flex-shrink-0`} size={24} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatsCards;