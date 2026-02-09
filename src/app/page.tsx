'use client'

import { useState, useEffect } from 'react'
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

  // Fix viewport height for mobile browsers
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    
    setVH()
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', setVH)
    
    return () => {
      window.removeEventListener('resize', setVH)
      window.removeEventListener('orientationchange', setVH)
    }
  }, [])

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
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          height: calc(var(--vh, 1vh) * 100);
          width: 100vw;
          overflow: hidden;
          font-family: 'Cairo', sans-serif;
        }

        body {
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
        }
      `}</style>
      
      <div style={{
        height: 'calc(var(--vh, 1vh) * 100)',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'clamp(10px, 2vh, 20px)',
        background: 'linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%)'
      }}>
        
        <div style={{
          background: '#ffffff',
          padding: 'clamp(20px, 4vh, 40px) clamp(20px, 3vw, 40px)',
          borderRadius: 'clamp(10px, 1.5vh, 20px)',
          boxShadow: '0 1vh 3vh rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: 'clamp(300px, 90vw, 450px)',
          maxHeight: '95vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* Logo */}
          <div style={{
            width: 'clamp(80px, 15vw, 150px)',
            height: 'clamp(80px, 15vw, 150px)',
            margin: '0 auto clamp(10px, 2vh, 20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
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
            marginBottom: 'clamp(5px, 1vh, 10px)',
            fontSize: 'clamp(16px, 2.5vw, 28px)',
            fontWeight: '700',
            lineHeight: '1.3',
            textAlign: 'center',
            flexShrink: 0
          }}>
            مسابقة مركز رياض العلم لحفظ القرآن الكريم
          </h1>
          
          {/* Subtitle */}
          <p style={{
            color: '#666666',
            marginBottom: 'clamp(15px, 3vh, 30px)',
            fontSize: 'clamp(12px, 1.5vw, 16px)',
            textAlign: 'center',
            flexShrink: 0
          }}>
            نظام الإدارة والتقييم
          </p>

          {/* Error Message */}
          {error && (
            <div style={{
              color: '#e74c3c',
              background: '#ffebee',
              padding: 'clamp(8px, 1.2vh, 12px)',
              borderRadius: 'clamp(4px, 0.8vh, 8px)',
              marginBottom: 'clamp(10px, 2vh, 20px)',
              fontSize: 'clamp(11px, 1.2vw, 14px)',
              textAlign: 'center',
              flexShrink: 0
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* Username Field */}
            <div style={{ marginBottom: 'clamp(10px, 2vh, 20px)', textAlign: 'right' }}>
              <label 
                htmlFor="username"
                style={{
                  display: 'block',
                  color: '#555555',
                  marginBottom: 'clamp(4px, 0.8vh, 8px)',
                  fontWeight: '600',
                  fontSize: 'clamp(11px, 1.2vw, 14px)'
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
                  padding: 'clamp(10px, 1.5vh, 15px)',
                  border: '2px solid #e0e0e0',
                  borderRadius: 'clamp(5px, 1vh, 10px)',
                  fontSize: 'clamp(13px, 1.5vw, 16px)',
                  textAlign: 'right',
                  fontFamily: 'Cairo, sans-serif',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#5fb3b3'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: 'clamp(10px, 2vh, 20px)', textAlign: 'right' }}>
              <label 
                htmlFor="password"
                style={{
                  display: 'block',
                  color: '#555555',
                  marginBottom: 'clamp(4px, 0.8vh, 8px)',
                  fontWeight: '600',
                  fontSize: 'clamp(11px, 1.2vw, 14px)'
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
                  padding: 'clamp(10px, 1.5vh, 15px)',
                  border: '2px solid #e0e0e0',
                  borderRadius: 'clamp(5px, 1vh, 10px)',
                  fontSize: 'clamp(13px, 1.5vw, 16px)',
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
                padding: 'clamp(12px, 1.5vh, 15px)',
                background: 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'clamp(5px, 1vh, 10px)',
                fontSize: 'clamp(14px, 1.6vw, 18px)',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 'clamp(5px, 1vh, 10px)',
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