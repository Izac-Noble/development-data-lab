import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { MapPin, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';
import { COUNTRY_CODES, useCountryData } from '../../services/api';

const WorldMap = ({ selectedCountry, onCountrySelect }) => {
  const svgRef = useRef();
  const zoomRef = useRef();
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [clickedCountry, setClickedCountry] = useState(null);
  const [countryPopup, setCountryPopup] = useState({
    visible: false,
    x: 0,
    y: 0,
    countryCode: null
  });
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    country: null,
  });

  // Fetchs country data when a country is clicked
  const { data: countryInfo } = useCountryData(clickedCountry);

  // Loading GeoJSON data
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson');
        
        if (!response.ok) {
          throw new Error('Failed to load map data');
        }
        
        const geoData = await response.json();
        setMapData(geoData);
        setError(null);
      } catch (err) {
        console.error('Error loading map:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMapData();
  }, []);

  // Render the map
  useEffect(() => {
    if (!mapData || loading) return;

    const width = 960;
    const height = 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create projection
    const projection = d3.geoNaturalEarth1()
      .scale(width / 6)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // group for all paths
    const g = svg.append('g');

    // zoom constraints
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [width, height]]) // Prevent dragging off-screen
      .extent([[0, 0], [width, height]])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Draw countries
    g.selectAll('path')
      .data(mapData.features)
      .join('path')
      .attr('d', path)
      .attr('class', 'country')
      .style('fill', (d) => {
        const countryCode = getCountryCode(d.properties.ADMIN || d.properties.name);
        return countryCode === selectedCountry ? '#3B82F6' : '#4B5563';
      })
      .style('stroke', '#1F2937')
      .style('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .style('transition', 'fill 0.2s')
      .on('mouseenter', function (event, d) {
        const countryName = d.properties.ADMIN || d.properties.name;
        if (getCountryCode(countryName) !== selectedCountry) {
          d3.select(this).style('fill', '#6B7280');
        }
        setTooltip({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          country: countryName,
        });
      })
      .on('mousemove', function (event) {
        setTooltip(prev => ({ ...prev, x: event.pageX, y: event.pageY }));
      })
      .on('mouseleave', function (event, d) {
        const countryName = d.properties.ADMIN || d.properties.name;
        const countryCode = getCountryCode(countryName);
        d3.select(this).style('fill', countryCode === selectedCountry ? '#3B82F6' : '#4B5563');
        setTooltip(prev => ({ ...prev, visible: false }));
      })
      .on('click', function (event, d) {
        const countryName = d.properties.ADMIN || d.properties.name;
        const countryCode = getCountryCode(countryName);
        if (countryCode) {
          setClickedCountry(countryCode);
          if (onCountrySelect) {
            onCountrySelect(countryCode);
          }
          // Show popup near click
          setCountryPopup({
            visible: true,
            x: event.pageX,
            y: event.pageY,
            countryCode: countryCode
          });
        }
      });

  }, [mapData, loading, selectedCountry, onCountrySelect]);

  // Helper to map country names to ISO codes
  const getCountryCode = (countryName) => {
    if (!countryName) return null;
    
    const nameMapping = {
      'United States of America': 'USA',
      'United States': 'USA',
      'United Kingdom': 'GBR',
      'Germany': 'DEU',
      'France': 'FRA',
      'Japan': 'JPN',
      'China': 'CHN',
      'India': 'IND',
      'Brazil': 'BRA',
      'South Africa': 'ZAF',
      'Kenya': 'KEN',
      'Uganda': 'UGA',
      'Tanzania': 'TZA',
      'United Republic of Tanzania': 'TZA',
      'Rwanda': 'RWA',
      'Ethiopia': 'ETH',
      'Ghana': 'GHA',
      'Nigeria': 'NGA',
      'Egypt': 'EGY',
      'Morocco': 'MAR',
      'Canada': 'CAN',
      'Australia': 'AUS',
      'Mexico': 'MEX',
      'Algeria': 'DZA',
      'Angola': 'AGO',
      'Botswana': 'BWA',
      'Cameroon': 'CMR',
      'Ivory Coast': 'CIV',
      "Cote d'Ivoire": 'CIV',
      'Senegal': 'SEN',
      'Zimbabwe': 'ZWE',
      'Zambia': 'ZMB',
      'Namibia': 'NAM',
      'Mozambique': 'MOZ',
      'Sudan': 'SDN',
      'South Sudan': 'SSD',
      'Tunisia': 'TUN',
      'Libya': 'LBY',
      'South Korea': 'KOR',
      'Republic of Korea': 'KOR',
      'North Korea': 'PRK',
      'Indonesia': 'IDN',
      'Philippines': 'PHL',
      'Vietnam': 'VNM',
      'Thailand': 'THA',
      'Malaysia': 'MYS',
      'Singapore': 'SGP',
      'Pakistan': 'PAK',
      'Bangladesh': 'BGD',
      'Sri Lanka': 'LKA',
      'Nepal': 'NPL',
      'Saudi Arabia': 'SAU',
      'United Arab Emirates': 'ARE',
      'Israel': 'ISR',
      'Turkey': 'TUR',
      'Iran': 'IRN',
      'Iraq': 'IRQ',
      'Qatar': 'QAT',
      'Kuwait': 'KWT',
      'Italy': 'ITA',
      'Spain': 'ESP',
      'Netherlands': 'NLD',
      'Belgium': 'BEL',
      'Switzerland': 'CHE',
      'Sweden': 'SWE',
      'Norway': 'NOR',
      'Denmark': 'DNK',
      'Finland': 'FIN',
      'Poland': 'POL',
      'Portugal': 'PRT',
      'Ireland': 'IRL',
      'Austria': 'AUT',
      'Greece': 'GRC',
      'Czech Republic': 'CZE',
      'Hungary': 'HUN',
      'Romania': 'ROU',
      'Ukraine': 'UKR',
      'Argentina': 'ARG',
      'Chile': 'CHL',
      'Colombia': 'COL',
      'Peru': 'PER',
      'Venezuela': 'VEN',
      'Ecuador': 'ECU',
      'Bolivia': 'BOL',
      'Paraguay': 'PRY',
      'Uruguay': 'URY',
      'Costa Rica': 'CRI',
      'Panama': 'PAN',
      'Cuba': 'CUB',
      'Dominican Republic': 'DOM',
      'Haiti': 'HTI',
      'Jamaica': 'JAM',
    };
    return nameMapping[countryName] || null;
  };

  // Zoom controls for D3 zoom calls
  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(300)
      .call(zoomRef.current.scaleBy, 1.5);
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(300)
      .call(zoomRef.current.scaleBy, 0.67);
  };

  const handleReset = () => {
    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(300)
      .call(zoomRef.current.transform, d3.zoomIdentity);
    setZoomLevel(1);
  };

  // Format population
  const formatPopulation = (pop) => {
    if (!pop) return 'N/A';
    if (pop >= 1000000000) return `${(pop / 1000000000).toFixed(1)}B`;
    if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)}M`;
    if (pop >= 1000) return `${(pop / 1000).toFixed(1)}K`;
    return pop.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-800 rounded-lg">
        <div className="text-center">
          <MapPin className="text-blue-400 mx-auto mb-4 animate-spin" size={48} />
          <p className="text-gray-300">Loading world map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900 border border-red-700 rounded-lg">
        <p className="text-red-400">Error loading map: {error}</p>
        <p className="text-red-300 text-sm mt-2">Please check your internet connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700">
        <div className="flex items-center space-x-2">
          <MapPin className="text-blue-400" size={20} />
          <div>
            <h3 className="text-lg font-bold text-white">Interactive World Map</h3>
            <p className="text-xs text-gray-400">
              Click any country to view details
            </p>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="text-gray-300" size={16} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="text-gray-300" size={16} />
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Reset View"
          >
            <Maximize2 className="text-gray-300" size={16} />
          </button>
          <div className="ml-2 px-2 py-1 bg-gray-900 rounded text-xs text-gray-400">
            {zoomLevel.toFixed(1)}x
          </div>
        </div>
      </div>

      {/* Map Container and ledgend*/}
      <div className="relative bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="600"
          viewBox="0 0 960 600"
          className="w-full h-auto"
          style={{ background: '#1F2937' }}
        />

        {/* Legend map */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 rounded px-3 py-2 text-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-300">Selected</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-600 rounded"></div>
              <span className="text-gray-300">Available</span>
            </div>
          </div>
        </div>

        {/* Hover Tooltip */}
        {tooltip.visible && (
          <div
            className="fixed bg-black text-white text-xs rounded px-2 py-1 pointer-events-none z-50"
            style={{ top: tooltip.y + 10, left: tooltip.x + 10 }}
          >
            {tooltip.country}
          </div>
        )}

        {/* Country Info Popup */}
        {countryPopup.visible && countryInfo && (
          <div
            className="fixed bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-50 w-64"
            style={{ 
              top: Math.min(countryPopup.y + 10, window.innerHeight - 200), 
              left: Math.min(countryPopup.x + 10, window.innerWidth - 280)
            }}
          >
            <div className="flex items-center justify-between bg-gray-800 px-3 py-2 border-b border-gray-700">
              <div className="flex items-center space-x-2">
                {countryInfo[0]?.flags?.png && (
                  <img 
                    src={countryInfo[0].flags.png} 
                    alt="flag"
                    className="w-6 h-4 object-cover rounded"
                  />
                )}
                <h4 className="text-sm font-bold text-white">
                  {COUNTRY_CODES[countryPopup.countryCode]}
                </h4>
              </div>
              <button
                onClick={() => setCountryPopup({ ...countryPopup, visible: false })}
                className="text-gray-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Capital:</span>
                <span className="text-white font-medium">
                  {countryInfo[0]?.capital?.[0] || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Population:</span>
                <span className="text-white font-medium">
                  {formatPopulation(countryInfo[0]?.population)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Country Code:</span>
                <span className="text-white font-medium">
                  {countryPopup.countryCode}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Region:</span>
                <span className="text-white font-medium">
                  {countryInfo[0]?.region || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldMap;