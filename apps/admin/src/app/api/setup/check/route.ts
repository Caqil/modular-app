import { NextResponse } from 'next/server';
import { checkInstallationStatus } from '@modular-app/core';

export async function GET() {
  try {
    const status = await checkInstallationStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({
      installed: false,
      adminExists: false,
      settingsExist: false,
      error: 'Database connection failed'
    });
  }
}