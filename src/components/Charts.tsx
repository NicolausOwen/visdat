'use client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { CountryData, AppState } from '@/hooks/useClimateData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export type ChartVariant = 'line' | 'bar' | 'area' | 'scatter' | 'stepped';

function getDatasetConfig(variant: ChartVariant, color: string, bgColor: string, label: string, data: any[]) {
    const isBar = variant === 'bar';
    return {
        type: (isBar ? 'bar' : 'line') as any,
        label,
        data,
        borderColor: color,
        backgroundColor: variant === 'area' ? color.replace('1)', '0.2)').replace('0.8)', '0.2)') : (isBar ? color : bgColor),
        borderWidth: isBar ? 1 : 2,
        fill: variant === 'area',
        stepped: variant === 'stepped',
        showLine: variant !== 'scatter',
        pointRadius: variant === 'scatter' ? 3 : 0,
        pointHoverRadius: 5,
        tension: variant === 'stepped' ? 0 : 0.1
    };
}

export function YearlyChart({ country, startYear, endYear, chartType = 'line' }: { country: CountryData | undefined, startYear?: number, endYear?: number, chartType?: ChartVariant }) {
    if (!country) return null;

    let years = Array.from(country.years).sort((a,b) => a - b);
    
    if (startYear !== undefined) {
        years = years.filter(y => y >= startYear);
    }
    if (endYear !== undefined) {
        years = years.filter(y => y <= endYear);
    }

    const yearlyData = years.map(y => country.yearly[y]);

    const windowSize = 5;
    const movingAvg = yearlyData.map((val, idx, arr) => {
        if (idx < windowSize - 1 || val === undefined) return null;
        let sum = 0;
        let count = 0;
        for (let i = 0; i < windowSize; i++) {
            if (arr[idx - i] !== undefined) {
                sum += arr[idx - i];
                count++;
            }
        }
        return count === windowSize ? sum / windowSize : null;
    });

    const data = {
        labels: years,
        datasets: [
            getDatasetConfig(chartType, 'rgba(59, 130, 246, 0.8)', 'rgba(59, 130, 246, 0.1)', 'Avg Temp (°C)', yearlyData),
            {
                type: 'line' as any,
                label: '5-Year MA',
                data: movingAvg,
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 2,
                pointRadius: 0,
                borderDash: [5, 5],
                fill: false,
                tension: 0.4
            }
        ]
    };

    const options: any = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } }
        },
        scales: {
            y: { ticks: { font: { size: 10 } } },
            x: { ticks: { font: { size: 10 }, maxTicksLimit: 10 } }
        }
    };

    if (chartType === 'bar') {
        return <Bar data={data as any} options={options} />;
    }
    return <Line data={data as any} options={options} />;
}

export function MonthlyChart({ country, selectedYear, chartType = 'bar' }: { country: CountryData | undefined, selectedYear: number, chartType?: ChartVariant }) {
    if (!country) return null;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = country.monthly[selectedYear] || new Array(12).fill(null);

    const bgColors = monthlyData.map(t => {
        if (t === null) return '#e5e7eb';
        if (t < 0) return 'rgba(59, 130, 246, 0.8)';
        if (t < 15) return 'rgba(52, 211, 153, 0.8)';
        if (t < 25) return 'rgba(250, 204, 21, 0.8)';
        return 'rgba(239, 68, 68, 0.8)';
    });

    const dataset = getDatasetConfig(chartType, 'rgba(59, 130, 246, 0.8)', 'rgba(59, 130, 246, 0.1)', 'Temp (°C)', monthlyData);
    
    if (chartType === 'bar') {
        (dataset as any).backgroundColor = bgColors;
        (dataset as any).borderRadius = 4;
    }

    const data = {
        labels: months,
        datasets: [dataset]
    };

    const options: any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { ticks: { font: { size: 10 } } },
            x: { ticks: { font: { size: 10 } } }
        }
    };

    if (chartType === 'bar') {
        return <Bar data={data as any} options={options} />;
    }
    return <Line data={data as any} options={options} />;
}

interface CompareChartProps {
    countryA: CountryData | undefined;
    countryB: CountryData | undefined;
    chartType?: ChartVariant;
}

export function CompareChart({ countryA, countryB, chartType = 'line' }: CompareChartProps) {
    const yearsSet = new Set<number>();
    if (countryA) countryA.years.forEach(y => yearsSet.add(y));
    if (countryB) countryB.years.forEach(y => yearsSet.add(y));
    const allYears = Array.from(yearsSet).sort((a,b) => a - b);

    const dataA = countryA ? allYears.map(y => countryA.yearly[y] !== undefined ? countryA.yearly[y] : null) : [];
    const dataB = countryB ? allYears.map(y => countryB.yearly[y] !== undefined ? countryB.yearly[y] : null) : [];

    let labelA = countryA ? countryA.entity : 'Country A';
    let labelB = countryB ? countryB.entity : 'Country B';
    if (labelA === labelB) {
        labelA += ' (Selection 1)';
        labelB += ' (Selection 2)';
    }

    const data = {
        labels: allYears,
        datasets: [
            getDatasetConfig(chartType, 'rgba(59, 130, 246, 1)', 'rgba(59, 130, 246, 0.1)', labelA, dataA),
            getDatasetConfig(chartType, 'rgba(239, 68, 68, 1)', 'rgba(239, 68, 68, 0.1)', labelB, dataB)
        ]
    };

    const options: any = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: `Historical Yearly Temperature Comparison` }
        },
        scales: {
            y: { title: { display: true, text: 'Temp (°C)' } },
            x: { ticks: { maxTicksLimit: 15 } }
        }
    };

    if (chartType === 'bar') {
        return <Bar data={data as any} options={options} />;
    }
    return <Line data={data as any} options={options} />;
}