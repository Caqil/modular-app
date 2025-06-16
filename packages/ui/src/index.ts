// ===================================================================
// MODULAR APP UI PACKAGE - MAIN EXPORT INDEX
// ===================================================================

// ===================================================================
// UTILITY EXPORTS
// ===================================================================

// CN Utilities
export { cn, conditionalClass, variantClass } from './utils/cn';

// Format Utilities
export { 
  formatFileSize, 
  formatNumber, 
  formatCurrency, 
  formatDate, 
  formatRelativeTime,
  truncateText,
  generateInitials 
} from './utils/format';

// Validation Utilities
export { 
  validationSchemas, 
  fileValidationSchemas, 
  validateField, 
  validateForm 
} from './utils/validation';

// Component Utilities
export { 
  generateId, 
  composeRefs, 
  debounce, 
  isInViewport,
  createPolymorphicComponent 
} from './utils/component';

// ===================================================================
// TYPE EXPORTS
// ===================================================================

// Component Types
export type {
  BaseComponentProps,
  LayoutComponentProps,
  ContainerProps,
  FlexProps,
  GridProps,
  StackProps,
  ComponentTheme,
  ResponsiveValue,
  ResponsiveProp,
  ComponentState,
  InteractiveComponentProps,
  AnimationConfig,
  MotionProps,
  A11yProps,
  NavigationA11yProps,
  ComponentEventHandlers,
  BreadcrumbItem,
  BreadcrumbsProps,
  PaginationProps,
  SidebarNavItem,
  SidebarNavProps,
  TabsNavItem,
  TabsNavProps,
  Spacing,
  Size,
  Variant,
  Alignment,
  Justification,
  AllLayoutProps,
  AllNavigationProps,
  ComponentRef,
  DivRef,
  ButtonRef,
  AnchorRef,
  NavRef,
  ListRef,
  PolymorphicAs,
  PolymorphicProps,
  PolymorphicRef,
  PolymorphicComponentProps,
  PolymorphicComponent,
  ForwardedRefComponent,
  ComponentDisplayName,
  ComponentVariants,
  TransitionConfig,
  ComponentAnimations,
  ComponentStyles,
  ThemeConfig,
  UIProviderProps,
  UIContextValue,
  ComponentError,
  LoadingState,
  AsyncComponentProps,
  CompositeComponent,
  ComponentTestProps,
  TestableComponentProps,
  ConditionalProps,
  PropsWithChildren,
  PropsWithClassName,
  PropsWithRef,
  ComponentPropsWithAs,
  ComponentWithDisplayName,
  OptionalProps,
  RequiredProps
} from './types/component';

// Class Variance Authority types
export type { VariantProps } from 'class-variance-authority';

// ===================================================================
// EXISTING SHADCN/UI COMPONENTS
// ===================================================================

export { Button } from './components/ui/button';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
export { Input } from './components/ui/input';
export { Label } from './components/ui/label';
export { Textarea } from './components/ui/textarea';
export { Badge } from './components/ui/badge';
export { ScrollArea } from './components/ui/scroll-area';
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './components/ui/collapsible';
export { Progress } from './components/ui/progress';
export { Separator } from './components/ui/separator';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './components/ui/alert-dialog';

// ===================================================================
// LAYOUT COMPONENTS
// ===================================================================

// Container Component
export { Container, containerVariants } from './components/layout/container';

// Flex Component
export { Flex, FlexItem, flexVariants, flexItemVariants } from './components/layout/flex';

// Grid Component
export { Grid, GridItem, ResponsiveGrid, gridVariants, gridItemVariants } from './components/layout/grid';

// Stack Component
export { 
  Stack, 
  VStack, 
  HStack, 
  CenterStack, 
  Spacer, 
  StackGroup,
  stackVariants,
  stackGroupVariants 
} from './components/layout/stack';

// ===================================================================
// NAVIGATION COMPONENTS
// ===================================================================

// Breadcrumbs Component
export { 
  Breadcrumbs, 
  BreadcrumbSeparator, 
  BreadcrumbJsonLd,
  breadcrumbsVariants, 
  breadcrumbItemVariants,
  breadcrumbLinkVariants,
  useBreadcrumbs
} from './components/navigation/breadcrumbs';

