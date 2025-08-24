"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { signInWithGoogle, signInWithFacebook, signInWithLinkedIn } from '@/lib/auth-actions'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const checkServerAuth = async () => {
      if (!loading && user) {
        try {
          const res = await fetch('/api/profile', { cache: 'no-store' })
          if (res.ok) router.replace('/dashboard')
        } catch {}
      }
    }
    checkServerAuth()
  }, [user, loading, router])

  const supabase = createClient()

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  })

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'linkedin') => {
    setIsLoading(true)
    setError(null)
    
    try {
      let result
      switch (provider) {
        case 'google':
          result = await signInWithGoogle()
          break
        case 'facebook':
          result = await signInWithFacebook()
          break
        case 'linkedin':
          result = await signInWithLinkedIn()
          break
      }
      
      if (result?.error) {
        setError(result.error)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking authentication or redirecting
  if (loading || user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-green-600 mb-4">Account Created!</h2>
            <p className="text-gray-600 mb-6">
              Please check your email to confirm your account before signing in.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Go to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="w-20 h-20 mx-auto bg-gray-200 rounded border-2 border-gray-300 flex items-center justify-center mb-6">
              <span className="text-gray-500 text-sm">logo app</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Login/Sign Up Buttons */}
            <div className="grid grid-cols-2 gap-0 mb-6">
              <Button 
                variant="outline" 
                className="h-12 rounded-r-none border-r-0" 
                asChild
              >
                <Link href="/login">Log In</Link>
              </Button>
              <Button 
                variant="default" 
                className="h-12 rounded-l-none text-white bg-blue-500 hover:bg-blue-600"
              >
                Sign Up
              </Button>
            </div>

            {/* Social Login Buttons */}
            <div className="flex justify-center items-center space-x-4 mb-6">
              <Button 
                variant="ghost"
                size="icon"
                className="w-12 h-12 text-2xl hover:bg-gray-100"
                onClick={() => handleSocialLogin('facebook')}
                disabled={isLoading}
              >
                f
              </Button>
              <Button 
                variant="ghost"
                size="icon"
                className="w-12 h-12 text-2xl font-bold hover:bg-gray-100"
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
              >
                G
              </Button>
              <Button 
                variant="ghost"
                size="icon"
                className="w-12 h-12 text-2xl hover:bg-gray-100"
                onClick={() => handleSocialLogin('linkedin')}
                disabled={isLoading}
              >
                in
              </Button>
            </div>

            <div className="text-center text-gray-500 mb-6">or</div>

            {/* Error Message */}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded border border-red-200">
                {error}
              </div>
            )}

            {/* Signup Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="email"
                            placeholder="your@example.com"
                            className="h-12 pl-10"
                            {...field}
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-5 h-5 bg-gray-400 rounded"></div>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="password"
                            placeholder="your password"
                            className="h-12 pl-10"
                            {...field}
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-5 h-5 bg-gray-400 rounded-full"></div>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="password"
                            placeholder="confirm your password"
                            className="h-12 pl-10"
                            {...field}
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-5 h-5 bg-gray-400 rounded-full"></div>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="text-sm font-normal">
                        <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">
                          I accept term en condition
                        </Link>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-medium mt-6"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'SIGN UP'}
                  <span className="ml-2">→</span>
                </Button>
              </form>
            </Form>

            {/* Additional Links */}
            <div className="text-center space-y-2 mt-6">
              <div className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link 
                  href="/login" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Log in here
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
