import React, { useState } from 'react';
import { 
  Globe, Users, DollarSign, MapPin, Download, RefreshCw, Plus, X, BarChart3 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useCountryData, useEconomicData, COUNTRY_CODES } from '../../services/api';

// Individual country card component
const CountryCard = ({ countryCode, color, onRemove, canRemove }) => {
  const { data: countryInfo, loading: infoLoading } = useCountryData(countryCode);
  const { data: populationData, loading: popLoading } = useEconomicData(countryCode, 'SP.POP.TOTL');
  const { data: gdpData, loading: gdpLoading } = useEconomicData(countryCode, 'NY.GDP.PCAP.CD');

  const isLoading = infoLoading || popLoading || gdpLoading;

  const formatNumber = (num) => {
    if (!num) return 'N/A';
    if (num > 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num > 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num > 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(0);
  };

  const info = countryInfo?.[0];
  const population = populationData?.[1]?.[0]?.value || 0;
  const gdpPerCapita = gdpData?.[1]?.[0]?.value || 0;

  const name = info?.name?.common || COUNTRY_CODES[countryCode];
  const flag = info?.flags?.svg || '';
  const capital = info?.capital?.[0] || 'N/A';
  const region = info?.region || 'N/A';
  const area = info?.area || 0;
  const currency = Object.keys(info?.currencies || {})[0] || 'N/A';
  const languages = Object.values(info?.languages || {}).join(', ') || 'N/A';

  return (
    <div className="bg-gray-800 rounded-lg p-6 border-t-4 relative" style={{ borderColor: color }}>
      {canRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 text-red-400 hover:text-red-300 bg-gray-700 rounded-full p-1"
        >
          <X size={16} />
        </button>
      )}

      {isLoading ? (
        <div className="text-yellow-400">Loading {COUNTRY_CODES[countryCode]}...</div>
      ) : (
        <>
          <div className="flex items-center space-x-3 mb-4">
            {flag && <img src={flag} alt={name} className="w-12 h-8 object-cover rounded" />}
            <div>
              <h3 className="text-xl font-bold text-white">{name}</h3>
              <p className="text-gray-400 text-sm">{region}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 flex items-center">
                <MapPin size={16} className="mr-2 text-blue-400" />
                Capital
              </span>
              <span className="text-white font-semibold">{capital}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-300 flex items-center">
                <Users size={16} className="mr-2 text-green-400" />
                Population
              </span>
              <span className="text-white font-semibold">{formatNumber(population)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-300 flex items-center">
                <DollarSign size={16} className="mr-2 text-yellow-400" />
                GDP per Capita
              </span>
              <span className="text-white font-semibold">${formatNumber(gdpPerCapita)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-300 flex items-center">
                <Globe size={16} className="mr-2 text-purple-400" />
                Area
              </span>
              <span className="text-white font-semibold">{formatNumber(area)} km²</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Currency</span>
              <span className="text-white font-semibold">{currency}</span>
            </div>

            <div className="pt-3 border-t border-gray-700">
              <span className="text-gray-300 text-sm">Languages</span>
              <p className="text-white text-sm mt-1">{languages}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Table Row Component
const ComparisonTableRow = ({ countryCode }) => {
  const { data: countryInfo } = useCountryData(countryCode);
  const { data: populationData } = useEconomicData(countryCode, 'SP.POP.TOTL');
  const { data: gdpData } = useEconomicData(countryCode, 'NY.GDP.PCAP.CD');

  const formatNumber = (num) => {
    if (!num) return 'N/A';
    if (num > 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num > 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num > 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(0);
  };

  const info = countryInfo?.[0];
  const population = populationData?.[1]?.[0]?.value || 0;
  const gdpPerCapita = gdpData?.[1]?.[0]?.value || 0;

  const name = info?.name?.common || COUNTRY_CODES[countryCode];
  const currency = Object.keys(info?.currencies || {})[0] || 'N/A';
  const region = info?.region || 'N/A';

  return (
    <tr className="border-b border-gray-700">
      <td className="py-4 text-white font-semibold">{name}</td>
      <td className="py-4 text-gray-300">{formatNumber(population)}</td>
      <td className="py-4 text-gray-300">${formatNumber(gdpPerCapita)}</td>
      <td className="py-4 text-gray-300">{currency}</td>
      <td className="py-4 text-gray-300">{region}</td>
    </tr>
  );
};

// Demographics Card Component
const DemographicsCard = ({ countryCode }) => {
  const { data: countryInfo } = useCountryData(countryCode);
  const { data: populationData } = useEconomicData(countryCode, 'SP.POP.TOTL');

  const formatNumber = (num) => {
    if (!num) return 'N/A';
    if (num > 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num > 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num > 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(0);
  };

  const info = countryInfo?.[0];
  const population = populationData?.[1]?.[0]?.value || 0;
  const name = info?.name?.common || COUNTRY_CODES[countryCode];
  const area = info?.area || 0;
  const languages = Object.values(info?.languages || {}).join(', ') || 'N/A';

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <h3 className="text-xl font-bold text-white mb-4">{name}</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-300">Population Density</span>
          <span className="text-white font-semibold">
            {area > 0 ? (population / area).toFixed(2) : 'N/A'} per km²
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Total Area</span>
          <span className="text-white font-semibold">{formatNumber(area)} km²</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Languages</span>
          <span className="text-white font-semibold text-right text-sm">{languages}</span>
        </div>
      </div>
    </div>
  );
};

// Chart Data Hook - call hooks unconditionally
const useChartData = (countryCodes) => {
  const country1Info = useCountryData(countryCodes[0] || 'UGA');
  const country1Pop = useEconomicData(countryCodes[0] || 'UGA', 'SP.POP.TOTL');
  const country1Gdp = useEconomicData(countryCodes[0] || 'UGA', 'NY.GDP.PCAP.CD');

  const country2Info = useCountryData(countryCodes[1] || 'USA');
  const country2Pop = useEconomicData(countryCodes[1] || 'USA', 'SP.POP.TOTL');
  const country2Gdp = useEconomicData(countryCodes[1] || 'USA', 'NY.GDP.PCAP.CD');

  const country3Info = useCountryData(countryCodes[2] || 'KEN');
  const country3Pop = useEconomicData(countryCodes[2] || 'KEN', 'SP.POP.TOTL');
  const country3Gdp = useEconomicData(countryCodes[2] || 'KEN', 'NY.GDP.PCAP.CD');

  const country4Info = useCountryData(countryCodes[3] || 'DEU');
  const country4Pop = useEconomicData(countryCodes[3] || 'DEU', 'SP.POP.TOTL');
  const country4Gdp = useEconomicData(countryCodes[3] || 'DEU', 'NY.GDP.PCAP.CD');

  const allCountries = [
    { info: country1Info, pop: country1Pop, gdp: country1Gdp, code: countryCodes[0] },
    { info: country2Info, pop: country2Pop, gdp: country2Gdp, code: countryCodes[1] },
    { info: country3Info, pop: country3Pop, gdp: country3Gdp, code: countryCodes[2] },
    { info: country4Info, pop: country4Pop, gdp: country4Gdp, code: countryCodes[3] }
  ];

  const chartData = allCountries
    .filter((country, index) => index < countryCodes.length)
    .map((country) => {
      const info = country.info.data?.[0];
      const population = country.pop.data?.[1]?.[0]?.value || 0;
      const gdp = country.gdp.data?.[1]?.[0]?.value || 0;

      return {
        name: info?.name?.common || COUNTRY_CODES[country.code],
        population: population / 1000000,
        gdp: gdp
      };
    });

  return chartData;
};

// Main Component
const CountryComparison = () => {
  const [selectedCountries, setSelectedCountries] = useState(['UGA', 'USA']);
  const [activeTab, setActiveTab] = useState('overview');

  const chartData = useChartData(selectedCountries);

  const addCountry = () => {
    if (selectedCountries.length < 4) {
      const availableCountries = Object.keys(COUNTRY_CODES).filter(
        code => !selectedCountries.includes(code)
      );
      if (availableCountries.length > 0) {
        setSelectedCountries([...selectedCountries, availableCountries[0]]);
      }
    }
  };

  const removeCountry = (code) => {
    if (selectedCountries.length > 1) {
      setSelectedCountries(selectedCountries.filter(c => c !== code));
    }
  };

  const updateCountry = (index, newCode) => {
    const updated = [...selectedCountries];
    updated[index] = newCode;
    setSelectedCountries(updated);
  };

  const resetComparison = () => {
    setSelectedCountries(['UGA', 'USA']);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Globe },
    { id: 'economy', label: 'Economy', icon: DollarSign },
    { id: 'demographics', label: 'Demographics', icon: Users },
    { id: 'charts', label: 'Visual Comparison', icon: BarChart3 }
  ];

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center">
              <Globe className="mr-3 text-blue-400" size={32} />
              Country Comparison
            </h1>
            <p className="text-gray-400 mt-2">Compare development indicators across countries</p>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={resetComparison}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw size={16} />
              <span>Reset</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Download size={16} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Country Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {selectedCountries.map((code, index) => (
            <div key={index} className="relative">
              <select
                value={code}
                onChange={(e) => updateCountry(index, e.target.value)}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 appearance-none pr-10"
              >
                {Object.entries(COUNTRY_CODES).map(([countryCode, name]) => (
                  <option key={countryCode} value={countryCode}>
                    {name}
                  </option>
                ))}
              </select>
              {selectedCountries.length > 1 && (
                <button
                  onClick={() => removeCountry(code)}
                  className="absolute right-10 top-1/2 transform -translate-y-1/2 text-red-400 hover:text-red-300"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          ))}
          
          {selectedCountries.length < 4 && (
            <button
              onClick={addCountry}
              className="flex items-center justify-center space-x-2 p-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg border-2 border-dashed border-gray-600 transition-colors"
            >
              <Plus size={20} />
              <span>Add Country</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-gray-800 p-2 rounded-lg overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {selectedCountries.map((code, index) => (
            <CountryCard
              key={code}
              countryCode={code}
              color={colors[index]}
              onRemove={() => removeCountry(code)}
              canRemove={selectedCountries.length > 1}
            />
          ))}
        </div>
      )}

      {activeTab === 'economy' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Economic Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="pb-3 text-gray-300">Country</th>
                  <th className="pb-3 text-gray-300">Population</th>
                  <th className="pb-3 text-gray-300">GDP per Capita</th>
                  <th className="pb-3 text-gray-300">Currency</th>
                  <th className="pb-3 text-gray-300">Region</th>
                </tr>
              </thead>
              <tbody>
                {selectedCountries.map(code => (
                  <ComparisonTableRow key={code} countryCode={code} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'demographics' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Demographics Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {selectedCountries.map(code => (
              <DemographicsCard key={code} countryCode={code} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'charts' && (
        <div className="space-y-6">
          {/* Bar Chart - Population */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">Population Comparison (Millions)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    color: 'white'
                  }} 
                />
                <Bar dataKey="population" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart - GDP */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">GDP per Capita Comparison ($)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    color: 'white'
                  }} 
                />
                <Bar dataKey="gdp" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryComparison;