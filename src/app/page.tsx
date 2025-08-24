'use client'

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkServerAuth = async () => {
      if (!loading && user) {
        try {
          const res = await fetch('/api/profile', { cache: 'no-store' });
          if (res.ok) router.replace('/dashboard');
        } catch {}
      }
    };
    checkServerAuth();
  }, [user, loading, router]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, don't render homepage content
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation Bar */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Family Tree App
          </h1>
          <div className="flex items-center space-x-4">
              <>
                <Button variant="outline" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Family Tree App
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Collaboratively build and view your family tree with AI-powered assistance
          </p>
        </div>
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              <Card>
                <CardHeader>
                  <CardTitle>🏠 Create Your Family</CardTitle>
                  <CardDescription>
                    Start building your family tree by creating a new family group
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>👥 Collaborate</CardTitle>
                  <CardDescription>
                    Invite family members to contribute and build together
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🤖 AI Assistant</CardTitle>
                  <CardDescription>
                    Get help organizing and understanding your family history
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="text-center">
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                  <CardDescription>
                    Create an account to start building your family tree today!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Button variant="outline" asChild>
                      <Link href="/signup">Sign Up</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/login">Sign In</Link>
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Join thousands of families preserving their history
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
      </div>
    </div>
  );
}
