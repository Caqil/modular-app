import { Plugin } from '@modular-app/core';
import { BlogPost, BlogCategory } from './models';
import { blogRoutes } from './api';

export default class BlogPlugin extends Plugin {
  async activate(): Promise<void> {
    console.log('Blog plugin activated');
    
    // Register models
    this.registerModel('BlogPost', BlogPost);
    this.registerModel('BlogCategory', BlogCategory);
    
    // Register API routes
    this.registerRoutes(blogRoutes);
    
    // Register hooks
    this.registerHook('content:render', this.renderBlogContent.bind(this));
    this.registerHook('admin:menu', this.addAdminMenu.bind(this));
  }

  async deactivate(): Promise<void> {
    console.log('Blog plugin deactivated');
    
    // Cleanup
    this.unregisterModel('BlogPost');
    this.unregisterModel('BlogCategory');
    this.unregisterRoutes(blogRoutes);
  }

  private async renderBlogContent(content: any): Promise<any> {
    // Add blog-specific content rendering logic
    return content;
  }

  private async addAdminMenu(menu: any[]): Promise<any[]> {
    menu.push({
      title: 'Blog',
      icon: 'BookOpen',
      children: [
        { title: 'All Posts', href: '/admin/blog/posts' },
        { title: 'Add New', href: '/admin/blog/posts/create' },
        { title: 'Categories', href: '/admin/blog/categories' },
      ],
    });
    return menu;
  }
}
