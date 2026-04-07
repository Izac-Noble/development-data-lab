import React from 'react';

const Charts = ({ regionalData, unescoData }) => {
  
  // Process UNESCO data for the pie chart
  const processUnescoData = () => {
    if (!unescoData?.data?.value || unescoData.data.value.length === 0) {
      // Fallback data if no API data
      return [
        { name: 'No Data', value: 100, color: '#6B7280' }
      ];
    }

    // Takes first 5 items from API and create chart data
    const colors = ['#4F46E5', '#7C3AED', '#2563EB', '#0891B2', '#059669'];
    
    return unescoData.data.value.slice(0, 5).map((item, index) => ({
      name: item.Dim1 === 'SEX_MLE' ? 'Male' : 
            item.Dim1 === 'SEX_FMLE' ? 'Female' : 
            item.Dim1 || `Item ${index + 1}`,
      value: Math.round(item.NumericValue || Math.random() * 100),
      color: colors[index] || '#6B7280'
    }));
  };

  // Process data for the bar chart (years)
  const processYearData = () => {
    if (!unescoData?.data?.value || unescoData.data.value.length === 0) {
      // Fallback data
      return regionalData || [];
    }

    // Group data by year
    const yearGroups = {};
    unescoData.data.value.forEach(item => {
      const year = item.TimeDim || item.year || 2023;
      if (!yearGroups[year]) {
        yearGroups[year] = [];
      }
      yearGroups[year].push(item);
    });

    // Convert to chart format
    return Object.keys(yearGroups).map(year => ({
      region: `Year ${year}`,
      hospitals: yearGroups[year].length,
      year: year
    }));
  };

  const investmentSectors = processUnescoData();
  const chartData = processYearData();
};

export default Charts;