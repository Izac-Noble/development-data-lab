import React from 'react';
import { Globe, Users, MapPin, DollarSign, MessageSquare, Flag } from 'lucide-react';

const CountryInfoTable = ({ data }) => {
  // Handle loading or empty state
  if (!data) {
    return (
      <div className="p-4 bg-gray-700 rounded-lg text-gray-300 text-center">
        No country data available
      </div>
    );
  }

  // REST Countries returns an array, get first item
  const country = Array.isArray(data) ? data[0] : data;

  // Helper to format population with commas
  const formatNumber = (num) => {
    return num?.toLocaleString() || 'N/A';
  };

  // Helper to get currency info
  const getCurrencies = () => {
    if (!country.currencies) return 'N/A';
    return Object.values(country.currencies)
      .map(c => `${c.name} (${c.symbol})`)
      .join(', ');
  };

  // Helper to get languages
  const getLanguages = () => {
    if (!country.languages) return 'N/A';
    return Object.values(country.languages).join(', ');
  };

  // Data rows for the table
  const tableData = [
    {
      icon: Flag,
      label: 'Official Name',
      value: country.name?.official || 'N/A',
      color: 'text-blue-400'
    },
    {
      icon: Globe,
      label: 'Common Name',
      value: country.name?.common || 'N/A',
      color: 'text-green-400'
    },
    {
      icon: MapPin,
      label: 'Capital',
      value: country.capital?.[0] || 'N/A',
      color: 'text-purple-400'
    },
    {
      icon: MapPin,
      label: 'Region',
      value: country.region || 'N/A',
      color: 'text-yellow-400'
    },
    {
      icon: MapPin,
      label: 'Subregion',
      value: country.subregion || 'N/A',
      color: 'text-orange-400'
    },
    {
      icon: Users,
      label: 'Population',
      value: formatNumber(country.population),
      color: 'text-red-400'
    },
    {
      icon: DollarSign,
      label: 'Currencies',
      value: getCurrencies(),
      color: 'text-emerald-400'
    },
    {
      icon: MessageSquare,
      label: 'Languages',
      value: getLanguages(),
      color: 'text-indigo-400'
    },
    {
      icon: Globe,
      label: 'Area (km²)',
      value: formatNumber(country.area),
      color: 'text-cyan-400'
    },
    {
      icon: Flag,
      label: 'Country Code',
      value: country.cca3 || country.cca2 || 'N/A',
      color: 'text-pink-400'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header with Flag */}
      <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg border border-gray-700">
        <div className="flex items-center space-x-4">
          {country.flags?.png && (
            <img 
              src={country.flags.png} 
              alt={`${country.name?.common} flag`}
              className="w-16 h-12 object-cover rounded border border-gray-600"
            />
          )}
          <div>
            <h3 className="text-xl font-bold text-white">
              {country.name?.common || 'Country Information'}
            </h3>
            <p className="text-sm text-gray-400">
              {country.name?.official || 'Official name not available'}
            </p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-900 border-b border-gray-700">
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">
                Property
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => {
              const Icon = row.icon;
              return (
                <tr 
                  key={index}
                  className="border-b border-gray-700 hover:bg-gray-750 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <Icon className={row.color} size={18} />
                      <span className="text-gray-300 font-medium">
                        {row.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white">
                    {row.value}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Timezones */}
        {country.timezones && country.timezones.length > 0 && (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Timezones</h4>
            <div className="flex flex-wrap gap-2">
              {country.timezones.slice(0, 3).map((tz, i) => (
                <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                  {tz}
                </span>
              ))}
              {country.timezones.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{country.timezones.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Borders */}
        {country.borders && country.borders.length > 0 && (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Bordering Countries</h4>
            <div className="flex flex-wrap gap-2">
              {country.borders.slice(0, 5).map((border, i) => (
                <span key={i} className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">
                  {border}
                </span>
              ))}
              {country.borders.length > 5 && (
                <span className="text-xs text-gray-400">
                  +{country.borders.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Continents */}
        {country.continents && country.continents.length > 0 && (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Continents</h4>
            <div className="flex flex-wrap gap-2">
              {country.continents.map((continent, i) => (
                <span key={i} className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">
                  {continent}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CountryInfoTable;