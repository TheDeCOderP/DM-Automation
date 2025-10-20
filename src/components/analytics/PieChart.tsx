'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface PieChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  width?: number;
  height?: number;
  title?: string;
}

export default function PieChart({ 
  data, 
  width = 300, 
  height = 300, 
  title 
}: PieChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const radius = Math.min(width, height) / 2 - 20;
    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Color scale
    const colorScale = d3
      .scaleOrdinal()
      .domain(data.map(d => d.label))
      .range(['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']);

    // Pie generator
    const pie = d3
      .pie<{ label: string; value: number; color?: string }>()
      .value(d => d.value)
      .sort(null);

    // Arc generator
    const arc = d3
      .arc<d3.PieArcDatum<{ label: string; value: number; color?: string }>>()
      .innerRadius(0)
      .outerRadius(radius);

    const outerArc = d3
      .arc<d3.PieArcDatum<{ label: string; value: number; color?: string }>>()
      .innerRadius(radius * 1.1)
      .outerRadius(radius * 1.1);

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

    // Add labels
    slices
      .append('text')
      .attr('transform', d => {
        const pos = outerArc.centroid(d);
        pos[0] = radius * 1.2 * (midAngle(d) < Math.PI ? 1 : -1);
        return `translate(${pos})`;
      })
      .style('text-anchor', d => midAngle(d) < Math.PI ? 'start' : 'end')
      .style('font-size', '12px')
      .style('fill', 'currentColor')
      .text(d => d.data.label);

    // Add polylines
    slices
      .append('polyline')
      .attr('points', d => {
        const pos = outerArc.centroid(d);
        pos[0] = radius * 1.2 * (midAngle(d) < Math.PI ? 1 : -1);
        return [arc.centroid(d), outerArc.centroid(d), pos].map(p => p.join(',')).join(' ');
      })
      .style('fill', 'none')
      .style('stroke', 'currentColor')
      .style('stroke-width', 1)
      .style('opacity', 0.5);

    function midAngle(d: d3.PieArcDatum<{ label: string; value: number; color?: string }>) {
      return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }

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