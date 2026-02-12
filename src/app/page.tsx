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
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Noto+Kufi+Arabic:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      
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
        }

        body {
          background: #0A0F0A;
          font-family: 'Noto Kufi Arabic', 'Sora', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #F0FDF4;
          -webkit-font-smoothing: antialiased;
        }

        /* Animated Background Orbs */
        .bg-canvas {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.3;
        }

        .bg-orb.green-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #22C55E, transparent 70%);
          bottom: -15%;
          left: 20%;
          animation: orbPulse1 15s ease-in-out infinite alternate;
        }

        .bg-orb.green-2 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, #166534, transparent 70%);
          top: 10%;
          right: -5%;
          animation: orbPulse2 20s ease-in-out infinite alternate;
        }

        .bg-orb.gold-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #C8A24E, transparent 70%);
          top: 35%;
          left: -8%;
          opacity: 0.18;
          animation: orbPulse3 18s ease-in-out infinite alternate;
        }

        .bg-orb.gold-2 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, #D4AF5E, transparent 70%);
          bottom: 20%;
          right: -5%;
          opacity: 0.12;
          animation: orbPulse2 22s ease-in-out infinite alternate;
        }

        @keyframes orbPulse1 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.25; }
          50% { transform: translate(30px, -20px) scale(1.15); opacity: 0.35; }
          100% { transform: translate(-20px, 10px) scale(0.95); opacity: 0.2; }
        }

        @keyframes orbPulse2 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-40px, 30px) scale(1.1); }
        }

        @keyframes orbPulse3 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, -20px) scale(1.08); }
        }

        .bg-canvas::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(34, 197, 94, 0.012) 2px,
            rgba(34, 197, 94, 0.012) 4px
          );
          pointer-events: none;
        }

        @keyframes goldShimmer {
          0% { background-position: 0% center; }
          50% { background-position: 100% center; }
          100% { background-position: 0% center; }
        }
      `}</style>
      
      {/* Animated Background */}
      <div className="bg-canvas">
        <div className="bg-orb green-1"></div>
        <div className="bg-orb green-2"></div>
        <div className="bg-orb gold-1"></div>
        <div className="bg-orb gold-2"></div>
      </div>

      <div style={{
        height: 'calc(var(--vh, 1vh) * 100)',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'clamp(10px, 2vh, 20px)',
        position: 'relative',
        zIndex: 1
      }}>
        
        {/* Glass Morphism Card */}
        <div style={{
          background: 'rgba(34, 197, 94, 0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(34, 197, 94, 0.15)',
          padding: 'clamp(30px, 4vh, 44px) clamp(24px, 3vw, 28px)',
          borderRadius: 'clamp(20px, 3vh, 32px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 80px rgba(34, 197, 94, 0.05)',
          width: '100%',
          maxWidth: 'clamp(340px, 90vw, 390px)',
          maxHeight: '95vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          
          {/* Gold Glow at Top */}
          <div style={{
            position: 'absolute',
            top: '-60px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '250px',
            height: '140px',
            background: 'radial-gradient(ellipse, rgba(200, 162, 78, 0.3), transparent 70%)',
            pointerEvents: 'none',
            opacity: 0.6,
            zIndex: 0
          }}></div>

          {/* Logo with Gold Border */}
          <div style={{
            width: 'clamp(80px, 15vw, 92px)',
            height: 'clamp(80px, 15vw, 92px)',
            margin: '0 auto clamp(15px, 2vh, 18px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0B1F0E, #0A0F0A)',
            border: '2px solid #C8A24E',
            boxShadow: '0 0 28px rgba(200,162,78,0.3), 0 0 8px rgba(200,162,78,0.2)',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1
          }}>
            <Image
              src="/images/logo.svg"
              alt="شعار مركز رياض العلم"
              width={92}
              height={92}
              style={{ 
                width: '70%', 
                height: '70%', 
                objectFit: 'contain',
                filter: 'brightness(0) saturate(100%) invert(79%) sepia(18%) saturate(1234%) hue-rotate(359deg) brightness(95%) contrast(88%)'
              }}
              priority
            />
          </div>

          {/* Title with Gold Gradient */}
          <h1 style={{
            color: '#E0C478',
            marginBottom: 'clamp(4px, 1vh, 6px)',
            fontSize: 'clamp(18px, 2.8vw, 23px)',
            fontWeight: '700',
            lineHeight: '1.3',
            textAlign: 'center',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
            background: 'linear-gradient(135deg, #C8A24E, #E0C478, #D4AF5E)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            مسابقة مركز رياض العلم لحفظ القرآن الكريم
          </h1>
          
          {/* Subtitle */}
          <p style={{
            color: 'rgba(240, 253, 244, 0.6)',
            marginBottom: 'clamp(20px, 3vh, 28px)',
            fontSize: 'clamp(11px, 1.4vw, 13px)',
            textAlign: 'center',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
            fontWeight: '400'
          }}>
            نظام الإدارة والتقييم
          </p>

          {/* Error Message */}
          {error && (
            <div style={{
              color: '#F0FDF4',
              background: 'rgba(220, 38, 38, 0.15)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              padding: 'clamp(10px, 1.5vh, 12px)',
              borderRadius: 'clamp(8px, 1.2vh, 12px)',
              marginBottom: 'clamp(12px, 2vh, 16px)',
              fontSize: 'clamp(11px, 1.3vw, 13px)',
              textAlign: 'center',
              flexShrink: 0,
              backdropFilter: 'blur(10px)',
              position: 'relative',
              zIndex: 1
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1
          }}>
            {/* Username Field */}
            <div style={{ marginBottom: 'clamp(12px, 2vh, 16px)', textAlign: 'right' }}>
              <label 
                htmlFor="username"
                style={{
                  display: 'block',
                  color: '#C8A24E',
                  opacity: 0.5,
                  marginBottom: 'clamp(6px, 1vh, 8px)',
                  fontWeight: '600',
                  fontSize: 'clamp(10px, 1.1vw, 11px)',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px'
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
                  padding: 'clamp(12px, 1.8vh, 14px) clamp(14px, 2vw, 16px)',
                  background: 'rgba(200, 162, 78, 0.04)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(200, 162, 78, 0.15)',
                  borderRadius: '12px',
                  fontSize: 'clamp(13px, 1.6vw, 14px)',
                  textAlign: 'right',
                  fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                  color: '#F0FDF4',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#C8A24E'
                  e.target.style.boxShadow = '0 0 0 3px rgba(200,162,78,0.12)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(200, 162, 78, 0.15)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: 'clamp(12px, 2vh, 16px)', textAlign: 'right' }}>
              <label 
                htmlFor="password"
                style={{
                  display: 'block',
                  color: '#C8A24E',
                  opacity: 0.5,
                  marginBottom: 'clamp(6px, 1vh, 8px)',
                  fontWeight: '600',
                  fontSize: 'clamp(10px, 1.1vw, 11px)',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px'
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
                  padding: 'clamp(12px, 1.8vh, 14px) clamp(14px, 2vw, 16px)',
                  background: 'rgba(200, 162, 78, 0.04)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(200, 162, 78, 0.15)',
                  borderRadius: '12px',
                  fontSize: 'clamp(13px, 1.6vw, 14px)',
                  textAlign: 'right',
                  fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                  color: '#F0FDF4',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#C8A24E'
                  e.target.style.boxShadow = '0 0 0 3px rgba(200,162,78,0.12)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(200, 162, 78, 0.15)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Submit Button with Gold Gradient */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: 'clamp(12px, 1.8vh, 14px) clamp(30px, 5vw, 40px)',
                background: 'linear-gradient(135deg, #B8922E, #D4AF5E)',
                color: '#0A0F0A',
                border: 'none',
                borderRadius: '12px',
                fontSize: 'clamp(14px, 1.8vw, 15px)',
                fontWeight: '700',
                fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 'clamp(8px, 1.5vh, 12px)',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.25s',
                boxShadow: '0 4px 16px rgba(200,162,78,0.3)',
                position: 'relative',
                zIndex: 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(200,162,78,0.5)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(200,162,78,0.3)'
              }}
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}