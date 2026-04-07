import React, { useState } from 'react';
import { useCountryData, useEducationData,useEconomicData, COUNTRY_CODES } from '../../services/api';
import CountrySelector from '../CountrySelector/CountrySelector';
import StatsCards from './StatsCards';
import Charts from './Charts';
import DebugApiTester from '../DebugApiTester';

const Dashboard = () => {
  const [selectedCountry, setSelectedCountry] = useState('UGA'); // Default to Uganda

  // Fetch data for selected country
  const { data: countryInfo, loading: countryLoading, error: countryError } = useCountryData(selectedCountry);
  const { data: educationData, loading: educationLoading, error: educationError } = useEducationData(selectedCountry);
  const { data: economicData, loading: economicLoading, error: economicError } = useEconomicData(selectedCountry, 'SP.POP.TOTL');

  // Check if any data is loading
  const isLoading = countryLoading || educationLoading ||  economicLoading;
  
  // Check for errors
  const hasError = countryError || educationError ||  economicError;
  const errorMessage = countryError || educationError ||  economicError;

  // Get country name
  const countryName = COUNTRY_CODES[selectedCountry] || 'Selected Country';

  // Show loading state
  if (isLoading && !selectedCountry) {
    return (
      <div className="p-6">
        <div className="text-white">Please select a country to view data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Country Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-white">Development Dashboard</h1>
          <p className="text-gray-400">
            {selectedCountry ? `Showing data for ${countryName}` : 'Select a country to begin'}
          </p>
        </div>
        
        <CountrySelector 
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
        />
      </div>

      {/* Show message if no country selected */}
      {!selectedCountry && (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h2 className="text-xl text-white mb-2">Welcome to Development Dashboard</h2>
          <p className="text-gray-400">Select a country above to view development indicators and statistics</p>
        </div>
      )}

      {/* Show data when country is selected */}
      {selectedCountry && (
        <>
          {/* Loading State */}
          {isLoading && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-yellow-400">Loading {countryName} data...</div>
            </div>
          )}

          {/* Error State */}
          {hasError && !isLoading && (
            <div className="bg-red-900 border border-red-700 rounded-lg p-4">
              <div className="text-red-400">
                Error loading data: {errorMessage}
              </div>
              <div className="text-gray-300 mt-2 text-sm">
                Some data sources might not be available for this country.
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <StatsCards 
            countryCode={selectedCountry}
            countryName={countryName}
            countryInfo={countryInfo}
            educationData={educationData}
            economicData={economicData}
          />
          
          {/* Charts */}
          <Charts 
            countryCode={selectedCountry}
            countryName={countryName}
            educationData={educationData}
            economicData={economicData}
          />

          <DebugApiTester />

          {/* Debug Info (Development Mode) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white mb-2">Debug Info for {countryName}:</h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>Country Info: {countryInfo ? '✓ Loaded' : '✗ Not available'}</p>
                <p>Education Data: {educationData ? '✓ Loaded' : '✗ Not available'}</p>
                <p>Economic Data: {economicData ? '✓ Loaded' : '✗ Not available'}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;