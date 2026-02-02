import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isAllowedIP(request: NextRequest): boolean {
  // Get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0].trim() || realIp || request.ip || '';
  const cleanIP = ip.replace(/^::ffff:/, '');
  
  const allowed = [
    /^127\.0\.0\.1$/,
    /^::1$/,
    /^192\.168\.\d{1,3}\.\d{1,3}$/,
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/,
    /^100\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,  // Tailscale
  ];
  
  return allowed.some(pattern => pattern.test(cleanIP));
}

export function middleware(request: NextRequest) {
  if (!isAllowedIP(request)) {
    console.log(`Blocked request from: ${request.ip || 'unknown'}`);
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  return NextResponse.next();
}

// Apply to all routes
export const config = {
  matcher: '/:path*',
};