// Pagination Component
export { 
  Pagination, 
  PaginationItem, 
  PaginationEllipsis, 
  PaginationInfo,
  PaginationWithInfo,
  paginationVariants, 
  paginationItemVariants,
  usePagination 
} from './components/navigation/pagination';

// Sidebar Navigation Component
export { 
  SidebarNav, 
  SidebarNavHeader, 
  SidebarNavFooter,
  sidebarVariants, 
  sidebarItemVariants,
  useSidebarNav 
} from './components/navigation/sidebar-nav';

// Tabs Navigation Component
export { 
  TabsNav, 
  TabContent, 
  TabsContainer,
  tabsNavVariants, 
  tabsListVariants, 
  tabItemVariants,
  useTabsNav 
} from './components/navigation/tabs-nav';

// ===================================================================
// UI COMPONENTS
// ===================================================================

// Confirmation Dialog
export { ConfirmationDialog } from './components/ui/confirmation-dialog';

// Empty State
export { EmptyState } from './components/ui/empty-state';

// Error Boundary
export { ErrorBoundary } from './components/ui/error-boundary';

// Loading Components
export { LoadingSpinner, LoadingOverlay, LoadingState } from './components/ui/loading-spinner';

// File Upload
export { FileUpload } from './components/ui/file-upload';

// Form Components
export { FormField, FormFieldInput, FormFieldGroup } from './components/ui/form-field';
export { FormSection, FormSectionSteps } from './components/ui/form-section';

// Rich Editor
export { RichEditor, MarkdownEditor } from './components/ui/rich-editor';

// ===================================================================
// COMPONENT GROUPS FOR CONVENIENCE
// ===================================================================

// All Layout Components
export const LayoutComponents = {
  Container,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  ResponsiveGrid,
  Stack,
  VStack,
  HStack,
  CenterStack,
  Spacer,
  StackGroup,
} as const;

// All Navigation Components
export const NavigationComponents = {
  Breadcrumbs,
  BreadcrumbSeparator,
  BreadcrumbJsonLd,
  Pagination,
  PaginationItem,
  PaginationEllipsis,
  PaginationInfo,
  PaginationWithInfo,
  SidebarNav,
  SidebarNavHeader,
  SidebarNavFooter,
  TabsNav,
  TabContent,
  TabsContainer,
} as const;

// All UI Components
export const UIComponents = {
  ConfirmationDialog,
  EmptyState,
  ErrorBoundary,
  LoadingSpinner,
  LoadingOverlay,
  LoadingState,
  FileUpload,
  FormField,
  FormFieldInput,
  FormFieldGroup,
  FormSection,
  FormSectionSteps,
  RichEditor,
  MarkdownEditor,
} as const;

// All Component Variants
export const ComponentVariants = {
  containerVariants,
  flexVariants,
  flexItemVariants,
  gridVariants,
  gridItemVariants,
  stackVariants,
  stackGroupVariants,
  breadcrumbsVariants,
  breadcrumbItemVariants,
  breadcrumbLinkVariants,
  paginationVariants,
  paginationItemVariants,
  sidebarVariants,
  sidebarItemVariants,
  tabsNavVariants,
  tabsListVariants,
  tabItemVariants,
} as const;

// All Component Hooks
export const ComponentHooks = {
  useBreadcrumbs,
  usePagination,
  useSidebarNav,
  useTabsNav,
} as const;

// ===================================================================
// COMPONENT METADATA
// ===================================================================

