import type { Metadata } from 'next';
import Missing from './missing';

// Exported as 404.html: the invite page for /join/<code>, and "page not found" for anything else.
export const metadata: Metadata = { robots: { index: false } };

export default function NotFound() {
  return <Missing />;
}
