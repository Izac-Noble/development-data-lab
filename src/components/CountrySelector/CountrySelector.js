import React from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { COUNTRY_CODES } from '../../services/api';

const CountrySelector = ({ selectedCountry, onCountryChange }) => {
  return (
    <div className="relative">
      <div className="flex items-center space-x-2 bg-gray-700 rounded-lg px-4 py-2 border border-gray-600">
        <Globe className="text-blue-400" size={20} />
        <select
          value={selectedCountry}
          onChange={(e) => onCountryChange(e.target.value)}
          className="bg-transparent text-white outline-none cursor-pointer appearance-none pr-8"
        >
          <option value="">Select Country</option>
          {Object.entries(COUNTRY_CODES).map(([code, name]) => (
            <option key={code} value={code} className="bg-gray-700 text-white">
              {name}
            </option>
          ))}
        </select>
        <ChevronDown className="text-gray-400 absolute right-2 pointer-events-none" size={16} />
      </div>
    </div>
  );
};

export default CountrySelector;