export const COMPONENT_METADATA = {
  layout: {
    Container: {
      displayName: 'Container',
      description: 'Responsive container with max-width constraints',
      category: 'Layout',
      version: '1.0.0',
    },
    Flex: {
      displayName: 'Flex',
      description: 'Flexible box layout container',
      category: 'Layout',
      version: '1.0.0',
    },
    Grid: {
      displayName: 'Grid',
      description: 'CSS Grid layout container',
      category: 'Layout',
      version: '1.0.0',
    },
    Stack: {
      displayName: 'Stack',
      description: 'Vertical or horizontal stack layout',
      category: 'Layout',
      version: '1.0.0',
    },
  },
  navigation: {
    Breadcrumbs: {
      displayName: 'Breadcrumbs',
      description: 'Navigation breadcrumb trail',
      category: 'Navigation',
      version: '1.0.0',
    },
    Pagination: {
      displayName: 'Pagination',
      description: 'Page navigation component',
      category: 'Navigation',
      version: '1.0.0',
    },
    SidebarNav: {
      displayName: 'SidebarNav',
      description: 'Collapsible sidebar navigation',
      category: 'Navigation',
      version: '1.0.0',
    },
    TabsNav: {
      displayName: 'TabsNav',
      description: 'Tabbed navigation interface',
      category: 'Navigation',
      version: '1.0.0',
    },
  },
  ui: {
    ConfirmationDialog: {
      displayName: 'ConfirmationDialog',
      description: 'Modal dialog for confirmations',
      category: 'UI',
      version: '1.0.0',
    },
    EmptyState: {
      displayName: 'EmptyState',
      description: 'Empty state placeholder with actions',
      category: 'UI',
      version: '1.0.0',
    },
    ErrorBoundary: {
      displayName: 'ErrorBoundary',
      description: 'Error boundary for React error handling',
      category: 'UI',
      version: '1.0.0',
    },
    LoadingSpinner: {
      displayName: 'LoadingSpinner',
      description: 'Loading spinner with various sizes',
      category: 'UI',
      version: '1.0.0',
    },
    FileUpload: {
      displayName: 'FileUpload',
      description: 'Drag and drop file upload component',
      category: 'UI',
      version: '1.0.0',
    },
    FormField: {
      displayName: 'FormField',
      description: 'Form field wrapper with validation',
      category: 'UI',
      version: '1.0.0',
    },
    FormSection: {
      displayName: 'FormSection',
      description: 'Form section with collapsible content',
      category: 'UI',
      version: '1.0.0',
    },
    RichEditor: {
      displayName: 'RichEditor',
      description: 'Rich text editor with formatting toolbar',
      category: 'UI',
      version: '1.0.0',
    },
  },
} as const;

// ===================================================================
// COMPONENT REGISTRY FOR DYNAMIC IMPORTS
// ===================================================================

