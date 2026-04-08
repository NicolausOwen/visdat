import { useState, useEffect } from 'react';
import Papa from 'papaparse';

export interface YearData {
    entity: string;
    temp: number;
    code: string;
}

export interface CountryData {
    entity: string;
    code: string;
    yearly: Record<number, number>;
    monthly: Record<number, (number | null)[]>;
    allTimeHigh: number;
    allTimeLow: number;
    years: Set<number>;
}

export interface AppState {
    dataByYear: Record<number, Record<string, YearData>>;
    dataByCountry: Record<string, CountryData>;
    years: number[];
    countries: { entity: string; code: string }[];
    globalAvgByYear: Record<number, number | null>;
}

export function useClimateData() {
    const [state, setState] = useState<AppState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/average-monthly-surface-temperature.csv')
            .then(response => {
                if (!response.ok) throw new Error("Could not fetch the CSV file.");
                return response.text();
            })
            .then(csvText => {
                Papa.parse(csvText, {
                    header: false,
                    skipEmptyLines: true,
                    dynamicTyping: true,
                    complete: function(results) {
                        processData(results.data as any[][]);
                    }
                });
            })
            .catch(err => {
                console.error(err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    function processData(rawData: any[][]) {
        const dataRows = rawData.slice(1);
        
        const dataByCountry: Record<string, CountryData> = {};
        const dataByYear: Record<number, Record<string, YearData>> = {};
        const yearsSet = new Set<number>();
        const countriesMap = new Map<string, string>();
        
        dataRows.forEach(row => {
            const entity = row[0];
            let code = row[1];
            if (!code) code = `ENTITY_${String(entity).toUpperCase().replace(/\s+/g, '_')}`;
            
            const year = parseInt(row[2]);
            const day = row[3];
            const monthlyTemp = parseFloat(row[4]);
            const yearlyTemp = parseFloat(row[5]);
            
            if (!entity || isNaN(year) || isNaN(monthlyTemp)) return;

            if (!dataByCountry[code]) {
                dataByCountry[code] = {
                    entity,
                    code,
                    yearly: {},
                    monthly: {},
                    allTimeHigh: -Infinity,
                    allTimeLow: Infinity,
                    years: new Set()
                };
                countriesMap.set(code, entity);
            }
            
            if (!dataByYear[year]) {
                dataByYear[year] = {};
                yearsSet.add(year);
            }

            const countryObj = dataByCountry[code];
            countryObj.years.add(year);

            const monthMatch = String(day).match(/\d{4}-(\d{2})-\d{2}/);
            const monthNum = monthMatch ? parseInt(monthMatch[1], 10) : 1;

            if (!countryObj.monthly[year]) {
                countryObj.monthly[year] = new Array(12).fill(null);
            }
            countryObj.monthly[year][monthNum - 1] = monthlyTemp;

            if (countryObj.yearly[year] === undefined && !isNaN(yearlyTemp)) {
                countryObj.yearly[year] = yearlyTemp;
                dataByYear[year][code] = { entity, temp: yearlyTemp, code };
            }

            if (monthlyTemp > countryObj.allTimeHigh) countryObj.allTimeHigh = monthlyTemp;
            if (monthlyTemp < countryObj.allTimeLow) countryObj.allTimeLow = monthlyTemp;
        });

        const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
        const sortedCountries = Array.from(countriesMap.entries())
            .map(([code, entity]) => ({ code, entity }))
            .sort((a, b) => a.entity.localeCompare(b.entity));

        const globalAvgByYear: Record<number, number | null> = {};
        sortedYears.forEach(year => {
            const yearData = Object.values(dataByYear[year]);
            const worldData = yearData.find(d => d.entity === 'World');
            if (worldData) {
                globalAvgByYear[year] = worldData.temp;
            } else {
                const realCountries = yearData.filter(d => !d.code.startsWith('ENTITY_'));
                if(realCountries.length > 0) {
                    const sum = realCountries.reduce((a, b) => a + b.temp, 0);
                    globalAvgByYear[year] = sum / realCountries.length;
                } else {
                    globalAvgByYear[year] = null;
                }
            }
        });

        setState({
            dataByYear,
            dataByCountry,
            years: sortedYears,
            countries: sortedCountries,
            globalAvgByYear
        });
        setLoading(false);
    }

    return { state, loading, error };
}

export async function fetchFlag(code: string): Promise<string | null> {
    if (!code || code.startsWith('ENTITY_')) return null;
    try {
        const res = await fetch(`https://restcountries.com/v3.1/alpha/${code}`);
        if (res.ok) {
            const data = await res.json();
            if (data && data[0] && data[0].flags) {
                return data[0].flags.svg || data[0].flags.png;
            }
        }
    } catch(e) {
        console.error('Flag fetch error:', e);
    }
    return null;
}
