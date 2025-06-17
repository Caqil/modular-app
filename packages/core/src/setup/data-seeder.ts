import { Logger } from '../utils/logger';
import { SettingsRepository } from '../database/repositories/settings-repository';
import { UserRepository } from '../database/repositories/user-repository';
import { UserRole, UserStatus } from '../types/user';
import { ContentStatus } from '../types/content';
import { PageModel, PostModel,UserModel } from 'src/server';

export class DataSeeder {
  private logger = new Logger('DataSeeder');
  private settingsRepo = new SettingsRepository();
  private userRepo = new UserRepository();

  /**
   * Seed essential default data
   */
  async seedDefaultData() {
    this.logger.info('Seeding default data...');

    const results = {
      settings: 0,
      pages: 0,
      posts: 0
    };

    try {
      // Create default homepage
      const existingHomepage = await PageModel.findOne({ 'meta.isHomepage': true });
      if (!existingHomepage) {
        const adminUser = await UserModel.findOne({ role: UserRole.ADMIN });
        
        if (adminUser) {
          await PageModel.create({
            title: 'Welcome to Modular App',
            slug: 'home',
            content: `
              <h1>Welcome to Modular App</h1>
              <p>Your modern CMS is ready! This is your homepage - you can edit this content from the admin dashboard.</p>
              <h2>Getting Started</h2>
              <ul>
                <li>Visit the admin dashboard to manage your content</li>
                <li>Create new posts and pages</li>
                <li>Customize your site settings</li>
                <li>Install and configure plugins</li>
              </ul>
            `,
            status: ContentStatus.PUBLISHED,
            author: adminUser._id,
            meta: {
              isHomepage: true,
              showInMenu: true,
            },
            publishedAt: new Date(),
          });
          results.pages++;
        }
      }

      // Create sample blog post
      const existingSamplePost = await PostModel.findOne({ slug: 'hello-world' });
      if (!existingSamplePost) {
        const adminUser = await UserModel.findOne({ role: UserRole.ADMIN });
        
        if (adminUser) {
          await PostModel.create({
            title: 'Hello World!',
            slug: 'hello-world',
            content: `
              <p>Welcome to Modular App! This is your first blog post. You can edit or delete it from the admin dashboard.</p>
              <p>Some things you can do:</p>
              <ul>
                <li>Write and publish blog posts</li>
                <li>Manage categories and tags</li>
                <li>Upload and organize media</li>
                <li>Customize your site appearance</li>
              </ul>
              <p>Happy blogging!</p>
            `,
            excerpt: 'Welcome to Modular App! This is your first blog post.',
            status: ContentStatus.PUBLISHED,
            author: adminUser._id,
            categories: [],
            tags: ['welcome', 'getting-started'],
            publishedAt: new Date(),
          });
          results.posts++;
        }
      }

      this.logger.info('Default data seeding completed', results);
      return results;

    } catch (error) {
      this.logger.error('Error seeding default data:', error);
      throw error;
    }
  }
}