'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function AuthResetButton() {
  const [isResetting, setIsResetting] = useState(false);
  const router = useRouter();

  const resetAuth = async () => {
    try {
      setIsResetting(true);
      // Clear auth cookies
      await fetch('/api/auth/reset');
      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Failed to reset auth:', error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Button
      onClick={resetAuth}
      variant="destructive"
      disabled={isResetting}
    >
      {isResetting ? 'Resetting...' : 'Reset Authentication State'}
    </Button>
  );
} 