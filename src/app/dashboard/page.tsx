'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface User {
  id: string
  username: string
  role: 'admin' | 'evaluator' | 'viewer'
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
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

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      router.push('/')
      return
    }
    setUser(JSON.parse(userStr))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/')
  }

  const getRoleInArabic = (role: string) => {
    switch (role) {
      case 'admin': return 'المدير العام'
      case 'evaluator': return 'المقيّم'
      case 'viewer': return 'المشاهد'
      default: return role
    }
  }

  if (!user) {
    return null
  }

  const canRegister = user.role === 'admin'
  const canView = user.role === 'admin' || user.role === 'evaluator'
  const canEvaluate = user.role === 'admin' || user.role === 'evaluator'

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

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(34, 197, 94, 0.05);
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(200, 162, 78, 0.3);
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(200, 162, 78, 0.5);
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
          padding: 'clamp(24px, 3vh, 40px) clamp(24px, 3vw, 32px)',
          borderRadius: 'clamp(20px, 3vh, 32px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 80px rgba(34, 197, 94, 0.05)',
          width: '100%',
          maxWidth: 'clamp(380px, 90vw, 700px)',
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
            width: 'clamp(70px, 12vw, 92px)',
            height: 'clamp(70px, 12vw, 92px)',
            margin: '0 auto clamp(12px, 1.8vh, 18px)',
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
            marginBottom: 'clamp(15px, 2vh, 20px)',
            fontSize: 'clamp(16px, 2.4vw, 24px)',
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

          {/* User Info Card - Inner Glass */}
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(34, 197, 94, 0.18)',
            padding: 'clamp(12px, 2vh, 16px)',
            borderRadius: 'clamp(12px, 1.8vh, 18px)',
            marginBottom: 'clamp(18px, 2.5vh, 24px)',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
            transition: 'all 0.25s'
          }}>
            <p style={{
              color: 'rgba(240, 253, 244, 0.6)',
              fontSize: 'clamp(10px, 1.2vw, 12px)',
              marginBottom: 'clamp(4px, 0.6vh, 6px)',
              textAlign: 'center',
              fontWeight: '400'
            }}>
              مرحباً،
            </p>
            <p style={{
              fontSize: 'clamp(15px, 1.8vw, 18px)',
              fontWeight: '700',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #C8A24E, #E0C478)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {user.username}
            </p>
            <p style={{
              color: '#4ADE80',
              fontSize: 'clamp(11px, 1.3vw, 13px)',
              fontWeight: '600',
              marginTop: 'clamp(4px, 0.6vh, 6px)',
              textAlign: 'center'
            }}>
              {getRoleInArabic(user.role)}
            </p>
          </div>

          {/* Main Buttons - Scrollable */}
          <div style={{ 
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(10px, 1.4vh, 12px)',
            paddingRight: '5px',
            position: 'relative',
            zIndex: 1
          }}>
            
            {/* Register New Competitor - Admin Only */}
            <button
              onClick={() => canRegister && router.push('/dashboard/register')}
              disabled={!canRegister}
              style={{
                width: '100%',
                padding: 'clamp(12px, 1.8vh, 14px) clamp(24px, 4vw, 32px)',
                background: canRegister 
                  ? 'linear-gradient(135deg, #B8922E, #D4AF5E)'
                  : 'rgba(200, 162, 78, 0.1)',
                color: canRegister ? '#0A0F0A' : 'rgba(240, 253, 244, 0.3)',
                border: canRegister ? 'none' : '1px solid rgba(200, 162, 78, 0.2)',
                borderRadius: '999px',
                fontSize: 'clamp(13px, 1.5vw, 15px)',
                fontWeight: '700',
                fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                cursor: canRegister ? 'pointer' : 'not-allowed',
                transition: 'all 0.25s',
                opacity: canRegister ? 1 : 0.5,
                boxShadow: canRegister ? '0 4px 16px rgba(200,162,78,0.3)' : 'none',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (canRegister) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(200,162,78,0.5)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = canRegister ? '0 4px 16px rgba(200,162,78,0.3)' : 'none'
              }}
            >
              تسجيل متسابق جديد
            </button>

            {/* View Registered Competitors - Admin & Evaluator */}
            <button
              onClick={() => canView && router.push('/dashboard/competitors')}
              disabled={!canView}
              style={{
                width: '100%',
                padding: 'clamp(12px, 1.8vh, 14px) clamp(24px, 4vw, 32px)',
                background: canView 
                  ? 'linear-gradient(135deg, #166534, #22C55E)'
                  : 'rgba(200, 162, 78, 0.1)',
                color: canView ? '#FFFFFF' : 'rgba(240, 253, 244, 0.3)',
                border: canView ? 'none' : '1px solid rgba(200, 162, 78, 0.2)',
                borderRadius: '999px',
                fontSize: 'clamp(13px, 1.5vw, 15px)',
                fontWeight: '700',
                fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                cursor: canView ? 'pointer' : 'not-allowed',
                transition: 'all 0.25s',
                opacity: canView ? 1 : 0.5,
                boxShadow: canView ? '0 4px 16px rgba(34, 197, 94, 0.35)' : 'none',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (canView) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(34, 197, 94, 0.5)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = canView ? '0 4px 16px rgba(34, 197, 94, 0.35)' : 'none'
              }}
            >
              عرض المتسابقين المسجلين
            </button>

            {/* Evaluate - Admin & Evaluator */}
            <button
              onClick={() => canEvaluate && router.push('/dashboard/evaluate')}
              disabled={!canEvaluate}
              style={{
                width: '100%',
                padding: 'clamp(12px, 1.8vh, 14px) clamp(24px, 4vw, 32px)',
                background: canEvaluate 
                  ? 'linear-gradient(135deg, #166534, #22C55E)'
                  : 'rgba(200, 162, 78, 0.1)',
                color: canEvaluate ? '#FFFFFF' : 'rgba(240, 253, 244, 0.3)',
                border: canEvaluate ? 'none' : '1px solid rgba(200, 162, 78, 0.2)',
                borderRadius: '999px',
                fontSize: 'clamp(13px, 1.5vw, 15px)',
                fontWeight: '700',
                fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                cursor: canEvaluate ? 'pointer' : 'not-allowed',
                transition: 'all 0.25s',
                opacity: canEvaluate ? 1 : 0.5,
                boxShadow: canEvaluate ? '0 4px 16px rgba(34, 197, 94, 0.35)' : 'none',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (canEvaluate) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(34, 197, 94, 0.5)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = canEvaluate ? '0 4px 16px rgba(34, 197, 94, 0.35)' : 'none'
              }}
            >
              التقييم
            </button>

            {/* Results - All Users */}
            <button
              onClick={() => router.push('/dashboard/results')}
              style={{
                width: '100%',
                padding: 'clamp(12px, 1.8vh, 14px) clamp(24px, 4vw, 32px)',
                background: 'linear-gradient(135deg, #166534, #22C55E)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '999px',
                fontSize: 'clamp(13px, 1.5vw, 15px)',
                fontWeight: '700',
                fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.25s',
                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.35)',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(34, 197, 94, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(34, 197, 94, 0.35)'
              }}
            >
              النتائج
            </button>

            {/* Live Stats - All Users */}
            <button
              onClick={() => router.push('/dashboard/live')}
              style={{
                width: '100%',
                padding: 'clamp(12px, 1.8vh, 14px) clamp(24px, 4vw, 32px)',
                background: 'linear-gradient(135deg, #166534, #22C55E)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '999px',
                fontSize: 'clamp(13px, 1.5vw, 15px)',
                fontWeight: '700',
                fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.25s',
                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.35)',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(34, 197, 94, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(34, 197, 94, 0.35)'
              }}
            >
              لوحة المعلومات المباشرة
            </button>

            {/* Logout Button - Ghost Style */}
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: 'clamp(12px, 1.8vh, 14px) clamp(24px, 4vw, 32px)',
                background: 'transparent',
                color: '#D4AF5E',
                border: '1px solid rgba(200, 162, 78, 0.3)',
                borderRadius: '999px',
                fontSize: 'clamp(13px, 1.5vw, 15px)',
                fontWeight: '700',
                fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginTop: 'clamp(8px, 1.2vh, 12px)',
                flexShrink: 0,
                opacity: 0.7
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(200, 162, 78, 0.08)'
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.borderColor = 'rgba(200, 162, 78, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.opacity = '0.7'
                e.currentTarget.style.borderColor = 'rgba(200, 162, 78, 0.3)'
              }}
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    </>
  )
}