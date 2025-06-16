'use client';

import React from 'react';
import { useThemeSettings } from '../hooks/use-theme-settings';
import { Header, ThemeHelpers } from '..';
import { IPage } from '@modular-app/core/database/models';

interface PageTemplateProps {
  page: IPage;
  childPages?: IPage[];
}

export default function PageTemplate({ page, childPages = [] }: PageTemplateProps) {
  const { settings } = useThemeSettings();
  const sidebarPosition = settings.sidebar_position || 'right';
  const showSidebar = sidebarPosition !== 'none' && !page.meta?.isHomepage;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        {!page.meta?.isHomepage && (
          <nav className="mb-8" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
              {ThemeHelpers.generateBreadcrumbs(page).map((crumb, index, array) => (
                <li key={index} className="flex items-center">
                  {crumb.url ? (
                    <a href={crumb.url} className="hover:text-primary">
                      {crumb.title}
                    </a>
                  ) : (
                    <span className="text-foreground">{crumb.title}</span>
                  )}
                  {index < array.length - 1 && (
                    <span className="mx-2">/</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Main Content Area */}
        <div className={`grid gap-8 ${showSidebar ? 'lg:grid-cols-12' : 'lg:grid-cols-1'}`}>
          {/* Page Content */}
          <div className={showSidebar ? 'lg:col-span-8' : 'lg:col-span-12'}>
            <ContentArea>
              <PageSingle page={page} />
              
              {/* Child Pages */}
              {childPages.length > 0 && (
                <section className="mt-12">
                  <ChildPages pages={childPages} />
                </section>
              )}
            </ContentArea>
          </div>

          {/* Sidebar */}
          {showSidebar && (
            <div className={`lg:col-span-4 ${sidebarPosition === 'left' ? 'lg:order-first' : ''}`}>
              <Sidebar />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Child Pages Component
interface ChildPagesProps {
  pages: IPage[];
}

function ChildPages({ pages }: ChildPagesProps) {
  return (
    <div className="border-t border-border pt-8">
      <h3 className="text-2xl font-bold mb-6">Subpages</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pages.map((page) => (
          <article key={page._id.toString()} className="group border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h4 className="font-semibold mb-2">
              <a
                href={ThemeHelpers.getPageUrl(page)}
                className="group-hover:text-primary"
              >
                {page.title}
              </a>
            </h4>
            {page.excerpt && (
              <p className="text-muted-foreground text-sm line-clamp-3">
                {page.excerpt}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}