export const COMPONENT_REGISTRY = {
  // Layout Components
  'Container': () => import('./components/layout/container').then(m => m.Container),
  'Flex': () => import('./components/layout/flex').then(m => m.Flex),
  'FlexItem': () => import('./components/layout/flex').then(m => m.FlexItem),
  'Grid': () => import('./components/layout/grid').then(m => m.Grid),
  'GridItem': () => import('./components/layout/grid').then(m => m.GridItem),
  'ResponsiveGrid': () => import('./components/layout/grid').then(m => m.ResponsiveGrid),
  'Stack': () => import('./components/layout/stack').then(m => m.Stack),
  'VStack': () => import('./components/layout/stack').then(m => m.VStack),
  'HStack': () => import('./components/layout/stack').then(m => m.HStack),
  'CenterStack': () => import('./components/layout/stack').then(m => m.CenterStack),
  'Spacer': () => import('./components/layout/stack').then(m => m.Spacer),
  'StackGroup': () => import('./components/layout/stack').then(m => m.StackGroup),
  
  // Navigation Components
  'Breadcrumbs': () => import('./components/navigation/breadcrumbs').then(m => m.Breadcrumbs),
  'Pagination': () => import('./components/navigation/pagination').then(m => m.Pagination),
  'SidebarNav': () => import('./components/navigation/sidebar-nav').then(m => m.SidebarNav),
  'TabsNav': () => import('./components/navigation/tabs-nav').then(m => m.TabsNav),
  'TabContent': () => import('./components/navigation/tabs-nav').then(m => m.TabContent),
  'TabsContainer': () => import('./components/navigation/tabs-nav').then(m => m.TabsContainer),
  
  // UI Components
  'ConfirmationDialog': () => import('./components/ui/confirmation-dialog').then(m => m.ConfirmationDialog),
  'EmptyState': () => import('./components/ui/empty-state').then(m => m.EmptyState),
  'ErrorBoundary': () => import('./components/ui/error-boundary').then(m => m.ErrorBoundary),
  'LoadingSpinner': () => import('./components/ui/loading-spinner').then(m => m.LoadingSpinner),
  'LoadingOverlay': () => import('./components/ui/loading-spinner').then(m => m.LoadingOverlay),
  'LoadingState': () => import('./components/ui/loading-spinner').then(m => m.LoadingState),
  'FileUpload': () => import('./components/ui/file-upload').then(m => m.FileUpload),
  'FormField': () => import('./components/ui/form-field').then(m => m.FormField),
  'FormFieldInput': () => import('./components/ui/form-field').then(m => m.FormFieldInput),
  'FormFieldGroup': () => import('./components/ui/form-field').then(m => m.FormFieldGroup),
  'FormSection': () => import('./components/ui/form-section').then(m => m.FormSection),
  'FormSectionSteps': () => import('./components/ui/form-section').then(m => m.FormSectionSteps),
  'RichEditor': () => import('./components/ui/rich-editor').then(m => m.RichEditor),
  'MarkdownEditor': () => import('./components/ui/rich-editor').then(m => m.MarkdownEditor),
} as const;

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
    layout: [
      'Container',
      'Flex', 
      'FlexItem',
      'Grid',
      'GridItem', 
      'ResponsiveGrid',
      'Stack',
      'VStack',
      'HStack', 
      'CenterStack',
      'Spacer',
      'StackGroup'
    ],
    navigation: [
      'Breadcrumbs',
      'BreadcrumbSeparator',
      'BreadcrumbJsonLd', 
      'Pagination',
      'PaginationItem',
      'PaginationEllipsis',
      'PaginationInfo',
      'PaginationWithInfo',
      'SidebarNav',
      'SidebarNavHeader',
      'SidebarNavFooter',
      'TabsNav',
      'TabContent', 
      'TabsContainer'
    ],
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
      'AlertDialog',
      'ConfirmationDialog',
      'EmptyState',
      'ErrorBoundary',
      'LoadingSpinner',
      'LoadingOverlay',
      'LoadingState',
      'FileUpload',
      'FormField',
      'FormFieldInput',
      'FormFieldGroup',
      'FormSection',
      'FormSectionSteps',
      'RichEditor',
      'MarkdownEditor'
    ]
  },
  utilities: [
    'cn',
    'conditionalClass',
    'variantClass',
    'formatFileSize',
    'formatNumber',
    'formatCurrency',
    'formatDate',
    'formatRelativeTime',
    'truncateText',
    'generateInitials',
    'validationSchemas',
    'fileValidationSchemas',
    'validateField',
    'validateForm',
    'generateId',
    'composeRefs',
    'debounce',
    'isInViewport',
    'createPolymorphicComponent'
  ],
  hooks: [
    'useBreadcrumbs',
    'usePagination', 
    'useSidebarNav',
    'useTabsNav'
  ]
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
 * List all available utilities
 */
export const listUtilities = () => UI_PACKAGE_INFO.utilities;

/**
 * List all available hooks
 */
export const listHooks = () => UI_PACKAGE_INFO.hooks;

/**
 * Check if component is available
 */
export const isComponentAvailable = (componentName: string): boolean => {
  return listComponents().includes(componentName);
};

/**
 * Check if utility is available
 */
export const isUtilityAvailable = (utilityName: string): boolean => {
  return UI_PACKAGE_INFO.utilities.includes(utilityName);
};

/**
 * Check if hook is available
 */
export const isHookAvailable = (hookName: string): boolean => {
  return UI_PACKAGE_INFO.hooks.includes(hookName);
};

/**
 * Get component category
 */
export const getComponentCategory = (componentName: string): string | null => {
  const { components } = UI_PACKAGE_INFO;
  
  for (const [category, componentList] of Object.entries(components)) {
    if (componentList.includes(componentName)) {
      return category;
    }
  }
  
  return null;
};

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Get component metadata by name
 */
export const getComponentMetadata = (componentName: string) => {
  for (const category of Object.values(COMPONENT_METADATA)) {
    if (componentName in category) {
      return category[componentName as keyof typeof category];
    }
  }
  return null;
};

/**
 * Get all components in a category
 */
export const getComponentsByCategory = (category: 'layout' | 'navigation' | 'ui') => {
  return COMPONENT_METADATA[category];
};

/**
 * Check if component exists in registry
 */
export const hasComponent = (componentName: string): componentName is keyof typeof COMPONENT_REGISTRY => {
  return componentName in COMPONENT_REGISTRY;
};

/**
 * Dynamically import component
 */
