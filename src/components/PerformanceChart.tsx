import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  area,
  axisBottom,
  axisLeft,
  bisector,
  curveMonotoneX,
  line,
  max,
  mean,
  pointer,
  scaleLinear,
  select,
} from 'd3';
import { DpsSample } from '../game/types';

interface PerformanceChartProps {
  samples: DpsSample[];
  currentDps: number;
  width?: number;
  height?: number;
}

function formatRunTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function formatDpsValue(val: number): string {
  if (val >= 1000) {
    return `${(val / 1000).toFixed(1)}k`;
  }
  return String(Math.round(val));
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  samples,
  currentDps,
  width = 276,
  height = 132,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverSample, setHoverSample] = useState<DpsSample | null>(null);

  const normalizedSamples = useMemo<DpsSample[]>(() => {
    if (samples.length === 0) {
      return [
        { timeSec: 0, dps: 0 },
        { timeSec: 1, dps: Math.max(0, currentDps) },
      ];
    }
    if (samples.length === 1) {
      const only = samples[0];
      return [
        only,
        { timeSec: Math.max(1, only.timeSec + 1), dps: Math.max(0, currentDps) },
      ];
    }
    return samples;
  }, [samples, currentDps]);

  const stats = useMemo(() => {
    const peak = max(normalizedSamples, (d) => d.dps) ?? 0;
    const avg = mean(normalizedSamples, (d) => d.dps) ?? 0;
    return {
      peak: Math.round(peak),
      avg: Math.round(avg),
    };
  }, [normalizedSamples]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const margin = { top: 10, right: 10, bottom: 22, left: 34 };
    const innerW = Math.max(40, width - margin.left - margin.right);
    const innerH = Math.max(30, height - margin.top - margin.bottom);

    const maxTime = Math.max(5, normalizedSamples[normalizedSamples.length - 1]?.timeSec ?? 5);
    const maxDps = Math.max(20, (max(normalizedSamples, (d) => d.dps) ?? 20) * 1.15);

    const xScale = scaleLinear().domain([0, maxTime]).range([0, innerW]);
    const yScale = scaleLinear().domain([0, maxDps]).nice(4).range([innerH, 0]);

    const svg = select(svgEl);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', 'perf-dps-area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#e5303a').attr('stop-opacity', 0.42);
    areaGrad.append('stop').attr('offset', '75%').attr('stop-color', '#b3121a').attr('stop-opacity', 0.14);
    areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#3a0a0e').attr('stop-opacity', 0);

    const glowFilter = defs.append('filter').attr('id', 'perf-dps-glow');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '1.8').attr('result', 'blur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Subtle horizontal gridlines
    const yTicks = yScale.ticks(3);
    root
      .append('g')
      .attr('class', 'dps-grid')
      .selectAll('line')
      .data(yTicks)
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#2e333c')
      .attr('stroke-dasharray', '2,3')
      .attr('stroke-width', 1);

    // X & Y Axes
    const xAxis = axisBottom<number>(xScale)
      .ticks(4)
      .tickSize(3)
      .tickFormat((d) => formatRunTime(Number(d)));
    const yAxis = axisLeft<number>(yScale)
      .ticks(3)
      .tickSize(3)
      .tickFormat((d) => formatDpsValue(Number(d)));

    const gx = root
      .append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis);
    gx.select('.domain').attr('stroke', '#3a3f47');
    gx.selectAll('line').attr('stroke', '#3a3f47');
    gx.selectAll('text')
      .attr('fill', '#8e8168')
      .attr('font-size', '9px')
      .attr('font-family', 'Spectral, Georgia, serif');

    const gy = root.append('g').call(yAxis);
    gy.select('.domain').attr('stroke', '#3a3f47');
    gy.selectAll('line').attr('stroke', '#3a3f47');
    gy.selectAll('text')
      .attr('fill', '#8e8168')
      .attr('font-size', '9px')
      .attr('font-family', 'Spectral, Georgia, serif');

    // Area fill under DPS line
    const dpsArea = area<DpsSample>()
      .x((d) => xScale(d.timeSec))
      .y0(innerH)
      .y1((d) => yScale(d.dps))
      .curve(curveMonotoneX);

    root
      .append('path')
      .datum(normalizedSamples)
      .attr('fill', 'url(#perf-dps-area-grad)')
      .attr('d', dpsArea);

    // Crimson DPS Line
    const dpsLine = line<DpsSample>()
      .x((d) => xScale(d.timeSec))
      .y((d) => yScale(d.dps))
      .curve(curveMonotoneX);

    root
      .append('path')
      .datum(normalizedSamples)
      .attr('fill', 'none')
      .attr('stroke', '#e5303a')
      .attr('stroke-width', 2)
      .attr('filter', 'url(#perf-dps-glow)')
      .attr('d', dpsLine);

    // Peak DPS marker
    let peakSample = normalizedSamples[0];
    for (let i = 1; i < normalizedSamples.length; i++) {
      if (normalizedSamples[i].dps >= peakSample.dps) {
        peakSample = normalizedSamples[i];
      }
    }
    if (peakSample && peakSample.dps > 0) {
      root
        .append('circle')
        .attr('cx', xScale(peakSample.timeSec))
        .attr('cy', yScale(peakSample.dps))
        .attr('r', 3)
        .attr('fill', '#f2a93b')
        .attr('stroke', '#121316')
        .attr('stroke-width', 1.2);
    }

    // Current live point dot
    const lastSample = normalizedSamples[normalizedSamples.length - 1];
    if (lastSample) {
      root
        .append('circle')
        .attr('cx', xScale(lastSample.timeSec))
        .attr('cy', yScale(lastSample.dps))
        .attr('r', 3.2)
        .attr('fill', '#5de4ff')
        .attr('stroke', '#121316')
        .attr('stroke-width', 1.2);
    }

    // Interactive hover focus marker using d3.bisector + d3.pointer
    const focusGroup = root.append('g').style('display', 'none');
    focusGroup
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#d8c9a8')
      .attr('stroke-opacity', 0.45)
      .attr('stroke-dasharray', '2,2');
    focusGroup
      .append('circle')
      .attr('r', 3.6)
      .attr('fill', '#d8c9a8')
      .attr('stroke', '#e5303a')
      .attr('stroke-width', 1.5);

    const bisectTime = bisector<DpsSample, number>((d) => d.timeSec).left;

    root
      .append('rect')
      .attr('width', innerW)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('pointermove', (event: PointerEvent) => {
        const [mx] = pointer(event);
        const targetTime = xScale.invert(mx);
        const idx = bisectTime(normalizedSamples, targetTime, 1);
        const d0 = normalizedSamples[idx - 1];
        const d1 = normalizedSamples[idx];
        const chosen =
          !d1 || !d0
            ? d0 ?? d1
            : targetTime - d0.timeSec > d1.timeSec - targetTime
              ? d1
              : d0;

        if (chosen) {
          focusGroup
            .style('display', null)
            .attr('transform', `translate(${xScale(chosen.timeSec)},0)`);
          focusGroup.select('circle').attr('cy', yScale(chosen.dps));
          setHoverSample(chosen);
        }
      })
      .on('pointerleave', () => {
        focusGroup.style('display', 'none');
        setHoverSample(null);
      });
  }, [normalizedSamples, width, height]);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Live Summary Metrics */}
      <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono-numbers">
        <div className="rounded bg-[#101216]/85 border border-[#2d323b] px-2 py-1 flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-[#8e8168]">Now</span>
          <span className="font-bold text-[#5de4ff]">{Math.round(currentDps)}</span>
        </div>
        <div className="rounded bg-[#101216]/85 border border-[#2d323b] px-2 py-1 flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-[#8e8168]">Peak</span>
          <span className="font-bold text-[#f2a93b]">{stats.peak}</span>
        </div>
        <div className="rounded bg-[#101216]/85 border border-[#2d323b] px-2 py-1 flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-[#8e8168]">Avg</span>
          <span className="font-bold text-[#d8c9a8]">{stats.avg}</span>
        </div>
      </div>

      {/* D3 Line Chart SVG */}
      <div className="relative rounded bg-[#0c0e12]/90 border border-[#2c313a] pt-1 pb-0.5 px-0.5">
        {hoverSample && (
          <div className="pointer-events-none absolute top-1.5 right-2 rounded bg-[#15181e]/95 border border-[#3a3f47] px-1.5 py-0.5 text-[9px] font-mono-numbers text-[#d8c9a8]">
            <span className="text-[#8e8168]">{formatRunTime(hoverSample.timeSec)}</span>
            {' · '}
            <span className="font-bold text-[#e5303a]">{Math.round(hoverSample.dps)} DPS</span>
          </div>
        )}
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block overflow-visible"
          role="img"
          aria-label="Player DPS over the current run"
        />
      </div>
    </div>
  );
};
