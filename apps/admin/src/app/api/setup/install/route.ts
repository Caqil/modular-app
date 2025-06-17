import { NextRequest, NextResponse } from 'next/server';
import { runInitialSetup, DatabaseConnection } from '@modular-app/core';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Connect to database first
    const db = DatabaseConnection.getInstance();
    await db.connect({
      uri: data.database.uri,
      name: data.database.name || 'modular_app',
      options: {}
    });

    // Run setup
    const result = await runInitialSetup({
      admin: {
        username: data.admin.username,
        email: data.admin.email,
        password: data.admin.password,
        firstName: data.admin.firstName || '',
        lastName: data.admin.lastName || '',
      },
      site: {
        title: data.site.title,
        description: data.site.description || '',
        url: data.site.url,
        language: 'en',
        timezone: 'UTC',
      },
      database: {
        skipIndexes: false,
        skipData: false,
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Installation failed'
    }, { status: 500 });
  }
}