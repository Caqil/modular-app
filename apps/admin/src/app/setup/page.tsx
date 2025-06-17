'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@modular-app/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@modular-app/ui';
import { Input } from '@modular-app/ui';
import { Label } from '@modular-app/ui';
import { Textarea } from '@modular-app/ui';
import { Globe, Database, User, Settings, CheckCircle, Loader2 } from 'lucide-react';

type SetupStep = 'welcome' | 'database' | 'admin' | 'site' | 'installing' | 'complete';

interface SetupData {
  database: {
    uri: string;
    name: string;
  };
  admin: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };
  site: {
    title: string;
    description: string;
    url: string;
  };
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>('welcome');
  const [installing, setInstalling] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [setupData, setSetupData] = useState<SetupData>({
    database: {
      uri: 'mongodb://localhost:27017',
      name: 'modular_app'
    },
    admin: {
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: ''
    },
    site: {
      title: 'My Modular App',
      description: 'A modern CMS built with Next.js',
      url: 'http://localhost:3001'
    }
  });

  const updateData = (section: keyof SetupData, field: string, value: string) => {
    setSetupData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    // Clear error when user starts typing
    if (errors[`${section}.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${section}.${field}`];
        return newErrors;
      });
    }
  };

  const validateStep = (currentStep: SetupStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 'database':
        if (!setupData.database.uri) newErrors['database.uri'] = 'Database URI is required';
        if (!setupData.database.name) newErrors['database.name'] = 'Database name is required';
        break;
      case 'admin':
        if (!setupData.admin.username) newErrors['admin.username'] = 'Username is required';
        if (!setupData.admin.email) newErrors['admin.email'] = 'Email is required';
        if (!setupData.admin.password) newErrors['admin.password'] = 'Password is required';
        if (setupData.admin.password.length < 8) newErrors['admin.password'] = 'Password must be at least 8 characters';
        break;
      case 'site':
        if (!setupData.site.title) newErrors['site.title'] = 'Site title is required';
        if (!setupData.site.url) newErrors['site.url'] = 'Site URL is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    
    const steps: SetupStep[] = ['welcome', 'database', 'admin', 'site', 'installing', 'complete'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      const next = steps[currentIndex + 1];
      if (next) setStep(next);
    }
  };

  const runInstallation = async () => {
    if (!validateStep('site')) return;

    setInstalling(true);
    setStep('installing');

    try {
      const response = await fetch('/api/setup/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupData),
      });

      const result = await response.json();
      
      if (result.success) {
        setStep('complete');
        setTimeout(() => router.push('/'), 3000);
      } else {
        setErrors({ general: result.message || 'Installation failed' });
        setStep('site');
      }
    } catch (error) {
      setErrors({ general: 'Installation failed. Please try again.' });
      setStep('site');
    } finally {
      setInstalling(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl">Welcome to Modular App</CardTitle>
              <CardDescription className="text-lg">
                Let's set up your content management system in just a few steps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={nextStep} className="w-full" size="lg">
                Get Started
              </Button>
            </CardContent>
          </Card>
        );

      case 'database':
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Setup
              </CardTitle>
              <CardDescription>
                Configure your MongoDB database connection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="db-uri">Database URI</Label>
                <Input
                  id="db-uri"
                  value={setupData.database.uri}
                  onChange={(e) => updateData('database', 'uri', e.target.value)}
                  placeholder="mongodb://localhost:27017"
                />
                {errors['database.uri'] && (
                  <p className="text-sm text-red-600 mt-1">{errors['database.uri']}</p>
                )}
              </div>
              <div>
                <Label htmlFor="db-name">Database Name</Label>
                <Input
                  id="db-name"
                  value={setupData.database.name}
                  onChange={(e) => updateData('database', 'name', e.target.value)}
                  placeholder="modular_app"
                />
                {errors['database.name'] && (
                  <p className="text-sm text-red-600 mt-1">{errors['database.name']}</p>
                )}
              </div>
              <Button onClick={nextStep} className="w-full">
                Continue
              </Button>
            </CardContent>
          </Card>
        );

      case 'admin':
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Admin Account
              </CardTitle>
              <CardDescription>
                Create your administrator account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    value={setupData.admin.firstName}
                    onChange={(e) => updateData('admin', 'firstName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    value={setupData.admin.lastName}
                    onChange={(e) => updateData('admin', 'lastName', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={setupData.admin.username}
                  onChange={(e) => updateData('admin', 'username', e.target.value)}
                  required
                />
                {errors['admin.username'] && (
                  <p className="text-sm text-red-600 mt-1">{errors['admin.username']}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={setupData.admin.email}
                  onChange={(e) => updateData('admin', 'email', e.target.value)}
                  required
                />
                {errors['admin.email'] && (
                  <p className="text-sm text-red-600 mt-1">{errors['admin.email']}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={setupData.admin.password}
                  onChange={(e) => updateData('admin', 'password', e.target.value)}
                  required
                />
                {errors['admin.password'] && (
                  <p className="text-sm text-red-600 mt-1">{errors['admin.password']}</p>
                )}
              </div>
              <Button onClick={nextStep} className="w-full">
                Continue
              </Button>
            </CardContent>
          </Card>
        );

      case 'site':
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Site Information
              </CardTitle>
              <CardDescription>
                Configure your website details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="site-title">Site Title</Label>
                <Input
                  id="site-title"
                  value={setupData.site.title}
                  onChange={(e) => updateData('site', 'title', e.target.value)}
                  required
                />
                {errors['site.title'] && (
                  <p className="text-sm text-red-600 mt-1">{errors['site.title']}</p>
                )}
              </div>
              <div>
                <Label htmlFor="site-description">Description</Label>
                <Textarea
                  id="site-description"
                  value={setupData.site.description}
                  onChange={(e) => updateData('site', 'description', e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="site-url">Site URL</Label>
                <Input
                  id="site-url"
                  value={setupData.site.url}
                  onChange={(e) => updateData('site', 'url', e.target.value)}
                  required
                />
                {errors['site.url'] && (
                  <p className="text-sm text-red-600 mt-1">{errors['site.url']}</p>
                )}
              </div>
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}
              <Button onClick={runInstallation} className="w-full">
                Install Modular App
              </Button>
            </CardContent>
          </Card>
        );

      case 'installing':
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              </div>
              <CardTitle>Installing Modular App</CardTitle>
              <CardDescription>
                Please wait while we set up your website...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Connecting to database</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Creating database tables and indexes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 border border-muted-foreground rounded-full" />
                  <span>Creating admin account</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 border border-muted-foreground rounded-full" />
                  <span>Finalizing installation</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'complete':
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-3xl text-green-600">Installation Complete!</CardTitle>
              <CardDescription className="text-lg">
                Your Modular App is ready to use. Redirecting to dashboard...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">What's next?</h4>
                <ul className="space-y-1 text-sm text-green-700">
                  <li>• Explore the admin dashboard</li>
                  <li>• Create your first post or page</li>
                  <li>• Customize your site settings</li>
                  <li>• Install additional plugins</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {renderStep()}
      </div>
    </div>
  );
}