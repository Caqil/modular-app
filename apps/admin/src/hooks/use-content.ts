
import { useState, useCallback } from 'react';
import type { PostType, PageType, ContentStatus } from '@modular-app/core';
import { ContentAPI } from '../types/content';

interface ContentState {
  posts: PostType[];
  pages: PageType[];
  isLoading: boolean;
  error: string | null;
}

export const useContent = () => {
  const [state, setState] = useState<ContentState>({
    posts: [],
    pages: [],
    isLoading: false,
    error: null,
  });

  const fetchPosts = useCallback(async (options?: Parameters<typeof ContentAPI.getPosts>[0]) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await ContentAPI.getPosts(options);
      setState(prev => ({ 
        ...prev, 
        posts: response.data,
        isLoading: false 
      }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch posts';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  const fetchPages = useCallback(async (options?: Parameters<typeof ContentAPI.getPages>[0]) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await ContentAPI.getPages(options);
      setState(prev => ({ 
        ...prev, 
        pages: response.data,
        isLoading: false 
      }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch pages';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  const createPost = useCallback(async (data: Parameters<typeof ContentAPI.createPost>[0]) => {
    try {
      const post = await ContentAPI.createPost(data);
      setState(prev => ({ 
        ...prev, 
        posts: [...prev.posts, post] 
      }));
      return post;
    } catch (error) {
      throw error;
    }
  }, []);

  const updatePost = useCallback(async (id: string, data: Parameters<typeof ContentAPI.updatePost>[1]) => {
    try {
      const post = await ContentAPI.updatePost(id, data);
      setState(prev => ({ 
        ...prev, 
        posts: prev.posts.map(p => p._id === id ? post : p)
      }));
      return post;
    } catch (error) {
      throw error;
    }
  }, []);

  const deletePost = useCallback(async (id: string) => {
    try {
      await ContentAPI.deletePost(id);
      setState(prev => ({ 
        ...prev, 
        posts: prev.posts.filter(p => p._id !== id)
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  const createPage = useCallback(async (data: Parameters<typeof ContentAPI.createPage>[0]) => {
    try {
      const page = await ContentAPI.createPage(data);
      setState(prev => ({ 
        ...prev, 
        pages: [...prev.pages, page] 
      }));
      return page;
    } catch (error) {
      throw error;
    }
  }, []);

  const updatePage = useCallback(async (id: string, data: Parameters<typeof ContentAPI.updatePage>[1]) => {
    try {
      const page = await ContentAPI.updatePage(id, data);
      setState(prev => ({ 
        ...prev, 
        pages: prev.pages.map(p => p._id === id ? page : p)
      }));
      return page;
    } catch (error) {
      throw error;
    }
  }, []);

  const deletePage = useCallback(async (id: string) => {
    try {
      await ContentAPI.deletePage(id);
      setState(prev => ({ 
        ...prev, 
        pages: prev.pages.filter(p => p._id !== id)
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    ...state,
    fetchPosts,
    fetchPages,
    createPost,
    updatePost,
    deletePost,
    createPage,
    updatePage,
    deletePage,
  };
};
