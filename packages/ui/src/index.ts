// ===================================================================
// @modular-app/ui - Complete UI Component Library
// ===================================================================

// ===================================================================
// UTILITIES & HELPERS
// ===================================================================

export { cn } from './lib/utils';
export type { VariantProps } from 'class-variance-authority';

// ===================================================================
// SHADCN/UI BASE COMPONENTS
// ===================================================================

export { Button } from './components/ui/button';
export { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from './components/ui/card';
export { Input } from './components/ui/input';
export { Label } from './components/ui/label';
export { Textarea } from './components/ui/textarea';
export { Badge } from './components/ui/badge';
export { ScrollArea } from './components/ui/scroll-area';
export { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from './components/ui/collapsible';
export { Progress } from './components/ui/progress';
export { Separator } from './components/ui/separator';
export { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './components/ui/select';
export { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from './components/ui/alert-dialog';

// ===================================================================
// NAVIGATION COMPONENTS
// ===================================================================
// Sidebar Navigation Component
export {
    SidebarNav, SidebarHeader,
    SidebarFooter,
    sidebarVariants,
    sidebarItemVariants
} from './components/navigation/sidebar-nav';
export type { SidebarNavItem } from './components/navigation/sidebar-nav';

// Tabs Navigation Component
export { 
  TabsNav, 
  TabContent, 
  TabsContainer,
  tabsNavVariants, 
  tabsListVariants, 
  tabItemVariants,
} from './components/navigation/tabs-nav';

// ===================================================================
// FEEDBACK COMPONENTS
// ===================================================================

// Error Boundary
export { ErrorBoundary } from './components/feedback/error-boundary';

// ===================================================================
// FORM COMPONENTS
// ===================================================================

// Form Section
export { FormSection } from './components/forms/form-section';

// ===================================================================
// CONDITIONAL EXPORTS (Uncomment as components are created)
// ===================================================================

// Additional Navigation Components
// export { Breadcrumbs, BreadcrumbSeparator, BreadcrumbJsonLd } from './components/navigation/breadcrumbs';
// export { Pagination, PaginationItem, PaginationEllipsis } from './components/navigation/pagination';

// Layout Components
// export { Container } from './components/layout/container';
// export { Flex, FlexItem } from './components/layout/flex';
// export { Grid, GridItem, ResponsiveGrid } from './components/layout/grid';
// export { Stack, VStack, HStack, CenterStack, Spacer, StackGroup } from './components/layout/stack';

// Additional UI Components
// export { ConfirmationDialog } from './components/ui/confirmation-dialog';
// export { EmptyState } from './components/ui/empty-state';
// export { LoadingSpinner, LoadingOverlay, LoadingState } from './components/ui/loading-spinner';
// export { FileUpload } from './components/ui/file-upload';
// export { FormField, FormFieldInput, FormFieldGroup } from './components/ui/form-field';
// export { RichEditor, MarkdownEditor } from './components/ui/rich-editor';

// ===================================================================
// PACKAGE INFORMATION
// ===================================================================

export const UI_PACKAGE_INFO = {
  name: '@modular-app/ui',
  version: '1.0.0',
  description: 'Complete UI component library for Modular App',
  author: 'Modular App Team',
  license: 'MIT',
  lastUpdated: '2025-06-16',
  components: {
    ui: [
      'Button',
      'Card',
      'CardContent',
      'CardDescription', 
      'CardFooter',
      'CardHeader',
      'CardTitle',
      'Input',
      'Label',
      'Textarea',
      'Badge',
      'ScrollArea',
      'Collapsible',
      'CollapsibleContent',
      'CollapsibleTrigger',
      'Progress',
      'Separator',
      'Select',
      'SelectContent',
      'SelectItem',
      'SelectTrigger',
      'SelectValue',
      'AlertDialog',
      'AlertDialogAction',
      'AlertDialogCancel',
      'AlertDialogContent',
      'AlertDialogDescription',
      'AlertDialogFooter',
      'AlertDialogHeader',
      'AlertDialogTitle',
      'AlertDialogTrigger'
    ],
    navigation: [
      'SidebarNav',
      'SidebarNavHeader',
      'SidebarNavFooter',
      'TabsNav',
      'TabContent',
      'TabsContainer'
    ],
    feedback: [
      'ErrorBoundary'
    ],
    forms: [
      'FormSection'
    ]
  }
} as const;

// ===================================================================
// DEVELOPMENT HELPERS
// ===================================================================

/**
 * Get information about the UI package
 */
export const getUIPackageInfo = () => UI_PACKAGE_INFO;

/**
 * List all available components
 */
export const listComponents = () => {
  const { components } = UI_PACKAGE_INFO;
  return Object.values(components).flat();
};

/**
 * List components by category
 */
export const listComponentsByCategory = () => UI_PACKAGE_INFO.components;

/**
 * Check if a component is available
 */
export const isComponentAvailable = (componentName: string): boolean => {
  return (listComponents() as string[]).includes(componentName);
};

// ===================================================================
// ERROR HANDLING
// ===================================================================

/**
 * Common error messages for UI components
 */
export const UI_ERROR_MESSAGES = {
  INVALID_PROPS: 'Invalid props provided to component',
  MISSING_REQUIRED_PROP: 'Required prop is missing',
  INVALID_VARIANT: 'Invalid variant provided',
  INVALID_SIZE: 'Invalid size provided',
  COMPONENT_NOT_FOUND: 'Component not found in registry',
  FILE_UPLOAD_ERROR: 'File upload failed',
  VALIDATION_ERROR: 'Form validation failed',
  RENDER_ERROR: 'Component render error',
} as const;

/**
 * UI Error class for component-specific errors
 */
export class UIError extends Error {
  public readonly code: keyof typeof UI_ERROR_MESSAGES;
  public readonly timestamp: Date;

  constructor(
    code: keyof typeof UI_ERROR_MESSAGES,
    message?: string,
    public component?: string,
    public props?: Record<string, any>
  ) {
    super(message || UI_ERROR_MESSAGES[code]);
    this.name = 'UIError';
    this.code = code;
    this.timestamp = new Date();
  }
}