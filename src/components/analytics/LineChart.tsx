'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface LineChartProps {
  data: Array<{ date: string; value: number; successful?: number; failed?: number }>;
  width?: number;
  height?: number;
  title?: string;
}

export default function LineChart({ 
  data, 
  width = 600, 
  height = 300, 
  title 
}: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 80, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d');
    const processedData = data.map(d => ({
      ...d,
      date: parseDate(d.date) || new Date()
    }));

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(processedData, d => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(processedData, d => Math.max(d.value, d.successful || 0, d.failed || 0)) || 0])
      .range([innerHeight, 0]);

    // Line generators
    const totalLine = d3
      .line<typeof processedData[0]>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const successfulLine = d3
      .line<typeof processedData[0]>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.successful || 0))
      .curve(d3.curveMonotoneX);

    const failedLine = d3
      .line<typeof processedData[0]>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.failed || 0))
      .curve(d3.curveMonotoneX);

    // Grid lines
    g.selectAll('.grid-line-y')
      .data(yScale.ticks())
      .enter()
      .append('line')
      .attr('class', 'grid-line-y')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .style('stroke', 'currentColor')
      .style('stroke-opacity', 0.1)
      .style('stroke-width', 1);

    // Add lines
    g.append('path')
      .datum(processedData)
      .attr('class', 'total-line')
      .attr('d', totalLine)
      .style('fill', 'none')
      .style('stroke', '#3b82f6')
      .style('stroke-width', 2);

    if (processedData.some(d => d.successful !== undefined)) {
      g.append('path')
        .datum(processedData)
        .attr('class', 'successful-line')
        .attr('d', successfulLine)
        .style('fill', 'none')
        .style('stroke', '#10b981')
        .style('stroke-width', 2);
    }

    if (processedData.some(d => d.failed !== undefined)) {
      g.append('path')
        .datum(processedData)
        .attr('class', 'failed-line')
        .attr('d', failedLine)
        .style('fill', 'none')
        .style('stroke', '#ef4444')
        .style('stroke-width', 2);
    }

    // Add dots
    g.selectAll('.dot-total')
      .data(processedData)
      .enter()
      .append('circle')
      .attr('class', 'dot-total')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.value))
      .attr('r', 4)
      .style('fill', '#3b82f6')
      .style('cursor', 'pointer')
      .on('mouseover', function() {
        d3.select(this).attr('r', 6);
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 4);
        d3.selectAll('.tooltip').remove();
      });

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .tickFormat((d) => d3.timeFormat('%m/%d')(d as Date))
      )
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', 'currentColor');
      
    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', 'currentColor');

    // Legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth + 10}, 20)`);

    const legendData = [
      { label: 'Total', color: '#3b82f6' },
      ...(processedData.some(d => d.successful !== undefined) ? [{ label: 'Successful', color: '#10b981' }] : []),
      ...(processedData.some(d => d.failed !== undefined) ? [{ label: 'Failed', color: '#ef4444' }] : [])
    ];

    legend.selectAll('.legend-item')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`)
      .each(function(d) {
        const item = d3.select(this);
        
        item.append('line')
          .attr('x1', 0)
          .attr('x2', 15)
          .attr('y1', 0)
          .attr('y2', 0)
          .style('stroke', d.color)
          .style('stroke-width', 2);
        
        item.append('text')
          .attr('x', 20)
          .attr('y', 0)
          .attr('dy', '0.35em')
          .style('font-size', '12px')
          .style('fill', 'currentColor')
          .text(d.label);
      });

  }, [data, width, height]);

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
      )}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}