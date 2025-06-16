'use client';

import React, { useState, useMemo } from 'react';
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@modular-app/ui';
import { 
  Search,
  Download,
  Star,
  Eye,
  Calendar,
  Package,
  Filter,
  SortAsc,
  SortDesc,
  ExternalLink,
  Shield,
  Zap,
  FileText,
  BarChart3,
  Settings,
  Loader2,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import type { PluginCapability } from '@modular-app/core';

// Marketplace plugin interface
interface MarketplacePlugin {
  id: string;
  name: string;
  title: string;
  description: string;
  version: string;
  author: string;
  authorUrl?: string;
  homepage?: string;
  repository?: string;
  license: string;
  price: number; // 0 for free
  rating: number; // 1-5
  totalRatings: number;
  downloads: number;
  lastUpdated: Date;
  createdAt: Date;
  capabilities: PluginCapability[];
  tags: string[];
  screenshots: string[];
  changelog?: string;
  requirements: {
    cmsVersion: string;
    nodeVersion: string;
  };
  status: 'published' | 'beta' | 'deprecated';
  featured: boolean;
  verified: boolean;
}

interface PluginMarketplaceProps {
  plugins?: MarketplacePlugin[];
  installedPlugins?: string[]; // Array of installed plugin names
  onInstall?: (plugin: MarketplacePlugin) => Promise<void>;
  onViewDetails?: (plugin: MarketplacePlugin) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'name', label: 'Name A-Z' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'content-management', label: 'Content Management' },
  { value: 'security', label: 'Security' },
  { value: 'performance', label: 'Performance' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'seo', label: 'SEO' },
  { value: 'social', label: 'Social Media' },
  { value: 'forms', label: 'Forms' },
  { value: 'media', label: 'Media' },
];

const PRICE_OPTIONS = [
  { value: 'all', label: 'All Prices' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
];

export function PluginMarketplace({
  plugins = [],
  installedPlugins = [],
  onInstall,
  onViewDetails,
  isLoading = false,
  onRefresh
}: PluginMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [installingPlugin, setInstallingPlugin] = useState<string | null>(null);

  // Filter and sort plugins
  const filteredAndSortedPlugins = useMemo(() => {
    let filtered = plugins.filter(plugin => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          plugin.title.toLowerCase().includes(query) ||
          plugin.description.toLowerCase().includes(query) ||
          plugin.author.toLowerCase().includes(query) ||
          plugin.tags.some(tag => tag.toLowerCase().includes(query));
        
        if (!matchesSearch) return false;
      }
      
      // Category filter
      if (categoryFilter !== 'all') {
        const hasCategory = plugin.capabilities.includes(categoryFilter as PluginCapability);
        if (!hasCategory) return false;
      }
      
      // Price filter
      if (priceFilter === 'free' && plugin.price > 0) return false;
      if (priceFilter === 'paid' && plugin.price === 0) return false;
      
      return true;
    });

    // Sort plugins
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'featured':
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return b.downloads - a.downloads;
        case 'popular':
          return b.downloads - a.downloads;
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'updated':
          return b.lastUpdated.getTime() - a.lastUpdated.getTime();
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [plugins, searchQuery, sortBy, categoryFilter, priceFilter]);

  const handleInstall = async (plugin: MarketplacePlugin) => {
    if (!onInstall) return;
    
    setInstallingPlugin(plugin.id);
    try {
      await onInstall(plugin);
    } catch (error) {
      console.error('Failed to install plugin:', error);
    } finally {
      setInstallingPlugin(null);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const getCapabilityIcon = (capability: PluginCapability) => {
    const iconMap: Record<string, React.ReactNode> = {
      'content-management': <FileText className="h-3 w-3" />,
      'security': <Shield className="h-3 w-3" />,
      'performance': <Zap className="h-3 w-3" />,
      'analytics': <BarChart3 className="h-3 w-3" />,
      'admin-interface': <Settings className="h-3 w-3" />,
    };
    return iconMap[capability] || <Package className="h-3 w-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plugin Marketplace</h1>
          <p className="text-muted-foreground">
            Discover and install plugins to extend your site's functionality
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Browse Plugins
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort by</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Price</label>
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedPlugins.length} of {plugins.length} plugins
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-lg">Loading plugins...</span>
          </div>
        </div>
      )}

      {/* Plugin Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedPlugins.map((plugin) => {
            const isInstalled = installedPlugins.includes(plugin.name);
            const isInstalling = installingPlugin === plugin.id;

            return (
              <Card key={plugin.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg leading-none">
                          {plugin.title}
                        </CardTitle>
                        {plugin.featured && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Featured
                          </Badge>
                        )}
                        {plugin.verified && (
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <CardDescription>
                        by {plugin.author}
                      </CardDescription>
                    </div>
                    
                    {plugin.price > 0 ? (
                      <Badge variant="outline" className="text-green-600">
                        ${plugin.price}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Free</Badge>
                    )}
                  </div>

                  {/* Rating and Downloads */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {renderStars(plugin.rating)}
                      <span className="ml-1">
                        {plugin.rating.toFixed(1)} ({formatNumber(plugin.totalRatings)})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {formatNumber(plugin.downloads)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {plugin.description}
                  </p>

                  {/* Capabilities */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {plugin.capabilities.slice(0, 3).map((capability) => (
                        <Badge
                          key={capability}
                          variant="outline"
                          className="text-xs"
                        >
                          <div className="flex items-center gap-1">
                            {getCapabilityIcon(capability)}
                            {capability.replace('-', ' ')}
                          </div>
                        </Badge>
                      ))}
                      {plugin.capabilities.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{plugin.capabilities.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Version and Update Info */}
                  <div className="text-xs text-muted-foreground">
                    <div>Version {plugin.version}</div>
                    <div>Updated {formatDate(plugin.lastUpdated)}</div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex gap-2">
                    {plugin.status === 'beta' && (
                      <Badge variant="outline" className="text-orange-600">
                        Beta
                      </Badge>
                    )}
                    {plugin.status === 'deprecated' && (
                      <Badge variant="outline" className="text-red-600">
                        Deprecated
                      </Badge>
                    )}
                  </div>
                </CardContent>

                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onViewDetails?.(plugin)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                    
                    {isInstalled ? (
                      <Badge className="flex-1 justify-center py-2 bg-green-100 text-green-800">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Installed
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleInstall(plugin)}
                        disabled={isInstalling}
                      >
                        {isInstalling ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        {isInstalling ? 'Installing...' : 'Install'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredAndSortedPlugins.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No plugins found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search criteria or filters
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setPriceFilter('all');
              setSortBy('featured');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}