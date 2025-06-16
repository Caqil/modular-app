export { DefaultTheme } from './theme';
export { default as ThemeHelpers } from './theme-helpers';
export { useThemeSettings } from './hooks/use-theme-settings';
export { useCustomization } from './hooks/use-customization';

// Component exports
export { default as Header } from './components/header';
export { default as Footer } from './components/footer';
export { default as Navigation } from './components/navigation';
export { default as Sidebar } from './components/sidebar';
export { default as SearchForm } from './components/search-form';
export { default as CommentForm } from './components/comment-form';
export { default as PostSingle } from './components/post-single';
export { default as PostList } from './components/post-list';
export { default as PageSingle } from './components/page-single';
export { default as ContentArea } from './components/content-area';

// Widget exports
export { default as RecentPosts } from './widgets/recent-posts';
export { default as Categories } from './widgets/categories';
export { default as Tags } from './widgets/tags';

// Template exports
export { default as HomePage } from './templates/home';
export { default as SingleTemplate } from './templates/single';
export { default as PageTemplate } from './templates/page';
export { default as ArchiveTemplate } from './templates/archive';
export { default as SearchTemplate } from './templates/search';
export { default as NotFoundTemplate } from './templates/404';


// Theme configuration
export const themeConfig = {
  name: 'default',
  version: '1.0.0',
  author: 'Modular App Team',
  description: 'A clean, modern theme for Modular App CMS',
  supports: [
    'custom-logo',
    'custom-colors',
    'custom-fonts',
    'menus',
    'widgets',
    'post-thumbnails',
    'responsive',
    'dark-mode',
    'accessibility',
  ],
};