'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@modular-app/ui';
import { LayoutDashboard, Loader2 } from 'lucide-react';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'table' | 'chart';
  count?: number;
  className?: string;
}

// Reusable skeleton components for different content types
const CardSkeleton = ({ className = '' }: { className?: string }) => (
  <Card className={`animate-pulse ${className}`}>
    <CardHeader className="space-y-2">
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="h-3 bg-muted rounded w-1/2"></div>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="h-8 bg-muted rounded w-1/4"></div>
      <div className="h-3 bg-muted rounded w-full"></div>
      <div className="h-3 bg-muted rounded w-2/3"></div>
    </CardContent>
  </Card>
);

const ListSkeleton = ({ count = 5, className = '' }: { count?: number; className?: string }) => (
  <div className={`space-y-3 animate-pulse ${className}`}>
    {[...Array(count)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 border rounded">
        <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
        </div>
        <div className="w-16 h-6 bg-muted rounded"></div>
      </div>
    ))}
  </div>
);

const TableSkeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse ${className}`}>
    {/* Table Header */}
    <div className="border rounded-t-md">
      <div className="grid grid-cols-4 gap-4 p-4 border-b bg-muted/20">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded"></div>
        ))}
      </div>
      
      {/* Table Rows */}
      {[...Array(6)].map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-4 gap-4 p-4 border-b">
          {[...Array(4)].map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-muted rounded"></div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const ChartSkeleton = ({ className = '' }: { className?: string }) => (
  <Card className={`animate-pulse ${className}`}>
    <CardHeader>
      <div className="h-5 bg-muted rounded w-1/3"></div>
      <div className="h-3 bg-muted rounded w-1/2"></div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {/* Chart bars */}
        <div className="flex items-end gap-2 h-32">
          {[...Array(7)].map((_, i) => (
            <div 
              key={i} 
              className="bg-muted rounded-t flex-1"
              style={{ height: `${20 + Math.random() * 80}%` }}
            ></div>
          ))}
        </div>
        {/* Chart labels */}
        <div className="flex justify-between">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-3 bg-muted rounded w-8"></div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

const LoadingSkeleton = ({ variant = 'card', count = 1, className = '' }: LoadingSkeletonProps) => {
  switch (variant) {
    case 'list':
      return <ListSkeleton count={count} className={className} />;
    case 'table':
      return <TableSkeleton className={className} />;
    case 'chart':
      return <ChartSkeleton className={className} />;
    case 'card':
    default:
      return (
        <div className={`grid gap-6 ${className}`}>
          {[...Array(count)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      );
  }
};

// Main loading component for different page layouts
export default function AdminLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="animate-pulse space-y-4">
        {/* Breadcrumbs skeleton */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-muted rounded"></div>
          <div className="h-3 bg-muted rounded w-20"></div>
        </div>
        
        {/* Page title skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="h-4 bg-muted rounded w-96"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 bg-muted rounded w-24"></div>
            <div className="h-9 bg-muted rounded w-32"></div>
          </div>
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Main content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Quick actions */}
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 bg-muted rounded w-1/2"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 bg-muted rounded"></div>
            ))}
          </CardContent>
        </Card>

        {/* Right columns - Recent activity */}
        <Card className="lg:col-span-2 animate-pulse">
          <CardHeader>
            <div className="h-5 bg-muted rounded w-1/3"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <ListSkeleton count={5} />
            <div className="h-9 bg-muted rounded w-full mt-4"></div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom section grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System health */}
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 bg-muted rounded w-1/2"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-muted rounded-full"></div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                  <div className="h-5 bg-muted rounded w-12"></div>
                </div>
                {i > 0 && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-muted-foreground h-2 rounded-full w-1/3"></div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top content */}
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 bg-muted rounded w-1/2"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-muted rounded-full flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-9 bg-muted rounded w-full mt-4"></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Specialized loading components for different page types
export const DashboardLoading = () => <AdminLoading />;

export const ContentLoading = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="animate-pulse space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-muted rounded"></div>
        <div className="h-3 bg-muted rounded w-20"></div>
      </div>
      <div className="flex items-center justify-between">
        <div className="h-8 bg-muted rounded w-32"></div>
        <div className="h-9 bg-muted rounded w-28"></div>
      </div>
    </div>

    {/* Filters */}
    <div className="animate-pulse flex gap-4">
      <div className="h-9 bg-muted rounded w-32"></div>
      <div className="h-9 bg-muted rounded w-24"></div>
      <div className="h-9 bg-muted rounded w-20"></div>
    </div>

    {/* Table */}
    <LoadingSkeleton variant="table" />
  </div>
);

export const FormLoading = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="animate-pulse space-y-2">
      <div className="h-8 bg-muted rounded w-48"></div>
      <div className="h-4 bg-muted rounded w-96"></div>
    </div>

    {/* Form */}
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-5 bg-muted rounded w-1/3"></div>
      </CardHeader>
      <CardContent className="space-y-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="h-9 bg-muted rounded w-full"></div>
          </div>
        ))}
        <div className="flex gap-2 pt-4">
          <div className="h-9 bg-muted rounded w-20"></div>
          <div className="h-9 bg-muted rounded w-16"></div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export const AnalyticsLoading = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="animate-pulse space-y-2">
      <div className="h-8 bg-muted rounded w-32"></div>
      <div className="h-4 bg-muted rounded w-64"></div>
    </div>

    {/* Stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <LoadingSkeleton variant="chart" count={2} className="grid-cols-1" />
    </div>
  </div>
);

// Centered loading spinner for full-page loading
export const CenteredLoading = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Loading Admin Panel</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  </div>
);

// Export the specialized components
export { LoadingSkeleton };