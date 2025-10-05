'use client';

import { AlertCircle } from 'lucide-react';

export function ErrorState() {
  return (
    <div className="container mx-auto p-6">
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No data available</h3>
        <p className="text-muted-foreground">Unable to load analytics data.</p>
      </div>
    </div>
  );
}