import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export function SendResetPasswordLink() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const send_reset_link = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setMessage('')
    setError('')

    try {
      await api.post(`/auth/send_reset_password_link`, { email })
      setMessage('Password reset link has been sent to your email')
      setEmail('')
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        'Failed to send reset link. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      send_reset_link()
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset your password
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>

            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">
                {message}
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={send_reset_link} disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function ResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const reset_token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    if (!reset_token) {
      setError('Invalid or missing reset token')
    }
  }, [reset_token])

  const handle_password_reset = async () => {
    if (!newPassword) return setError('Please enter a new password')
    if (newPassword !== confirmPassword) return setError('Passwords do not match')
    if (newPassword.length < 6) return setError('Password must be at least 6 characters long')
    if (!reset_token) return setError('Invalid reset token')

    setLoading(true)
    setMessage('')
    setError('')

    try {
      console.log(newPassword, reset_token)
      const data={
        "email": email,
        "token": reset_token,
        "new_password": newPassword
      }
      await api.post(`/auth/reset_password`, data)

      setMessage('Password has been reset successfully!')

      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        'Failed to reset password. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading && reset_token) {
      handle_password_reset()
    }
  }

  if (!reset_token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
          </CardHeader>

          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Invalid or missing reset token. Please request a new password reset link.
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate('/request_reset_link')}
            >
              Request New Link
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New Password</CardTitle>
          <CardDescription>Please enter your new password below</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />

          <Input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handle_password_reset}
            disabled={loading || !reset_token}
            className="w-full"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}