export const importComponent = async (componentName: string) => {
  if (hasComponent(componentName)) {
    return await COMPONENT_REGISTRY[componentName]();
  }
  throw new Error(`Component "${componentName}" not found in registry`);
};

// ===================================================================
// THEME INTEGRATION
// ===================================================================

/**
 * UI Theme configuration type
 */
export interface UIThemeConfig {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    muted?: string;
    border?: string;
    background?: string;
    foreground?: string;
    destructive?: string;
    success?: string;
    warning?: string;
    info?: string;
  };
  spacing?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    '2xl'?: string;
    '3xl'?: string;
  };
  borderRadius?: {
    sm?: string;
    md?: string;
    lg?: string;
  };
  fontSize?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  };
  animations?: {
    fast?: string;
    normal?: string;
    slow?: string;
  };
}

/**
 * Default theme configuration
 */
export const DEFAULT_UI_THEME: Required<UIThemeConfig> = {
  colors: {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))', 
    accent: 'hsl(var(--accent))',
    muted: 'hsl(var(--muted))',
    border: 'hsl(var(--border))',
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
    destructive: 'hsl(var(--destructive))',
    success: 'hsl(142 76% 36%)',
    warning: 'hsl(38 92% 50%)',
    info: 'hsl(204 94% 94%)',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem', 
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  borderRadius: {
    sm: 'calc(var(--radius) - 4px)',
    md: 'calc(var(--radius) - 2px)', 
    lg: 'var(--radius)',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem', 
    xl: '1.25rem',
  },
  animations: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },
};

// ===================================================================
// COMPONENT TESTING UTILITIES
// ===================================================================

/**
 * Test IDs for components
 */
export const TEST_IDS = {
  // Layout
  container: 'ui-container',
  flex: 'ui-flex',
  grid: 'ui-grid', 
  stack: 'ui-stack',
  
  // Navigation
  breadcrumbs: 'ui-breadcrumbs',
  pagination: 'ui-pagination',
  sidebarNav: 'ui-sidebar-nav',
  tabsNav: 'ui-tabs-nav',
  
  // UI Components
  confirmationDialog: 'ui-confirmation-dialog',
  emptyState: 'ui-empty-state',
  errorBoundary: 'ui-error-boundary',
  loadingSpinner: 'ui-loading-spinner',
  fileUpload: 'ui-file-upload',
  formField: 'ui-form-field',
  formSection: 'ui-form-section',
  richEditor: 'ui-rich-editor',
} as const;

/**
 * Generate test props for components
 */
export const generateTestProps = (componentName: string, additionalProps?: Record<string, string>) => {
  return {
    'data-testid': TEST_IDS[componentName as keyof typeof TEST_IDS] || `ui-${componentName.toLowerCase()}`,
    'data-component': componentName,
    'data-version': UI_PACKAGE_INFO.version,
    ...additionalProps,
  };
};

// ===================================================================
// ACCESSIBILITY HELPERS
// ===================================================================

/**
 * Common ARIA labels for components
 */
export const ARIA_LABELS = {
  // Layout
  container: 'Content container',
  grid: 'Grid layout',
  stack: 'Stack layout',
  flex: 'Flex layout',
  
  // Navigation
  breadcrumbs: 'Breadcrumb navigation',
  pagination: 'Pagination navigation',
  sidebarNav: 'Sidebar navigation',
  tabsNav: 'Tab navigation',
  
  // UI Components
  confirmationDialog: 'Confirmation dialog',
  emptyState: 'Empty state',
  loadingSpinner: 'Loading content',
  fileUpload: 'File upload area',
  formField: 'Form field',
  formSection: 'Form section',
  richEditor: 'Rich text editor',
} as const;

/**
 * Generate accessibility props
 */
export const generateA11yProps = (
  componentName: string, 
  customLabel?: string,
  additionalProps?: Record<string, any>
) => {
  const label = customLabel || ARIA_LABELS[componentName as keyof typeof ARIA_LABELS];
  const navigationComponents = ['breadcrumbs', 'pagination', 'sidebarNav', 'tabsNav'];
  
  return {
    'aria-label': label,
    role: navigationComponents.includes(componentName) ? 'navigation' : undefined,
    ...additionalProps,
  };
};

// ===================================================================
// PERFORMANCE MONITORING
// ===================================================================

/**
 * Component render tracking (development only)
 */
