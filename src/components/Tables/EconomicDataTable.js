import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar, BarChart3, Info } from 'lucide-react';

const EconomicDataTable = ({ data }) => {
  const [sortOrder, setSortOrder] = useState('desc');

  // Handle loading or empty state
  if (!data) {
    return (
      <div className="p-4 bg-gray-700 rounded-lg text-gray-300 text-center">
        No economic data available
      </div>
    );
  }

  // World Bank returns [metadata, data] array
  const economicData = Array.isArray(data) ? data[1] : [];
  const metadata = Array.isArray(data) ? data[0] : null;

  if (!economicData || economicData.length === 0) {
    return (
      <div className="p-4 bg-gray-700 rounded-lg text-gray-300 text-center">
        No economic records found for this country
      </div>
    );
  }

  // Helper to format large numbers
  const formatNumber = (num) => {
    if (!num) return 'N/A';
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  // Helper to get indicator name
  const getIndicatorName = (code) => {
    const indicators = {
      'SP.POP.TOTL': 'Total Population',
      'NY.GDP.MKTP.CD': 'GDP (current US$)',
      'NY.GDP.PCAP.CD': 'GDP per capita',
      'SP.DYN.LE00.IN': 'Life expectancy at birth',
      'SE.PRM.ENRR': 'School enrollment, primary',
      'SH.XPD.CHEX.PC.CD': 'Health expenditure per capita'
    };
    return indicators[code] || code;
  };

  // Filter out null values and sort
  const processedData = economicData
    .filter(item => item.value !== null)
    .sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.date - a.date;
      }
      return a.date - b.date;
    });

  // Calculate statistics
  const values = processedData.map(d => d.value).filter(v => v !== null);
  const summary = {
    totalRecords: processedData.length,
    latestYear: processedData[0]?.date,
    latestValue: processedData[0]?.value,
    oldestYear: processedData[processedData.length - 1]?.date,
    oldestValue: processedData[processedData.length - 1]?.value,
    averageValue: values.reduce((sum, v) => sum + v, 0) / values.length,
    maxValue: Math.max(...values),
    minValue: Math.min(...values)
  };

  // Calculate trend
  const trend = summary.latestValue > summary.oldestValue ? 'up' : 'down';
  const trendPercent = summary.oldestValue ? 
    (((summary.latestValue - summary.oldestValue) / summary.oldestValue) * 100).toFixed(2) : 0;

  return (
    <div className="space-y-4">
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
                  Country
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">
                  Indicator
                </th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-300">
                  Value
                </th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-300">
                  Change from Previous
                </th>
              </tr>
            </thead>
            <tbody>
              {processedData.map((item, index) => {
                const prevItem = processedData[index + 1];
                const changeValue = prevItem && prevItem.value ? 
                  ((item.value - prevItem.value) / prevItem.value * 100) : null;
                const isPositive = changeValue > 0;
                
                return (
                  <tr 
                    key={index}
                    className="border-b border-gray-700 hover:bg-gray-750 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="text-blue-400" size={14} />
                        <span className="text-white font-medium">
                          {item.date}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300 text-sm">
                        {item.country?.value || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-gray-300 text-sm block">
                          {getIndicatorName(item.indicator?.id)}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {item.indicator?.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-white font-bold text-lg">
                        {formatNumber(item.value)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {changeValue !== null ? (
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${
                          isPositive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {isPositive ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          <span>{isPositive ? '+' : ''}{changeValue.toFixed(2)}%</span>
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Statistical Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Highest Value:</span>
            <span className="text-sm font-bold text-green-400">{formatNumber(summary.maxValue)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Lowest Value:</span>
            <span className="text-sm font-bold text-red-400">{formatNumber(summary.minValue)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Average:</span>
            <span className="text-sm font-bold text-blue-400">{formatNumber(summary.averageValue)}</span>
          </div>
        </div>
      </div>

      {/* No Results Message */}
      {processedData.length === 0 && (
        <div className="bg-gray-700 p-4 rounded text-center text-gray-300">
          No data available for the selected indicator and time period.
        </div>
      )}
    </div>
  );
};

export default EconomicDataTable;