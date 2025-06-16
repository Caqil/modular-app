import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@modular-app/ui';
import { Button } from '@modular-app/ui';
import { Input } from '@modular-app/ui';
import { Label } from '@modular-app/ui';
import { AlertCircle, Mail, Send, Settings, TestTube } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@modular-app/ui/components/ui/tabs';

const emailSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  adapter: z.enum(['smtp', 'sendgrid', 'ses', 'mailgun', 'postmark']).default('smtp'),
  from: z.object({
    name: z.string().min(1, 'From name is required').max(100),
    email: z.string().email('Invalid email address'),
  }),
  replyTo: z.string().email('Invalid email address').optional().or(z.literal('')),
  smtp: z.object({
    host: z.string().min(1, 'SMTP host is required'),
    port: z.number().min(1).max(65535).default(587),
    secure: z.boolean().default(false),
    user: z.string().min(1, 'SMTP user is required'),
    password: z.string().min(1, 'SMTP password is required'),
  }),
  sendgrid: z.object({
    apiKey: z.string().optional(),
  }),
  mailgun: z.object({
    domain: z.string().optional(),
    apiKey: z.string().optional(),
  }),
  postmark: z.object({
    serverToken: z.string().optional(),
  }),
  templates: z.object({
    welcomeEmail: z.boolean().default(true),
    passwordReset: z.boolean().default(true),
    emailVerification: z.boolean().default(true),
    notificationEmail: z.boolean().default(true),
  }),
});

type EmailSettingsForm = z.infer<typeof emailSettingsSchema>;

interface EmailSettingsProps {
  onSave: (data: EmailSettingsForm) => Promise<void>;
  onTest: (adapter: string) => Promise<void>;
  initialData?: Partial<EmailSettingsForm>;
  isLoading?: boolean;
}

