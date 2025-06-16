'use client';

import React, { useState } from 'react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Textarea,
  Badge,
} from '@modular-app/ui';
import { 
  Database,
  User,
  Globe,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface SetupData {
  database: {
    uri: string;
    name: string;
  };
  admin: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
  };
  site: {
    title: string;
    description: string;
    url: string;
    language: string;
    timezone: string;
  };
}

type SetupStep = 'welcome' | 'database' | 'admin' | 'site' | 'installing' | 'complete';

export default function SetupPage() {
  const [step, setStep] = useState<SetupStep>('welcome');
  const [setupData, setSetupData] = useState<SetupData>({
    database: {
      uri: '',
      name: 'modular-app',
    },
    admin: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    },
    site: {
      title: 'My Modular App Site',
      description: 'Just another Modular App site',
      url: typeof window !== 'undefined' ? window.location.origin : '',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
  
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [installing, setInstalling] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateData = (section: keyof SetupData, field: string, value: string) => {
    setSetupData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
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

  const testDatabaseConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/setup/test-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: setupData.database.uri }),
      });

      const result = await response.json();
      setTestResult(result.success ? 'success' : 'error');
      
      if (!result.success) {
        setErrors({ 'database.uri': result.message || 'Connection failed' });
      }
    } catch (error) {
      setTestResult('error');
      setErrors({ 'database.uri': 'Failed to test connection' });
    } finally {
      setTesting(false);
    }
  };

  const validateStep = (currentStep: SetupStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 'database':
        if (!setupData.database.uri) {
          newErrors['database.uri'] = 'Database URI is required';
        }
        if (!setupData.database.name) {
          newErrors['database.name'] = 'Database name is required';
        }
        break;

      case 'admin':
        if (!setupData.admin.username) {
          newErrors['admin.username'] = 'Username is required';
        }
        if (!setupData.admin.email) {
          newErrors['admin.email'] = 'Email is required';
        }
        if (!setupData.admin.password) {
          newErrors['admin.password'] = 'Password is required';
        }
        if (setupData.admin.password !== setupData.admin.confirmPassword) {
          newErrors['admin.confirmPassword'] = 'Passwords do not match';
        }
        if (setupData.admin.password.length < 8) {
          newErrors['admin.password'] = 'Password must be at least 8 characters';
        }
        break;

      case 'site':
        if (!setupData.site.title) {
          newErrors['site.title'] = 'Site title is required';
        }
        if (!setupData.site.url) {
          newErrors['site.url'] = 'Site URL is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;

    const steps: SetupStep[] = ['welcome', 'database', 'admin', 'site', 'installing', 'complete'];
    const currentIndex = steps.indexOf(step);
     if (currentIndex > 0) {
      const prev = steps[currentIndex - 1];
      if (prev) setStep(prev);
    }
  };

  const prevStep = () => {
    const steps: SetupStep[] = ['welcome', 'database', 'admin', 'site', 'installing', 'complete'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      const prev = steps[currentIndex - 1];
      if (prev) setStep(prev);
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
      } else {
        setErrors({ general: result.message || 'Installation failed' });
        setStep('site'); // Go back to last step
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
                Let's set up your new content management system. This should only take a few minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">What you'll need:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• MongoDB database URL</li>
                  <li>• Admin account details</li>
                  <li>• Basic site information</li>
                </ul>
              </div>
              <Button onClick={nextStep} className="w-full" size="lg">
                Let's Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
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
                Database Configuration
              </CardTitle>
              <CardDescription>
                Enter your MongoDB connection details. Don't have MongoDB? Get a free database at MongoDB Atlas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dbUri">Database URI</Label>
                <Input
                  id="dbUri"
                  placeholder="mongodb://localhost:27017 or mongodb+srv://..."
                  value={setupData.database.uri}
                  onChange={(e) => updateData('database', 'uri', e.target.value)}
                  className={errors['database.uri'] ? 'border-red-500' : ''}
                />
                {errors['database.uri'] && (
                  <p className="text-sm text-red-600">{errors['database.uri']}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dbName">Database Name</Label>
                <Input
                  id="dbName"
                  placeholder="modular-app"
                  value={setupData.database.name}
                  onChange={(e) => updateData('database', 'name', e.target.value)}
                  className={errors['database.name'] ? 'border-red-500' : ''}
                />
                {errors['database.name'] && (
                  <p className="text-sm text-red-600">{errors['database.name']}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={testDatabaseConnection}
                  disabled={!setupData.database.uri || testing}
                  variant="outline"
                  className="flex-1"
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                
                {testResult && (
                  <div className="flex items-center">
                    {testResult === 'success' ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={prevStep} variant="outline" className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  onClick={nextStep} 
                  className="flex-1"
                  disabled={!setupData.database.uri || testResult !== 'success'}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
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
                Create your administrator account. You'll use this to log into the admin panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={setupData.admin.firstName}
                    onChange={(e) => updateData('admin', 'firstName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={setupData.admin.lastName}
                    onChange={(e) => updateData('admin', 'lastName', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={setupData.admin.username}
                  onChange={(e) => updateData('admin', 'username', e.target.value)}
                  className={errors['admin.username'] ? 'border-red-500' : ''}
                />
                {errors['admin.username'] && (
                  <p className="text-sm text-red-600">{errors['admin.username']}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={setupData.admin.email}
                  onChange={(e) => updateData('admin', 'email', e.target.value)}
                  className={errors['admin.email'] ? 'border-red-500' : ''}
                />
                {errors['admin.email'] && (
                  <p className="text-sm text-red-600">{errors['admin.email']}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={setupData.admin.password}
                  onChange={(e) => updateData('admin', 'password', e.target.value)}
                  className={errors['admin.password'] ? 'border-red-500' : ''}
                />
                {errors['admin.password'] && (
                  <p className="text-sm text-red-600">{errors['admin.password']}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={setupData.admin.confirmPassword}
                  onChange={(e) => updateData('admin', 'confirmPassword', e.target.value)}
                  className={errors['admin.confirmPassword'] ? 'border-red-500' : ''}
                />
                {errors['admin.confirmPassword'] && (
                  <p className="text-sm text-red-600">{errors['admin.confirmPassword']}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={prevStep} variant="outline" className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={nextStep} className="flex-1">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'site':
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Site Information
              </CardTitle>
              <CardDescription>
                Basic information about your website. You can change these later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteTitle">Site Title</Label>
                <Input
                  id="siteTitle"
                  value={setupData.site.title}
                  onChange={(e) => updateData('site', 'title', e.target.value)}
                  className={errors['site.title'] ? 'border-red-500' : ''}
                />
                {errors['site.title'] && (
                  <p className="text-sm text-red-600">{errors['site.title']}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={setupData.site.description}
                  onChange={(e) => updateData('site', 'description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteUrl">Site URL</Label>
                <Input
                  id="siteUrl"
                  value={setupData.site.url}
                  onChange={(e) => updateData('site', 'url', e.target.value)}
                  className={errors['site.url'] ? 'border-red-500' : ''}
                />
                {errors['site.url'] && (
                  <p className="text-sm text-red-600">{errors['site.url']}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <select
                    id="language"
                    value={setupData.site.language}
                    onChange={(e) => updateData('site', 'language', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={setupData.site.timezone}
                    onChange={(e) => updateData('site', 'timezone', e.target.value)}
                  />
                </div>
              </div>

              {errors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={prevStep} variant="outline" className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={runInstallation} className="flex-1">
                  Install Modular App
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
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
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Creating database tables</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
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
                Your Modular App website has been successfully set up.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">What's next?</h4>
                <ul className="space-y-1 text-sm text-green-700">
                  <li>• Log into your admin panel with the account you created</li>
                  <li>• Customize your site's appearance and settings</li>
                  <li>• Create your first post or page</li>
                  <li>• Install plugins to extend functionality</li>
                </ul>
              </div>
              
              <Button 
                onClick={() => window.location.href = '/admin/dashboard'} 
                className="w-full" 
                size="lg"
              >
                Go to Admin Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Progress Steps */}
        {step !== 'welcome' && step !== 'installing' && step !== 'complete' && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {['database', 'admin', 'site'].map((stepName, index) => {
                const isActive = step === stepName;
                const isCompleted = ['database', 'admin', 'site'].indexOf(step) > index;
                
                return (
                  <div key={stepName} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCompleted ? 'bg-green-500 text-white' :
                      isActive ? 'bg-primary text-primary-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                    </div>
                    {index < 2 && (
                      <div className={`w-12 h-0.5 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="flex justify-center">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}