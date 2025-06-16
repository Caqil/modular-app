import { CommentModel, MediaModel, PageModel, PluginModel, PostModel, SettingModel, UserModel } from '@modular-app/core';

export {
  DatabaseConnection,
  UserModel,
  PostModel,
  PageModel,
  MediaModel,
  CategoryModel,
  TagModel,
  CommentModel,
  PluginModel,
  SettingModel,
} from '@modular-app/core';

// Import repositories
export {
  BaseRepository,
  UserRepository,
  SettingsRepository,
} from '@modular-app/core';

// Import database types
export type {
  IUser,
  IPost,
  IPage,
  IMedia,
  ICategory,
  ITag,
  IComment,
  IPlugin,
  ISetting,
} from '@modular-app/core';

// Admin-specific database utilities
export const AdminDatabase = {
  /**
   * Get database connection status for admin dashboard
   */
  async getConnectionStatus(): Promise<{
    connected: boolean;
    status: string;
    latency?: number;
  }> {
    try {
      const start = Date.now();
      await UserModel.findOne({}).limit(1).lean().exec();
      const latency = Date.now() - start;
      
      return {
        connected: true,
        status: 'Connected',
        latency
      };
    } catch (error) {
      return {
        connected: false,
        status: 'Disconnected'
      };
    }
  },

  /**
   * Get database statistics for dashboard
   */
  async getStats(): Promise<{
    users: number;
    posts: number;
    pages: number;
    media: number;
    comments: number;
    plugins: number;
    settings: number;
  }> {
    const [users, posts, pages, media, comments, plugins, settings] = await Promise.all([
      UserModel.countDocuments(),
      PostModel.countDocuments(),
      PageModel.countDocuments(),
      MediaModel.countDocuments(),
      CommentModel.countDocuments(),
      PluginModel.countDocuments(),
      SettingModel.countDocuments(),
    ]);

    return { users, posts, pages, media, comments, plugins, settings };
  },

  /**
   * Get recent activity for dashboard
   */
  async getRecentActivity(limit = 10): Promise<Array<{
    type: string;
    title: string;
    date: Date;
    user?: string;
  }>> {
    const [recentPosts, recentUsers, recentComments] = await Promise.all([
      PostModel.find({})
        .populate('author', 'username')
        .sort({ createdAt: -1 })
        .limit(limit / 3)
        .lean(),
      UserModel.find({})
        .sort({ createdAt: -1 })
        .limit(limit / 3)
        .lean(),
      CommentModel.find({})
        .populate('author', 'username')
        .sort({ createdAt: -1 })
        .limit(limit / 3)
        .lean(),
    ]);

    const activity = [
      ...recentPosts.map(post => ({
        type: 'post',
        title: `New post: ${post.title}`,
        date: post.createdAt,
        user: (post.author as any)?.username,
      })),
      ...recentUsers.map(user => ({
        type: 'user',
        title: `New user: ${user.username}`,
        date: user.createdAt,
      })),
      ...recentComments.map(comment => ({
        type: 'comment',
        title: `New comment: ${comment.content.substring(0, 50)}...`,
        date: comment.createdAt,
        user: (comment.author as any)?.username,
      })),
    ];

    return activity
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  },
};