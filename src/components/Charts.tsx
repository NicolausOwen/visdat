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

export function YearlyChart({ country }: { country: CountryData | undefined }) {
    if (!country) return null;

    const years = Array.from(country.years).sort((a,b) => a - b);
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
            {
                label: 'Avg Temp (°C)',
                data: yearlyData,
                borderColor: 'rgba(59, 130, 246, 0.6)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.1
            },
            {
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

    return <Line data={data} options={options} />;
}

export function MonthlyChart({ country, selectedYear }: { country: CountryData | undefined, selectedYear: number }) {
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

    const data = {
        labels: months,
        datasets: [{
            label: 'Temp (°C)',
            data: monthlyData,
            backgroundColor: bgColors,
            borderRadius: 4
        }]
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

    return <Bar data={data} options={options} />;
}

interface CompareChartProps {
    countryA: CountryData | undefined;
    countryB: CountryData | undefined;
}

export function CompareChart({ countryA, countryB }: CompareChartProps) {
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
            {
                label: labelA,
                data: dataA,
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: false,
                tension: 0.1
            },
            {
                label: labelB,
                data: dataB,
                borderColor: 'rgba(239, 68, 68, 1)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: false,
                tension: 0.1
            }
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

    return <Line data={data} options={options} />;
}
