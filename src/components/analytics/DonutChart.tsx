'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DonutChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  width?: number;
  height?: number;
  title?: string;
  centerText?: string;
}

export default function DonutChart({ 
  data, 
  width = 300, 
  height = 300, 
  title,
  centerText
}: DonutChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const radius = Math.min(width, height) / 2 - 20;
    const innerRadius = radius * 0.6;
    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Color scale
    const colorScale = d3
      .scaleOrdinal()
      .domain(data.map(d => d.label))
      .range(['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6']);

    // Pie generator
    const pie = d3
      .pie<{ label: string; value: number; color?: string }>()
      .value(d => d.value)
      .sort(null);

    // Arc generator
    const arc = d3
      .arc<d3.PieArcDatum<{ label: string; value: number; color?: string }>>()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    // Create pie slices
    const slices = g
      .selectAll('.slice')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'slice');

    // Add paths
    slices
      .append('path')
      .attr('d', arc)
      .attr('fill', (d) => d.data.color || colorScale(d.data.label) as string)
      .style('cursor', 'pointer')
      .style('stroke', 'white')
      .style('stroke-width', 2)
      .on('mouseover', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('transform', 'scale(1.05)');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('transform', 'scale(1)');
        d3.selectAll('.tooltip').remove();
      });

    // Center text
    if (centerText) {
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('font-size', '24px')
        .style('font-weight', 'bold')
        .style('fill', 'currentColor')
        .text(centerText);
    }

    // Legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${radius + 20}, ${-data.length * 10})`);

    legend.selectAll('.legend-item')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (_, i) => `translate(0, ${i * 20})`)
      .each(function(d) {
        const item = d3.select(this);
        
        item.append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', d.color || colorScale(d.label) as string);
        
        item.append('text')
          .attr('x', 18)
          .attr('y', 6)
          .attr('dy', '0.35em')
          .style('font-size', '12px')
          .style('fill', 'currentColor')
          .text(`${d.label} (${d.value})`);
      });

  }, [data, width, height, centerText]);

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