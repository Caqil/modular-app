'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  FormSection,
  Progress,
} from '@modular-app/ui';
import { 
  Zap, 
  Database, 
  HardDrive, 
  Globe, 
  Image, 
  Settings, 
  RefreshCw,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

// Performance settings validation schema
const performanceSettingsSchema = z.object({
  // Caching
  enableRedisCache: z.boolean(),
  redisHost: z.string().optional(),
  redisPort: z.number().min(1).max(65535).optional(),
  redisPassword: z.string().optional(),
  cacheDefaultTTL: z.number().min(60).max(86400), // 1 minute to 24 hours
  
  // Database Performance
  enableQueryCache: z.boolean(),
  maxQueryCacheSize: z.number().min(10).max(1000), // MB
  enableConnectionPooling: z.boolean(),
  maxConnectionPoolSize: z.number().min(5).max(100),
  queryTimeout: z.number().min(1000).max(60000), // 1-60 seconds in ms
  
  // Static Assets
  enableAssetCompression: z.boolean(),
  compressionLevel: z.number().min(1).max(9),
  enableAssetCaching: z.boolean(),
  assetCacheTTL: z.number().min(3600).max(31536000), // 1 hour to 1 year
  
  // Image Optimization
  enableImageOptimization: z.boolean(),
  imageQuality: z.number().min(10).max(100),
  enableWebP: z.boolean(),
  enableAVIF: z.boolean(),
  maxImageSize: z.number().min(100).max(10000), // KB
  
  // CDN Settings
  enableCDN: z.boolean(),
  cdnUrl: z.string().url().optional().or(z.literal('')),
  cdnRegions: z.array(z.string()).optional(),
  
  // Performance Monitoring
  enablePerformanceMonitoring: z.boolean(),
  performanceThreshold: z.number().min(100).max(5000), // ms
  enableRealUserMonitoring: z.boolean(),
  
  // Preloading & Prefetching
  enableLinkPrefetch: z.boolean(),
  enableResourcePreload: z.boolean(),
  enableDNSPrefetch: z.boolean(),
  
  // Bundle Optimization
  enableCodeSplitting: z.boolean(),
  enableTreeShaking: z.boolean(),
  enableMinification: z.boolean(),
  chunkSizeLimit: z.number().min(100).max(1000), // KB
});

type PerformanceSettingsData = z.infer<typeof performanceSettingsSchema>;

interface PerformanceMetrics {
  cacheHitRate: number;
  avgResponseTime: number;
  totalRequests: number;
  errorRate: number;
  memoryUsage: number;
  diskUsage: number;
}

interface PerformanceSettingsProps {
  initialData?: Partial<PerformanceSettingsData>;
  metrics?: PerformanceMetrics;
  onSave?: (data: PerformanceSettingsData) => Promise<void>;
  onClearCache?: () => Promise<void>;
}

export function PerformanceSettings({ 
  initialData,
  metrics,
  onSave,
  onClearCache 
}: PerformanceSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty }
  } = useForm<PerformanceSettingsData>({
    resolver: zodResolver(performanceSettingsSchema),
    defaultValues: {
      // Caching defaults
      enableRedisCache: false,
      redisHost: 'localhost',
      redisPort: 6379,
      redisPassword: '',
      cacheDefaultTTL: 3600,
      
      // Database defaults
      enableQueryCache: true,
      maxQueryCacheSize: 100,
      enableConnectionPooling: true,
      maxConnectionPoolSize: 20,
      queryTimeout: 5000,
      
      // Static Assets defaults
      enableAssetCompression: true,
      compressionLevel: 6,
      enableAssetCaching: true,
      assetCacheTTL: 86400,
      
      // Image Optimization defaults
      enableImageOptimization: true,
      imageQuality: 85,
      enableWebP: true,
      enableAVIF: false,
      maxImageSize: 2048,
      
      // CDN defaults
      enableCDN: false,
      cdnUrl: '',
      cdnRegions: [],
      
      // Performance Monitoring defaults
      enablePerformanceMonitoring: true,
      performanceThreshold: 1000,
      enableRealUserMonitoring: false,
      
      // Preloading defaults
      enableLinkPrefetch: true,
      enableResourcePreload: true,
      enableDNSPrefetch: true,
      
      // Bundle Optimization defaults
      enableCodeSplitting: true,
      enableTreeShaking: true,
      enableMinification: true,
      chunkSizeLimit: 250,
      
      ...initialData,
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: PerformanceSettingsData) => {
    setIsLoading(true);
    try {
      await onSave?.(data);
    } catch (error) {
      console.error('Failed to save performance settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      await onClearCache?.();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearingCache(false);
    }
  };

  const getPerformanceScore = () => {
    if (!metrics) return 0;
    
    // Calculate performance score based on metrics
    const cacheScore = metrics.cacheHitRate;
    const responseScore = Math.max(0, 100 - (metrics.avgResponseTime / 10));
    const errorScore = Math.max(0, 100 - (metrics.errorRate * 10));
    
    return Math.round((cacheScore + responseScore + errorScore) / 3);
  };

  const performanceScore = getPerformanceScore();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Performance Overview */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Overview
            </CardTitle>
            <CardDescription>
              Current system performance metrics and health status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cache Hit Rate</Label>
                <div className="flex items-center gap-2">
                  <Progress value={metrics.cacheHitRate} className="flex-1" />
                  <span className="text-sm font-medium">{metrics.cacheHitRate}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Avg Response Time</Label>
                <div className="text-2xl font-bold">{metrics.avgResponseTime}ms</div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Total Requests</Label>
                <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Error Rate</Label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{metrics.errorRate}%</span>
                  {metrics.errorRate > 1 && (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Overall Performance Score</Label>
                <Badge variant={performanceScore >= 80 ? "default" : performanceScore >= 60 ? "secondary" : "destructive"}>
                  {performanceScore}/100
                </Badge>
              </div>
              <Progress value={performanceScore} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Caching Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Caching Configuration
          </CardTitle>
          <CardDescription>
            Configure Redis cache and caching strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Redis Cache</Label>
                <p className="text-sm text-muted-foreground">
                  Use Redis for high-performance caching
                </p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4"
                {...register('enableRedisCache')}
              />
            </div>

            {watchedValues.enableRedisCache && (
              <div className="space-y-4 pl-4 border-l-2 border-muted">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="redisHost">Redis Host</Label>
                    <Input
                      id="redisHost"
                      placeholder="localhost"
                      {...register('redisHost')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="redisPort">Redis Port</Label>
                    <Input
                      id="redisPort"
                      type="number"
                      placeholder="6379"
                      {...register('redisPort', { valueAsNumber: true })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="redisPassword">Redis Password</Label>
                  <Input
                    id="redisPassword"
                    type="password"
                    placeholder="Optional"
                    {...register('redisPassword')}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cacheDefaultTTL">Default Cache TTL (seconds)</Label>
              <Input
                id="cacheDefaultTTL"
                type="number"
                {...register('cacheDefaultTTL', { valueAsNumber: true })}
              />
              {errors.cacheDefaultTTL && (
                <p className="text-sm text-red-600">{errors.cacheDefaultTTL.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearCache}
                disabled={isClearingCache}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isClearingCache ? 'animate-spin' : ''}`} />
                {isClearingCache ? 'Clearing...' : 'Clear Cache'}
              </Button>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Database Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Database Performance
          </CardTitle>
          <CardDescription>
            Optimize database queries and connections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Query Cache</Label>
                  <p className="text-sm text-muted-foreground">
                    Cache database query results
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableQueryCache')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxQueryCacheSize">Max Query Cache Size (MB)</Label>
                <Input
                  id="maxQueryCacheSize"
                  type="number"
                  {...register('maxQueryCacheSize', { valueAsNumber: true })}
                />
                {errors.maxQueryCacheSize && (
                  <p className="text-sm text-red-600">{errors.maxQueryCacheSize.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Connection Pooling</Label>
                  <p className="text-sm text-muted-foreground">
                    Reuse database connections for better performance
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableConnectionPooling')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxConnectionPoolSize">Max Pool Size</Label>
                  <Input
                    id="maxConnectionPoolSize"
                    type="number"
                    {...register('maxConnectionPoolSize', { valueAsNumber: true })}
                  />
                  {errors.maxConnectionPoolSize && (
                    <p className="text-sm text-red-600">{errors.maxConnectionPoolSize.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="queryTimeout">Query Timeout (ms)</Label>
                  <Input
                    id="queryTimeout"
                    type="number"
                    {...register('queryTimeout', { valueAsNumber: true })}
                  />
                  {errors.queryTimeout && (
                    <p className="text-sm text-red-600">{errors.queryTimeout.message}</p>
                  )}
                </div>
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Static Assets & Compression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Static Assets & Compression
          </CardTitle>
          <CardDescription>
            Optimize static asset delivery and compression
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Asset Compression</Label>
                  <p className="text-sm text-muted-foreground">
                    Compress CSS, JS, and other static assets
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableAssetCompression')}
                />
              </div>

              {watchedValues.enableAssetCompression && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label htmlFor="compressionLevel">Compression Level (1-9)</Label>
                  <Input
                    id="compressionLevel"
                    type="number"
                    min="1"
                    max="9"
                    {...register('compressionLevel', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher values = better compression, slower processing
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Asset Caching</Label>
                  <p className="text-sm text-muted-foreground">
                    Cache static assets with headers
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableAssetCaching')}
                />
              </div>

              {watchedValues.enableAssetCaching && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label htmlFor="assetCacheTTL">Asset Cache TTL (seconds)</Label>
                  <Input
                    id="assetCacheTTL"
                    type="number"
                    {...register('assetCacheTTL', { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Image Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Image Optimization
          </CardTitle>
          <CardDescription>
            Optimize images for better performance and smaller file sizes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Image Optimization</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically optimize uploaded images
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableImageOptimization')}
                />
              </div>

              {watchedValues.enableImageOptimization && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="imageQuality">Image Quality (%)</Label>
                    <Input
                      id="imageQuality"
                      type="number"
                      min="10"
                      max="100"
                      {...register('imageQuality', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable WebP Format</Label>
                        <p className="text-sm text-muted-foreground">
                          Convert images to WebP for better compression
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        {...register('enableWebP')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable AVIF Format</Label>
                        <p className="text-sm text-muted-foreground">
                          Convert images to AVIF for maximum compression
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        {...register('enableAVIF')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxImageSize">Max Image Size (KB)</Label>
                    <Input
                      id="maxImageSize"
                      type="number"
                      {...register('maxImageSize', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              )}
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* CDN Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            CDN Settings
          </CardTitle>
          <CardDescription>
            Configure Content Delivery Network for global performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable CDN</Label>
                  <p className="text-sm text-muted-foreground">
                    Use CDN for static asset delivery
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enableCDN')}
                />
              </div>

              {watchedValues.enableCDN && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="cdnUrl">CDN URL</Label>
                    <Input
                      id="cdnUrl"
                      placeholder="https://cdn.example.com"
                      {...register('cdnUrl')}
                    />
                    {errors.cdnUrl && (
                      <p className="text-sm text-red-600">{errors.cdnUrl.message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Performance Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance Monitoring
          </CardTitle>
          <CardDescription>
            Monitor and track application performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormSection>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Performance Monitoring</Label>
                  <p className="text-sm text-muted-foreground">
                    Track response times and performance metrics
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...register('enablePerformanceMonitoring')}
                />
              </div>

              {watchedValues.enablePerformanceMonitoring && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="performanceThreshold">Performance Threshold (ms)</Label>
                    <Input
                      id="performanceThreshold"
                      type="number"
                      {...register('performanceThreshold', { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert when response time exceeds this threshold
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Real User Monitoring</Label>
                      <p className="text-sm text-muted-foreground">
                        Track real user performance metrics
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      {...register('enableRealUserMonitoring')}
                    />
                  </div>
                </div>
              )}
            </div>
          </FormSection>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading || !isDirty}>
          <Settings className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Performance Settings'}
        </Button>
      </div>
    </form>
  );
}