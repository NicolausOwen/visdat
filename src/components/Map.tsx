'use client';
import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AppState } from '@/hooks/useClimateData';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface MapProps {
    state: AppState;
    selectedYear: number;
    selectedCountryCode: string;
    onCountrySelected: (code: string) => void;
}

export default function GlobalMap({ state, selectedYear, selectedCountryCode, onCountrySelected }: MapProps) {
    const plotRef = useRef<any>(null);

    const yearDataObj = state.dataByYear[selectedYear] || {};
    const yearData = Object.values(yearDataObj).filter(d => !d.code.startsWith('ENTITY_'));
    
    const locations = yearData.map(d => d.code);
    const z = yearData.map(d => d.temp);
    const text = yearData.map(d => d.entity);

    const zmin = z.length > 0 ? Math.min(...z) : 0;
    const zmax = z.length > 0 ? Math.max(...z) : 40;

    const colorscale: any = [
        [0, '#1e3a8a'],      // Deep Blue
        [0.2, '#3b82f6'],
        [0.4, '#93c5fd'],
        [0.6, '#fef08a'],    // Yellow
        [0.8, '#f87171'],
        [1, '#991b1b']       // Dark Red
    ];

    const data: any[] = [{
        type: 'choropleth',
        locations: locations,
        z: z,
        text: text,
        colorscale: colorscale,
        zmin: zmin,
        zmax: zmax,
        autocolorscale: false,
        reversescale: false,
        marker: {
            line: { color: 'rgba(255,255,255,0.3)', width: 0.5 }
        },
        colorbar: {
            title: '°C',
            thickness: 15,
            len: 0.8,
            outlinewidth: 0,
            tickfont: { family: 'sans-serif' }
        },
        name: 'World'
    }];

    if (selectedCountryCode && !selectedCountryCode.startsWith('ENTITY_')) {
        const countryData = yearDataObj[selectedCountryCode];
        data.push({
            type: 'choropleth',
            locations: [selectedCountryCode],
            z: [countryData ? countryData.temp : 0],
            text: [countryData ? countryData.entity : state.dataByCountry[selectedCountryCode]?.entity || ''],
            colorscale: colorscale,
            zmin: zmin,
            zmax: zmax,
            showscale: false,
            marker: {
                line: { color: '#facc15', width: 3 }
            },
            hoverinfo: 'location+z+text',
            name: 'Selected'
        });
    }

    const layout: any = {
        margin: { l: 0, r: 0, t: 0, b: 0 },
        geo: {
            showframe: false,
            showcoastlines: true,
            coastlinecolor: 'rgba(200,200,200,0.5)',
            projection: { 
                type: 'equirectangular',
            },
            bgcolor: 'rgba(0,0,0,0)'
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        dragmode: 'pan' as const,
        autosize: true,
    };

    const config = {
        responsive: true,
        displayModeBar: false,
        scrollZoom: true
    };

    useEffect(() => {
        let zoomInterval: any = null;

        async function zoomToCountry(code: string) {
            if (!code || code.startsWith('ENTITY_')) return;
            if (!plotRef.current || !plotRef.current.el) return;

            try {
                const res = await fetch(`https://restcountries.com/v3.1/alpha/${code}`);
                if (!res.ok) return;
                const cData = await res.json();
                
                if (cData && cData[0] && cData[0].latlng) {
                    const [lat, lon] = cData[0].latlng;
                    
                    let scale = 3.5;
                    if (cData[0].area) {
                        if (cData[0].area > 5000000) scale = 1.5;
                        else if (cData[0].area > 1000000) scale = 2.5;
                        else if (cData[0].area < 100000) scale = 6;
                        else if (cData[0].area < 10000) scale = 12;
                    }

                    // We need to use Plotly directly to relayout for animation
                    const Plotly = (window as any).Plotly;
                    if (!Plotly) return;

                    const el = plotRef.current.el;
                    const currentCenter = el.layout?.geo?.center || { lat: 0, lon: 0 };
                    const currentScale = el.layout?.geo?.projection?.scale || 1;
                    
                    const startLat = currentCenter.lat || 0;
                    const startLon = currentCenter.lon || 0;
                    
                    let step = 0;
                    const steps = 40;
                    
                    if (zoomInterval) clearInterval(zoomInterval);
                    
                    zoomInterval = setInterval(() => {
                        step++;
                        const t = step / steps;
                        const easeT = 1 - Math.pow(1 - t, 3);
                        
                        const newScale = currentScale + (scale - currentScale) * easeT;
                        const newLat = startLat + (lat - startLat) * easeT;
                        let newLon = startLon + (lon - startLon) * easeT;
                        
                        if (Math.abs(lon - startLon) > 180) {
                            const adjustLon = lon > startLon ? lon - 360 : lon + 360;
                            newLon = startLon + (adjustLon - startLon) * easeT;
                            if(newLon > 180) newLon -= 360;
                            if(newLon < -180) newLon += 360;
                        }
        
                        Plotly.relayout(el, {
                            'geo.center': { lat: newLat, lon: newLon },
                            'geo.projection.scale': newScale
                        });
                        
                        if (step >= steps) {
                            clearInterval(zoomInterval);
                        }
                    }, 16);
                }
            } catch(err) {
                console.error("Zoom fetch failed:", err);
            }
        }

        // Give the plot a tiny bit of time to initialize on first load
        let timeoutId: any;
        if (plotRef.current && plotRef.current.el && plotRef.current.el._fullLayout) {
             zoomToCountry(selectedCountryCode);
        } else {
             timeoutId = setTimeout(() => {
                 zoomToCountry(selectedCountryCode);
             }, 300);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (zoomInterval) clearInterval(zoomInterval);
        }
    }, [selectedCountryCode]);

    return (
        <div className="flex-1 w-full rounded overflow-hidden">
            <Plot
                onInitialized={(figure: any, graphDiv: any) => {
                    plotRef.current = { el: graphDiv };
                }}
                onUpdate={(figure: any, graphDiv: any) => {
                    if (!plotRef.current) {
                        plotRef.current = { el: graphDiv };
                    }
                }}
                data={data}
                layout={layout}
                config={config}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
                onClick={(e) => {
                    if(e.points && e.points.length > 0) {
                        const clickedCode = (e.points[0] as any).location;
                        if (state.countries.find(c => c.code === clickedCode)) {
                            onCountrySelected(clickedCode as string);
                        }
                    }
                }}
            />
        </div>
    );
}
