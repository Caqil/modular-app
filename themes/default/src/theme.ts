import { Theme } from '@emotion/react';
import { EventManager, HookManager, Logger, ThemeManifest, ThemeStatus, ThemeSupport } from '@modular-app/core';



export class DefaultTheme implements Theme {
  public manifest: ThemeManifest;
  public status: ThemeStatus = ThemeStatus.INACTIVE;
  public path: string;
  public settings: Record<string, any> = {};
  
  private logger = new Logger('DefaultTheme');
  private hooks = HookManager.getInstance();
  private events = EventManager.getInstance();

  constructor(path: string) {
    this.path = path;
    this.manifest = {
      name: 'default',
      version: '1.0.0',
      title: 'Default Theme',
      description: 'A clean, modern theme for Modular App CMS',
      author: 'Modular App Team',
      license: 'MIT',
      homepage: 'https://modular-app.dev',
      repository: 'https://github.com/modular-app/themes',
      screenshot: '/screenshots/default.jpg',
      tags: ['blog', 'business', 'responsive', 'clean'],
      supports: [
        ThemeSupport.CUSTOM_LOGO,
        ThemeSupport.CUSTOM_COLORS,
        ThemeSupport.CUSTOM_FONTS,
        ThemeSupport.MENUS,
        ThemeSupport.WIDGETS,
        ThemeSupport.POST_THUMBNAILS,
        ThemeSupport.CUSTOM_HEADER,
        ThemeSupport.CUSTOM_BACKGROUND,
        ThemeSupport.RESPONSIVE,
        ThemeSupport.DARK_MODE,
        ThemeSupport.ACCESSIBILITY,
        ThemeSupport.EDITOR_STYLES,
        ThemeSupport.BLOCK_EDITOR,
      ],
      templates: {
        home: {
          title: 'Home Page',
          description: 'Main homepage template',
          file: 'home.tsx',
          type: 'home',
        },
        single: {
          title: 'Single Post',
          description: 'Individual post template',
          file: 'single.tsx',
          type: 'single',
          postTypes: ['post'],
        },
        page: {
          title: 'Page',
          description: 'Static page template',
          file: 'page.tsx',
          type: 'page',
          postTypes: ['page'],
        },
        archive: {
          title: 'Archive',
          description: 'Archive listing template',
          file: 'archive.tsx',
          type: 'archive',
        },
        search: {
          title: 'Search Results',
          description: 'Search results template',
          file: 'search.tsx',
          type: 'search',
        },
        '404': {
          title: '404 Not Found',
          description: '404 error page template',
          file: '404.tsx',
          type: '404',
        },
      },
      customizer: {
        sections: [
          {
            id: 'colors',
            title: 'Colors',
            description: 'Customize theme colors',
            priority: 10,
            settings: [
              {
                id: 'primary_color',
                type: 'color',
                label: 'Primary Color',
                description: 'Main brand color',
                default: '#3b82f6',
                transport: 'postMessage',
              },
              {
                id: 'secondary_color',
                type: 'color',
                label: 'Secondary Color',
                description: 'Secondary brand color',
                default: '#64748b',
                transport: 'postMessage',
              },
            ],
          },
          {
            id: 'typography',
            title: 'Typography',
            description: 'Font and text settings',
            priority: 20,
            settings: [
              {
                id: 'heading_font',
                type: 'select',
                label: 'Heading Font',
                description: 'Font family for headings',
                default: 'Inter',
                choices: {
                  'Inter': 'Inter',
                  'Roboto': 'Roboto',
                  'Poppins': 'Poppins',
                  'Merriweather': 'Merriweather',
                },
                transport: 'postMessage',
              },
              {
                id: 'body_font',
                type: 'select',
                label: 'Body Font',
                description: 'Font family for body text',
                default: 'Inter',
                choices: {
                  'Inter': 'Inter',
                  'Roboto': 'Roboto',
                  'Source Sans Pro': 'Source Sans Pro',
                  'Open Sans': 'Open Sans',
                },
                transport: 'postMessage',
              },
            ],
          },
          {
            id: 'layout',
            title: 'Layout',
            description: 'Layout and structure settings',
            priority: 30,
            settings: [
              {
                id: 'container_width',
                type: 'range',
                label: 'Container Width',
                description: 'Maximum content width in pixels',
                default: 1200,
                min: 960,
                max: 1600,
                step: 40,
                transport: 'postMessage',
              },
              {
                id: 'sidebar_position',
                type: 'radio',
                label: 'Sidebar Position',
                description: 'Position of the sidebar',
                default: 'right',
                choices: {
                  'left': 'Left',
                  'right': 'Right',
                  'none': 'No Sidebar',
                },
                transport: 'refresh',
              },
            ],
          },
          {
            id: 'header',
            title: 'Header',
            description: 'Header settings',
            priority: 40,
            settings: [
              {
                id: 'logo',
                type: 'image',
                label: 'Logo',
                description: 'Upload your site logo',
                default: '',
                transport: 'postMessage',
              },
              {
                id: 'show_search',
                type: 'checkbox',
                label: 'Show Search',
                description: 'Display search form in header',
                default: true,
                transport: 'postMessage',
              },
            ],
          },
        ],
      },
      menus: [
        {
          id: 'primary',
          title: 'Primary Menu',
          description: 'Main navigation menu',
          location: 'header',
        },
        {
          id: 'footer',
          title: 'Footer Menu',
          description: 'Footer navigation links',
          location: 'footer',
        },
      ],
      widgetAreas: [
        {
          id: 'sidebar',
          title: 'Sidebar',
          description: 'Main sidebar widget area',
          beforeWidget: '<div class="widget mb-8">',
          afterWidget: '</div>',
          beforeTitle: '<h3 class="widget-title text-lg font-semibold mb-4">',
          afterTitle: '</h3>',
        },
        {
          id: 'footer-1',
          title: 'Footer Column 1',
          description: 'First footer widget column',
          beforeWidget: '<div class="widget mb-6">',
          afterWidget: '</div>',
          beforeTitle: '<h4 class="widget-title text-base font-medium mb-3">',
          afterTitle: '</h4>',
        },
        {
          id: 'footer-2',
          title: 'Footer Column 2',
          description: 'Second footer widget column',
          beforeWidget: '<div class="widget mb-6">',
          afterWidget: '</div>',
          beforeTitle: '<h4 class="widget-title text-base font-medium mb-3">',
          afterTitle: '</h4>',
        },
        {
          id: 'footer-3',
          title: 'Footer Column 3',
          description: 'Third footer widget column',
          beforeWidget: '<div class="widget mb-6">',
          afterWidget: '</div>',
          beforeTitle: '<h4 class="widget-title text-base font-medium mb-3">',
          afterTitle: '</h4>',
        },
      ],
      requirements: {
        cmsVersion: '>=1.0.0',
        nodeVersion: '>=18.0.0',
      },
      textDomain: 'default-theme',
      colors: [
        { name: 'Primary', slug: 'primary', color: '#3b82f6' },
        { name: 'Secondary', slug: 'secondary', color: '#64748b' },
        { name: 'Success', slug: 'success', color: '#10b981' },
        { name: 'Warning', slug: 'warning', color: '#f59e0b' },
        { name: 'Danger', slug: 'danger', color: '#ef4444' },
      ],
      fonts: [
        {
          name: 'Inter',
          family: 'Inter',
          variants: ['400', '500', '600', '700'],
          subsets: ['latin'],
          source: 'google',
        },
        {
          name: 'Roboto',
          family: 'Roboto',
          variants: ['300', '400', '500', '700'],
          subsets: ['latin'],
          source: 'google',
        },
      ],
    };
  }

