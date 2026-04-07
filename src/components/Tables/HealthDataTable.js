import React, { useState } from 'react';
import { Heart, Activity, Calendar, TrendingUp, Filter, AlertCircle } from 'lucide-react';

const HealthDataTable = ({ data }) => {
  const [sortBy, setSortBy] = useState('year');
  const [filterGender, setFilterGender] = useState('all');

  // Handle loading or empty state
  if (!data) {
    return (
      <div className="p-4 bg-gray-700 rounded-lg text-gray-300 text-center">
        No health data available
      </div>
    );
  }

  // WHO returns data in value array
  const healthData = data.value || [];

  if (healthData.length === 0) {
    return (
      <div className="p-4 bg-gray-700 rounded-lg text-gray-300 text-center">
        No health records found for this country
      </div>
    );
  }

  // Helper to get readable dimension labels
  const getDimensionLabel = (dim) => {
    const labels = {
      'MLE': 'Male',
      'FMLE': 'Female',
      'BTSX': 'Both Sexes',
      '_T': 'Total'
    };
    return labels[dim] || dim;
  };

  // Helper to format indicator name
  const formatIndicatorName = (code) => {
    const indicators = {
      'WHOSIS_000001': 'Life Expectancy at Birth',
      'MDG_0000000001': 'Infant Mortality Rate',
      'WHS3_48': 'Maternal Mortality Ratio',
      'NCDMORT3070': 'Probability of Premature Death'
    };
    return indicators[code] || code;
  };

  // Process and filter data
  const processedData = healthData
    .filter(item => {
      if (filterGender === 'all') return true;
      if (filterGender === 'male') return item.Dim1 === 'MLE';
      if (filterGender === 'female') return item.Dim1 === 'FMLE';
      if (filterGender === 'both') return item.Dim1 === 'BTSX' || item.Dim1 === '_T';
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'year') {
        return (b.TimeDim || 0) - (a.TimeDim || 0);
      } else if (sortBy === 'value') {
        return (b.NumericValue || 0) - (a.NumericValue || 0);
      }
      return 0;
    });

  // Calculate summary statistics
  const summary = {
    totalRecords: processedData.length,
    latestYear: Math.max(...processedData.map(d => d.TimeDim || 0)),
    averageValue: processedData.reduce((sum, d) => sum + (d.NumericValue || 0), 0) / processedData.length,
    indicators: [...new Set(processedData.map(d => d.IndicatorCode))].length
  };

  return (
    <div className="space-y-4">
      {/* Header with Summary */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Heart className="text-red-400" size={24} />
            <div>
              <h3 className="text-xl font-bold text-white">WHO Health Data</h3>
              <p className="text-sm text-gray-400">
                {summary.totalRecords} health indicators found
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 p-3 rounded border border-gray-700">
            <div className="flex items-center space-x-2 mb-1">
              <Calendar className="text-blue-400" size={16} />
              <span className="text-xs text-gray-400">Latest Year</span>
            </div>
            <p className="text-lg font-bold text-white">{summary.latestYear}</p>
          </div>

          <div className="bg-gray-900 p-3 rounded border border-gray-700">
            <div className="flex items-center space-x-2 mb-1">
              <Activity className="text-green-400" size={16} />
              <span className="text-xs text-gray-400">Total Records</span>
            </div>
            <p className="text-lg font-bold text-white">{summary.totalRecords}</p>
          </div>

          <div className="bg-gray-900 p-3 rounded border border-gray-700">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="text-purple-400" size={16} />
              <span className="text-xs text-gray-400">Average Value</span>
            </div>
            <p className="text-lg font-bold text-white">{summary.averageValue.toFixed(2)}</p>
          </div>

          <div className="bg-gray-900 p-3 rounded border border-gray-700">
            <div className="flex items-center space-x-2 mb-1">
              <AlertCircle className="text-yellow-400" size={16} />
              <span className="text-xs text-gray-400">Indicators</span>
            </div>
            <p className="text-lg font-bold text-white">{summary.indicators}</p>
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col md:flex-row gap-4 bg-gray-800 p-4 rounded-lg border border-gray-700">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Filter className="inline mr-2" size={14} />
            Filter by Gender
          </label>
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded"
          >
            <option value="all">All</option>
            <option value="male">Male Only</option>
            <option value="female">Female Only</option>
            <option value="both">Both Sexes</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded"
          >
            <option value="year">Year (Newest First)</option>
            <option value="value">Value (Highest First)</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-700">
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">
                  Year
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">
                  Indicator
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">
                  Gender
                </th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-300">
                  Value
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {processedData.map((item, index) => (
                <tr 
                  key={index}
                  className="border-b border-gray-700 hover:bg-gray-750 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="text-blue-400" size={14} />
                      <span className="text-white font-medium">
                        {item.TimeDim || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-gray-300 text-sm block">
                        {formatIndicatorName(item.IndicatorCode)}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {item.IndicatorCode}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      item.Dim1 === 'MLE' ? 'bg-blue-900 text-blue-300' :
                      item.Dim1 === 'FMLE' ? 'bg-pink-900 text-pink-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {getDimensionLabel(item.Dim1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-white font-bold text-lg">
                      {item.NumericValue ? item.NumericValue.toFixed(2) : 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                      item.Value === 'E' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-green-900 text-green-300'
                    }`}>
                      {item.Value || 'Verified'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* No Results Message */}
      {processedData.length === 0 && (
        <div className="bg-gray-700 p-4 rounded text-center text-gray-300">
          No data matches the current filters.
        </div>
      )}
    </div>
  );
};

export default HealthDataTable;