'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single()

      if (fetchError || !user) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة')
        setLoading(false)
        setTimeout(() => setError(''), 3000)
        return
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash)

      if (!passwordMatch) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة')
        setLoading(false)
        setTimeout(() => setError(''), 3000)
        return
      }

      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role
      }))

      router.push('/dashboard')

    } catch (err) {
      setError('حدث خطأ أثناء تسجيل الدخول')
      setLoading(false)
      setTimeout(() => setError(''), 3000)
    }
  }

  return (
    <>
      <style jsx global>{`
        body {
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          min-height: 100vh;
        }
      `}</style>
      
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        background: 'linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%)'
      }}>
        
        <div style={{
          background: '#ffffff',
          padding: '40px',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '450px'
        }}>
          
          {/* Logo */}
          <div style={{
            width: '150px',
            height: '150px',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Image
              src="/images/logo.svg"
              alt="شعار مركز رياض العلم"
              width={150}
              height={150}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              priority
            />
          </div>

          {/* Title */}
          <h1 style={{
            color: '#333333',
            marginBottom: '10px',
            fontSize: '28px',
            fontWeight: '700',
            lineHeight: '1.3',
            textAlign: 'center'
          }}>
            مسابقة مركز رياض العلم لحفظ القرآن الكريم
          </h1>
          
          {/* Subtitle */}
          <p style={{
            color: '#666666',
            marginBottom: '30px',
            fontSize: '16px',
            textAlign: 'center'
          }}>
            نظام الإدارة والتقييم
          </p>

          {/* Error Message */}
          {error && (
            <div style={{
              color: '#e74c3c',
              background: '#ffebee',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            {/* Username Field */}
            <div style={{ marginBottom: '20px', textAlign: 'right' }}>
              <label 
                htmlFor="username"
                style={{
                  display: 'block',
                  color: '#555555',
                  marginBottom: '8px',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                اسم المستخدم
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '15px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  textAlign: 'right',
                  fontFamily: 'Cairo, sans-serif',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#5fb3b3'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '20px', textAlign: 'right' }}>
              <label 
                htmlFor="password"
                style={{
                  display: 'block',
                  color: '#555555',
                  marginBottom: '8px',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                كلمة المرور
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '15px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '16px',
                  textAlign: 'right',
                  fontFamily: 'Cairo, sans-serif',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#5fb3b3'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                background: 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '10px',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}