export const trackComponentRender = (
  componentName: string, 
  props?: Record<string, any>,
  renderTime?: number
) => {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    console.debug(`[UI Package] Rendered ${componentName}`, {
      timestamp: new Date().toISOString(),
      component: componentName,
      props: props ? Object.keys(props) : undefined,
      renderTime: renderTime ? `${renderTime}ms` : undefined,
      version: UI_PACKAGE_INFO.version,
    });
  }
};

// ===================================================================
// ERROR BOUNDARIES AND ERROR HANDLING
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

// ===================================================================
// DEPRECATION WARNINGS
// ===================================================================

/**
 * Show deprecation warning for old component usage
 */
export const showDeprecationWarning = (
  oldComponent: string, 
  newComponent: string, 
  version?: string
) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `[UI Package] "${oldComponent}" is deprecated and will be removed in ${version || 'a future version'}. Please use "${newComponent}" instead.`
    );
  }
};

// ===================================================================
// COMPONENT STATISTICS AND ANALYTICS
// ===================================================================

/**
 * Get package statistics
 */
export const getPackageStats = () => {
  const components = listComponents();
  const utilities = listUtilities();
  const hooks = listHooks();
  
  return {
    totalComponents: components.length,
    totalUtilities: utilities.length,
    totalHooks: hooks.length,
    componentsByCategory: Object.entries(UI_PACKAGE_INFO.components).map(([category, items]) => ({
      category,
      count: items.length,
    })),
    version: UI_PACKAGE_INFO.version,
    lastUpdated: UI_PACKAGE_INFO.lastUpdated,
  };
};

// ===================================================================
// RUNTIME COMPONENT VALIDATION
// ===================================================================

/**
 * Validate component props at runtime (development only)
 */
export const validateComponentProps = (
  componentName: string, 
  props: Record<string, any>
): boolean => {
  if (process.env.NODE_ENV !== 'development') {
    return true;
  }

  // Basic validation - can be extended with more sophisticated checking
  if (!isComponentAvailable(componentName)) {
    console.warn(`[UI Package] Component "${componentName}" is not available`);
    return false;
  }

  // Add more validation logic here if needed
  return true;
};

// ===================================================================
// ALL COLLECTIONS FOR STORYBOOK/DOCS
// ===================================================================

export const ALL_COMPONENTS = {
  ...LayoutComponents,
  ...NavigationComponents,
  ...UIComponents,
} as const;

export const ALL_VARIANTS = ComponentVariants;
export const ALL_HOOKS = ComponentHooks;

// ===================================================================
// COMPONENT DISPLAY NAMES
// ===================================================================

export const COMPONENT_DISPLAY_NAMES = {
  Container: 'Container',
  Flex: 'Flex',
  Grid: 'Grid',
  Stack: 'Stack',
  Breadcrumbs: 'Breadcrumbs',
  Pagination: 'Pagination',
  SidebarNav: 'SidebarNav',
  TabsNav: 'TabsNav',
  ConfirmationDialog: 'ConfirmationDialog',
  EmptyState: 'EmptyState',
  ErrorBoundary: 'ErrorBoundary',
  LoadingSpinner: 'LoadingSpinner',
  FileUpload: 'FileUpload',
  FormField: 'FormField',
  FormSection: 'FormSection',
  RichEditor: 'RichEditor',
} as const;

export type ComponentDisplayName = typeof COMPONENT_DISPLAY_NAMES[keyof typeof COMPONENT_DISPLAY_NAMES];

// ===================================================================
// VERSION INFORMATION
// ===================================================================

export const UI_PACKAGE_VERSION = '1.0.0';
export const LAST_UPDATED = '2025-06-16';

// ===================================================================
// TYPE GUARDS
// ===================================================================

export const isValidSize = (size: unknown): size is Size => {
  return typeof size === 'string' && ['sm', 'md', 'lg'].includes(size);
};

export const isValidVariant = (variant: unknown): variant is Variant => {
  return typeof variant === 'string' && ['default', 'outline', 'ghost', 'solid'].includes(variant);
};

export const isValidSpacing = (spacing: unknown): spacing is Spacing => {
  return typeof spacing === 'string' && ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'].includes(spacing);
};

// ===================================================================
// END OF MAIN INDEX
// ===================================================================