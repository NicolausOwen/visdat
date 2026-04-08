'use client';
import { useState, useEffect } from 'react';
import { useClimateData, fetchFlag } from '@/hooks/useClimateData';
import Map from './Map';
import { YearlyChart, MonthlyChart, CompareChart } from './Charts';

export default function Dashboard() {
    const { state, loading, error } = useClimateData();

    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
    
    const [compareCountryA, setCompareCountryA] = useState<string | null>(null);
    const [compareYearA, setCompareYearA] = useState<number | null>(null);
    const [compareCountryB, setCompareCountryB] = useState<string | null>(null);
    const [compareYearB, setCompareYearB] = useState<number | null>(null);

    const [flagA, setFlagA] = useState<string | null>(null);
    const [flagB, setFlagB] = useState<string | null>(null);

    useEffect(() => {
        if (state && !selectedYear && !selectedCountryCode) {
            const initialYear = state.years[0];
            const worldEntity = state.countries.find(c => c.entity === 'World');
            const initialCountry = worldEntity ? worldEntity.code : state.countries[0].code;
            
            const validCountries = state.countries.filter(c => !c.code.startsWith('ENTITY_') && c.entity !== 'World');
            const initialCompB = validCountries.length > 0 ? validCountries[0].code : initialCountry;

            setSelectedYear(initialYear);
            setSelectedCountryCode(initialCountry);

            setCompareCountryA(initialCountry);
            setCompareYearA(initialYear);
            setCompareCountryB(initialCompB);
            setCompareYearB(initialYear);
        }
    }, [state, selectedYear, selectedCountryCode]);

    useEffect(() => {
        if (compareCountryA) {
            fetchFlag(compareCountryA).then(setFlagA);
        }
    }, [compareCountryA]);

    useEffect(() => {
        if (compareCountryB) {
            fetchFlag(compareCountryB).then(setFlagB);
        }
    }, [compareCountryB]);

    if (error) {
        return <div className="flex-1 flex justify-center items-center p-4">
            <div className="bg-red-100 text-red-700 p-4 rounded shadow">Error loading data: {error}</div>
        </div>;
    }

    if (loading || !state || !selectedYear || !selectedCountryCode) {
        return (
            <div className="flex-1 flex flex-col justify-center items-center bg-gray-50 absolute inset-0 z-50">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                <p className="mt-4 text-lg text-gray-600 font-semibold">Processing climate data (~200k records)...</p>
            </div>
        );
    }

    const handleCountrySelect = (code: string) => {
        setSelectedCountryCode(code);
        if (!code.startsWith('ENTITY_') && code !== 'OWID_WRL') {
            setCompareCountryA(code);
            setCompareYearA(selectedYear);
        }
    };

    const yearDataObj = state.dataByYear[selectedYear] || {};
    const yearData = Object.values(yearDataObj);
    const globalAvg = state.globalAvgByYear[selectedYear];

    const regionsToExclude = ['World', 'Europe', 'Africa', 'Asia', 'North America', 'South America', 'Oceania', 'Antarctica'];
    const countriesOnly = yearData.filter(d => !d.code.startsWith('ENTITY_') && !regionsToExclude.includes(d.entity));

    let hottest = { entity: 'N/A', temp: 0 };
    let coldest = { entity: 'N/A', temp: 0 };
    
    if (countriesOnly.length > 0) {
        hottest = countriesOnly.reduce((max, obj) => obj.temp > max.temp ? obj : max, countriesOnly[0]);
        coldest = countriesOnly.reduce((min, obj) => obj.temp < min.temp ? obj : min, countriesOnly[0]);
    }

    const currentCountry = state.dataByCountry[selectedCountryCode];
    const currentTemp = currentCountry ? currentCountry.yearly[selectedYear] : undefined;
    const prevTemp = currentCountry ? currentCountry.yearly[selectedYear - 1] : undefined;
    let diffStr = 'N/A';
    let diffColor = 'text-gray-400';
    if (currentTemp !== undefined && prevTemp !== undefined) {
        const diff = currentTemp - prevTemp;
        const sign = diff > 0 ? '+' : '';
        diffColor = diff > 0 ? 'text-red-600' : (diff < 0 ? 'text-blue-600' : 'text-gray-600');
        diffStr = `${sign}${diff.toFixed(2)} °C`;
    }

    const cA = compareCountryA ? state.dataByCountry[compareCountryA] : undefined;
    const cB = compareCountryB ? state.dataByCountry[compareCountryB] : undefined;

    return (
        <div className="flex-1 flex flex-col p-2 md:p-4 gap-4 bg-gray-50 text-gray-800 font-sans">
            <header className="bg-white shadow px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 rounded-xl shrink-0">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                    Average temperature Dashboard
                </h1>
                <div className="flex items-center space-x-2 md:space-x-4 w-full md:w-auto justify-between md:justify-end">
                    <label className="font-semibold text-gray-600 text-sm md:text-base">Map Year:</label>
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5 px-3 border bg-white cursor-pointer w-full md:w-auto"
                    >
                        {state.years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 shrink-0">
                        <div className="bg-white p-3 md:p-4 rounded-xl shadow border border-gray-100 flex flex-col justify-center col-span-2 md:col-span-1">
                            <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wide">Global Avg Temp</h3>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">
                                    {globalAvg !== null && globalAvg !== undefined ? globalAvg.toFixed(2) : 'N/A'}
                                </p>
                                <span className="text-xs md:text-sm text-gray-500 font-semibold">°C</span>
                            </div>
                        </div>
                        <div className="bg-white p-3 md:p-4 rounded-xl shadow border border-gray-100 flex flex-col justify-center">
                            <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wide">Hottest Country</h3>
                            <p className="text-lg md:text-xl font-bold text-red-600 mt-1 truncate">{hottest.entity}</p>
                            <p className="text-xs md:text-sm text-gray-500 font-semibold">{hottest.temp ? hottest.temp.toFixed(2) + ' °C' : '-'}</p>
                        </div>
                        <div className="bg-white p-3 md:p-4 rounded-xl shadow border border-gray-100 flex flex-col justify-center">
                            <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wide">Coldest Country</h3>
                            <p className="text-lg md:text-xl font-bold text-blue-600 mt-1 truncate">{coldest.entity}</p>
                            <p className="text-xs md:text-sm text-gray-500 font-semibold">{coldest.temp ? coldest.temp.toFixed(2) + ' °C' : '-'}</p>
                        </div>
                    </div>

                    <div className="bg-white p-2 md:p-4 rounded-xl shadow border border-gray-100 flex-1 flex flex-col min-h-[300px] md:min-h-[400px]">
                        <h2 className="text-base md:text-lg font-bold text-gray-700 mb-2 px-2 md:px-0">Global Average Temperature Map ({selectedYear})</h2>
                        <Map 
                            state={state} 
                            selectedYear={selectedYear} 
                            selectedCountryCode={selectedCountryCode} 
                            onCountrySelected={handleCountrySelect} 
                        />
                        <p className="text-[10px] md:text-xs text-gray-400 mt-2 text-center px-2 md:px-0">Tip: Click on any country on the map to view its detailed historical data.</p>
                    </div>
                </div>

                <div className="w-full lg:w-[450px] flex flex-col gap-4 shrink-0">
                    <div className="bg-white p-4 md:p-5 rounded-xl shadow border border-gray-100 shrink-0">
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 border-b pb-2 md:pb-3 mb-3 md:mb-4">Country Details</h2>

                        <div className="mb-4 md:mb-5">
                            <label className="block text-xs md:text-sm font-semibold text-gray-600 mb-1">Selected Country/Region:</label>
                            <select 
                                value={selectedCountryCode} 
                                onChange={(e) => handleCountrySelect(e.target.value)}
                                className="w-full border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 py-2 px-3 border bg-white cursor-pointer"
                            >
                                {state.countries.map(c => <option key={c.code} value={c.code}>{c.entity}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                            <div className="bg-gray-50 p-2 md:p-3 rounded-lg border border-gray-200 shadow-sm">
                                <p className="text-[10px] md:text-[11px] text-gray-500 uppercase font-bold tracking-wider">Avg Temp ({selectedYear})</p>
                                <p className="text-xl md:text-2xl font-bold text-gray-800">
                                    {currentTemp !== undefined ? currentTemp.toFixed(2) + ' °C' : 'N/A'}
                                </p>
                            </div>
                            <div className="bg-gray-50 p-2 md:p-3 rounded-lg border border-gray-200 shadow-sm">
                                <p className="text-[10px] md:text-[11px] text-gray-500 uppercase font-bold tracking-wider">vs Prev Year</p>
                                <p className={`text-lg md:text-xl font-bold ${diffColor}`}>{diffStr}</p>
                            </div>
                            <div className="bg-gray-50 p-2 md:p-3 rounded-lg border border-gray-200 shadow-sm">
                                <p className="text-[10px] md:text-[11px] text-gray-500 uppercase font-bold tracking-wider">All-Time High</p>
                                <p className="text-base md:text-lg font-bold text-red-600">
                                    {currentCountry && currentCountry.allTimeHigh !== -Infinity ? currentCountry.allTimeHigh.toFixed(2) + ' °C' : 'N/A'}
                                </p>
                            </div>
                            <div className="bg-gray-50 p-2 md:p-3 rounded-lg border border-gray-200 shadow-sm">
                                <p className="text-[10px] md:text-[11px] text-gray-500 uppercase font-bold tracking-wider">All-Time Low</p>
                                <p className="text-base md:text-lg font-bold text-blue-600">
                                    {currentCountry && currentCountry.allTimeLow !== Infinity ? currentCountry.allTimeLow.toFixed(2) + ' °C' : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-3 md:p-4 rounded-xl shadow border border-gray-100 flex flex-col flex-1 min-h-[200px]">
                        <h3 className="text-xs md:text-sm font-bold text-gray-700 mb-2">Historical Trend (Yearly Average)</h3>
                        <div className="flex-1 relative w-full h-full min-h-[150px]">
                            <YearlyChart country={currentCountry} />
                        </div>
                    </div>

                    <div className="bg-white p-3 md:p-4 rounded-xl shadow border border-gray-100 flex flex-col flex-1 min-h-[200px]">
                        <h3 className="text-xs md:text-sm font-bold text-gray-700 mb-2">Monthly Distribution ({selectedYear})</h3>
                        <div className="flex-1 relative w-full h-full min-h-[150px]">
                            <MonthlyChart country={currentCountry} selectedYear={selectedYear} />
                        </div>
                    </div>
                </div>
            </div>

            {compareCountryA && !compareCountryA.startsWith('ENTITY_') && compareCountryB && !compareCountryB.startsWith('ENTITY_') && (
                <div className="bg-white p-4 md:p-6 rounded-xl shadow border border-gray-100 mt-4 flex flex-col gap-4 md:gap-6">
                    <div className="flex justify-between items-center border-b pb-3 md:pb-4">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Compare Countries</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                        <div className="flex flex-col gap-3 md:gap-4 bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-200">
                            <div className="flex flex-col gap-2 border-b border-gray-200 pb-3">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs md:text-sm font-bold text-gray-600 min-w-[60px] md:min-w-[70px]">Country 1:</label>
                                    <select 
                                        value={compareCountryA || ''} 
                                        onChange={e => setCompareCountryA(e.target.value)}
                                        className="border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5 px-2 md:px-3 border bg-white cursor-pointer flex-1 text-sm"
                                    >
                                        {state.countries.map(c => <option key={c.code} value={c.code}>{c.entity}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs md:text-sm font-bold text-gray-600 min-w-[60px] md:min-w-[70px]">Year 1:</label>
                                    <select 
                                        value={compareYearA || ''} 
                                        onChange={e => setCompareYearA(parseInt(e.target.value))}
                                        className="border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5 px-2 md:px-3 border bg-white cursor-pointer w-full md:w-32 text-sm"
                                    >
                                        {state.years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 md:gap-4">
                                <div 
                                    className="w-16 h-11 md:w-20 md:h-14 bg-gray-200 rounded shadow flex items-center justify-center overflow-hidden bg-cover bg-center shrink-0"
                                    style={{ backgroundImage: flagA ? `url('${flagA}')` : 'none' }}
                                ></div>
                                <div className="min-w-0">
                                    <h3 className="text-lg md:text-2xl font-bold text-gray-800 truncate">{cA ? cA.entity : '-'}</h3>
                                    <p className="text-xs md:text-sm text-gray-500 font-semibold">Selection 1 ({compareYearA})</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 md:gap-4 mt-1 md:mt-2">
                                <div className="bg-white p-2 md:p-0 md:bg-transparent rounded md:rounded-none border md:border-none border-gray-100">
                                    <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-wider">Avg Temp</p>
                                    <p className="text-xl md:text-2xl font-bold text-gray-800">
                                        {cA && compareYearA && cA.yearly[compareYearA] !== undefined ? cA.yearly[compareYearA].toFixed(2) + ' °C' : 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-white p-2 md:p-0 md:bg-transparent rounded md:rounded-none border md:border-none border-gray-100">
                                    <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-wider">All-Time High</p>
                                    <p className="text-lg md:text-xl font-bold text-red-600">
                                        {cA && cA.allTimeHigh !== -Infinity ? cA.allTimeHigh.toFixed(2) + ' °C' : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 md:gap-4 bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-200">
                            <div className="flex flex-col gap-2 border-b border-gray-200 pb-3">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs md:text-sm font-bold text-gray-600 min-w-[60px] md:min-w-[70px]">Country 2:</label>
                                    <select 
                                        value={compareCountryB || ''} 
                                        onChange={e => setCompareCountryB(e.target.value)}
                                        className="border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5 px-2 md:px-3 border bg-white cursor-pointer flex-1 text-sm"
                                    >
                                        {state.countries.map(c => <option key={c.code} value={c.code}>{c.entity}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs md:text-sm font-bold text-gray-600 min-w-[60px] md:min-w-[70px]">Year 2:</label>
                                    <select 
                                        value={compareYearB || ''} 
                                        onChange={e => setCompareYearB(parseInt(e.target.value))}
                                        className="border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5 px-2 md:px-3 border bg-white cursor-pointer w-full md:w-32 text-sm"
                                    >
                                        {state.years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 md:gap-4">
                                <div 
                                    className="w-16 h-11 md:w-20 md:h-14 bg-gray-200 rounded shadow flex items-center justify-center overflow-hidden bg-cover bg-center shrink-0"
                                    style={{ backgroundImage: flagB ? `url('${flagB}')` : 'none' }}
                                ></div>
                                <div className="min-w-0">
                                    <h3 className="text-lg md:text-2xl font-bold text-gray-800 truncate">{cB ? cB.entity : '-'}</h3>
                                    <p className="text-xs md:text-sm text-gray-500 font-semibold">Selection 2 ({compareYearB})</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 md:gap-4 mt-1 md:mt-2">
                                <div className="bg-white p-2 md:p-0 md:bg-transparent rounded md:rounded-none border md:border-none border-gray-100">
                                    <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-wider">Avg Temp</p>
                                    <p className="text-xl md:text-2xl font-bold text-gray-800">
                                        {cB && compareYearB && cB.yearly[compareYearB] !== undefined ? cB.yearly[compareYearB].toFixed(2) + ' °C' : 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-white p-2 md:p-0 md:bg-transparent rounded md:rounded-none border md:border-none border-gray-100">
                                    <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-wider">All-Time High</p>
                                    <p className="text-lg md:text-xl font-bold text-red-600">
                                        {cB && cB.allTimeHigh !== -Infinity ? cB.allTimeHigh.toFixed(2) + ' °C' : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-[250px] md:h-[300px] w-full mt-2 md:mt-4">
                        <CompareChart countryA={cA} countryB={cB} />
                    </div>
                </div>
            )}
        </div>
    );
}