  async activate(): Promise<void> {
    this.logger.info('Activating Default Theme');
    
    // Register theme hooks
    this.hooks.addAction('theme:setup', this.setupTheme.bind(this), 10, 'default-theme');
    this.hooks.addAction('wp:enqueue_scripts', this.enqueueScripts.bind(this), 10, 'default-theme');
    this.hooks.addFilter('body_class', this.addBodyClasses.bind(this), 10, 'default-theme');
    
    // Setup theme defaults
    await this.setupTheme();
    
    this.status = ThemeStatus.ACTIVE;
    this.events.emit('theme:activated', { theme: 'default' });
  }

  async deactivate(): Promise<void> {
    this.logger.info('Deactivating Default Theme');
    
    // Remove theme hooks
    this.hooks.removeAction('theme:setup', 'default-theme');
    this.hooks.removeAction('wp:enqueue_scripts', 'default-theme');
    this.hooks.removeFilter('body_class', 'default-theme');
    
    this.status = ThemeStatus.INACTIVE;
    this.events.emit('theme:deactivated', { theme: 'default' });
  }

  async install(): Promise<void> {
    this.logger.info('Installing Default Theme');
    this.status = ThemeStatus.INSTALLED;
  }

  async uninstall(): Promise<void> {
    this.logger.info('Uninstalling Default Theme');
    this.status = ThemeStatus.INACTIVE;
  }

  async update(oldVersion: string, newVersion: string): Promise<void> {
    this.logger.info(`Updating Default Theme from ${oldVersion} to ${newVersion}`);
  }

  private async setupTheme(): Promise<void> {
    // Add theme support features
    // This would interact with the theme manager to enable features
  }

  private async enqueueScripts(): Promise<void> {
    // Enqueue theme styles and scripts
    // This would be handled by the asset manager
  }

  private addBodyClasses(classes: string[]): string[] {
    return [...classes, 'default-theme', 'responsive'];
  }
}