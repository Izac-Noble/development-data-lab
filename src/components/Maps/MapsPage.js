import React, { useState } from 'react';
import WorldMap from './WorldMap';
import CountrySelector from '../CountrySelector/CountrySelector';
import { Map } from 'lucide-react';

const MapsPage = () => {
  const [selectedCountry, setSelectedCountry] = useState('UGA');

  const handleCountryChange = (countryCode) => {
    setSelectedCountry(countryCode);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Map className="mr-3 text-blue-400" size={32} />
            Geographic Maps
          </h1>
          <p className="text-gray-400 mt-1">
            Explore countries and regions visually
          </p>
        </div>
        
        <CountrySelector 
          selectedCountry={selectedCountry}
          onCountryChange={handleCountryChange}
        />
      </div>

      {/* World Map */}
      <WorldMap 
        selectedCountry={selectedCountry}
        onCountrySelect={handleCountryChange}
      />
    </div>
  );
};

export default MapsPage;