export function EmailSettings({ onSave, onTest, initialData, isLoading }: EmailSettingsProps) {
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const form = useForm<EmailSettingsForm>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      enabled: initialData?.enabled ?? true,
      adapter: initialData?.adapter ?? 'smtp',
      from: {
        name: initialData?.from?.name ?? 'Modular CMS',
        email: initialData?.from?.email ?? '',
      },
      replyTo: initialData?.replyTo ?? '',
      smtp: {
        host: initialData?.smtp?.host ?? '',
        port: initialData?.smtp?.port ?? 587,
        secure: initialData?.smtp?.secure ?? false,
        user: initialData?.smtp?.user ?? '',
        password: initialData?.smtp?.password ?? '',
      },
      sendgrid: {
        apiKey: initialData?.sendgrid?.apiKey ?? '',
      },
      mailgun: {
        domain: initialData?.mailgun?.domain ?? '',
        apiKey: initialData?.mailgun?.apiKey ?? '',
      },
      postmark: {
        serverToken: initialData?.postmark?.serverToken ?? '',
      },
      templates: {
        welcomeEmail: initialData?.templates?.welcomeEmail ?? true,
        passwordReset: initialData?.templates?.passwordReset ?? true,
        emailVerification: initialData?.templates?.emailVerification ?? true,
        notificationEmail: initialData?.templates?.notificationEmail ?? true,
      },
    },
  });

  const watchedAdapter = form.watch('adapter');
  const watchedEnabled = form.watch('enabled');

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      await onTest(watchedAdapter);
      setTestResult({
        success: true,
        message: 'Email test successful! Check your inbox.',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Email test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (data: EmailSettingsForm) => {
    try {
      await onSave(data);
    } catch (error) {
      console.error('Failed to save email settings:', error);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Email Settings</CardTitle>
            <Badge variant={watchedEnabled ? 'default' : 'secondary'}>
              {watchedEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={watchedEnabled}
              onCheckedChange={(checked) => form.setValue('enabled', checked)}
            />
            <Label>Enable Email</Label>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={watchedAdapter} onValueChange={(value) => form.setValue('adapter', value as any)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="smtp">SMTP</TabsTrigger>
              <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
              <TabsTrigger value="ses">AWS SES</TabsTrigger>
              <TabsTrigger value="mailgun">Mailgun</TabsTrigger>
              <TabsTrigger value="postmark">Postmark</TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    {...form.register('from.name')}
                    placeholder="Your Site Name"
                  />
                  {form.formState.errors.from?.name && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.from.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    {...form.register('from.email')}
                    placeholder="noreply@yoursite.com"
                  />
                  {form.formState.errors.from?.email && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.from.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="replyTo">Reply To Email (Optional)</Label>
                <Input
                  id="replyTo"
                  type="email"
                  {...form.register('replyTo')}
                  placeholder="support@yoursite.com"
                />
                {form.formState.errors.replyTo && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.replyTo.message}
                  </p>
                )}
              </div>
            </div>

            {/* SMTP Settings */}
            <TabsContent value="smtp" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    {...form.register('smtp.host')}
                    placeholder="smtp.gmail.com"
                  />
                  {form.formState.errors.smtp?.host && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.smtp.host.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    {...form.register('smtp.port', { valueAsNumber: true })}
                    placeholder="587"
                  />
                  {form.formState.errors.smtp?.port && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.smtp.port.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpUser">SMTP Username</Label>
                  <Input
                    id="smtpUser"
                    {...form.register('smtp.user')}
                    placeholder="your-email@gmail.com"
                  />
                  {form.formState.errors.smtp?.user && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.smtp.user.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    {...form.register('smtp.password')}
                    placeholder="your-app-password"
                  />
                  {form.formState.errors.smtp?.password && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.smtp.password.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.watch('smtp.secure')}
                  onCheckedChange={(checked) => form.setValue('smtp.secure', checked)}
                />
                <Label>Use SSL/TLS</Label>
              </div>
            </TabsContent>

            {/* SendGrid Settings */}
            <TabsContent value="sendgrid" className="space-y-4">
              <div>
                <Label htmlFor="sendgridApiKey">SendGrid API Key</Label>
                <Input
                  id="sendgridApiKey"
                  type="password"
                  {...form.register('sendgrid.apiKey')}
                  placeholder="SG...."
                />
              </div>
            </TabsContent>

            {/* Mailgun Settings */}
            <TabsContent value="mailgun" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mailgunDomain">Mailgun Domain</Label>
                  <Input
                    id="mailgunDomain"
                    {...form.register('mailgun.domain')}
                    placeholder="mg.yoursite.com"
                  />
                </div>
                <div>
                  <Label htmlFor="mailgunApiKey">Mailgun API Key</Label>
                  <Input
                    id="mailgunApiKey"
                    type="password"
                    {...form.register('mailgun.apiKey')}
                    placeholder="key-..."
                  />
                </div>
              </div>
            </TabsContent>

            {/* Postmark Settings */}
            <TabsContent value="postmark" className="space-y-4">
              <div>
                <Label htmlFor="postmarkToken">Postmark Server Token</Label>
                <Input
                  id="postmarkToken"
                  type="password"
                  {...form.register('postmark.serverToken')}
                  placeholder="..."
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Email Templates */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Email Templates</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.watch('templates.welcomeEmail')}
                  onCheckedChange={(checked) => form.setValue('templates.welcomeEmail', checked)}
                />
                <Label>Welcome Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.watch('templates.passwordReset')}
                  onCheckedChange={(checked) => form.setValue('templates.passwordReset', checked)}
                />
                <Label>Password Reset</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.watch('templates.emailVerification')}
                  onCheckedChange={(checked) => form.setValue('templates.emailVerification', checked)}
                />
                <Label>Email Verification</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.watch('templates.notificationEmail')}
                  onCheckedChange={(checked) => form.setValue('templates.notificationEmail', checked)}
                />
                <Label>Notification Email</Label>
              </div>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`mt-4 p-3 rounded-md ${
              testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {testResult.message}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={!watchedEnabled || testing}
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testing ? 'Testing...' : 'Test Email'}
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Settings className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
