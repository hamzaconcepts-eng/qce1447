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
          padding: 'clamp(20px, 3vh, 40px) clamp(20px, 3vw, 40px)',
          borderRadius: 'clamp(10px, 1.5vh, 20px)',
          boxShadow: '0 1vh 3vh rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: 'clamp(350px, 90vw, 700px)',
          maxHeight: '95vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* Logo */}
          <div style={{
            width: 'clamp(60px, 10vw, 100px)',
            height: 'clamp(60px, 10vw, 100px)',
            margin: '0 auto clamp(10px, 1.5vh, 20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Image
              src="/images/logo.svg"
              alt="شعار مركز رياض العلم"
              width={100}
              height={100}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              priority
            />
          </div>

          {/* Title */}
          <h1 style={{
            color: '#333333',
            marginBottom: 'clamp(5px, 1vh, 10px)',
            fontSize: 'clamp(14px, 2.2vw, 26px)',
            fontWeight: '700',
            lineHeight: '1.3',
            textAlign: 'center',
            flexShrink: 0
          }}>
            مسابقة مركز رياض العلم لحفظ القرآن الكريم
          </h1>

          {/* User Info Header */}
          <div style={{
            background: '#f0f9f9',
            padding: 'clamp(10px, 1.5vh, 15px)',
            borderRadius: 'clamp(5px, 1vh, 10px)',
            border: '1px solid #c7e6e6',
            marginBottom: 'clamp(15px, 2vh, 25px)',
            flexShrink: 0
          }}>
            <p style={{
              color: '#555555',
              fontSize: 'clamp(10px, 1.2vw, 14px)',
              marginBottom: 'clamp(3px, 0.5vh, 5px)',
              textAlign: 'center'
            }}>
              مرحباً،
            </p>
            <p style={{
              color: '#1a3a3a',
              fontSize: 'clamp(14px, 1.6vw, 18px)',
              fontWeight: '700',
              textAlign: 'center'
            }}>
              {user.username}
            </p>
            <p style={{
              color: '#5fb3b3',
              fontSize: 'clamp(11px, 1.2vw, 14px)',
              fontWeight: '600',
              marginTop: 'clamp(3px, 0.5vh, 5px)',
              textAlign: 'center'
            }}>
              {getRoleInArabic(user.role)}
            </p>
          </div>

          {/* Main Buttons - Scrollable if needed */}
          <div style={{ 
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(8px, 1vh, 12px)',
            paddingRight: '5px'
          }}>
            
            {/* Register New Competitor - Admin Only */}
            <button
              onClick={() => canRegister && router.push('/dashboard/register')}
              disabled={!canRegister}
              style={{
                width: '100%',
                padding: 'clamp(10px, 1.5vh, 15px)',
                background: canRegister 
                  ? 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)'
                  : '#e0e0e0',
                color: canRegister ? 'white' : '#999999',
                border: 'none',
                borderRadius: 'clamp(5px, 1vh, 10px)',
                fontSize: 'clamp(12px, 1.4vw, 16px)',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: canRegister ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                opacity: canRegister ? 1 : 0.6,
                flexShrink: 0
              }}
              onMouseEnter={(e) => canRegister && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              تسجيل متسابق جديد
            </button>

            {/* View Registered Competitors - Admin & Evaluator */}
            <button
              onClick={() => canView && router.push('/dashboard/competitors')}
              disabled={!canView}
              style={{
                width: '100%',
                padding: 'clamp(10px, 1.5vh, 15px)',
                background: canView 
                  ? 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)'
                  : '#e0e0e0',
                color: canView ? 'white' : '#999999',
                border: 'none',
                borderRadius: 'clamp(5px, 1vh, 10px)',
                fontSize: 'clamp(12px, 1.4vw, 16px)',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: canView ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                opacity: canView ? 1 : 0.6,
                flexShrink: 0
              }}
              onMouseEnter={(e) => canView && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              عرض المتسابقين المسجلين
            </button>

            {/* Evaluate - Admin & Evaluator */}
            <button
              onClick={() => canEvaluate && router.push('/dashboard/evaluate')}
              disabled={!canEvaluate}
              style={{
                width: '100%',
                padding: 'clamp(10px, 1.5vh, 15px)',
                background: canEvaluate 
                  ? 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)'
                  : '#e0e0e0',
                color: canEvaluate ? 'white' : '#999999',
                border: 'none',
                borderRadius: 'clamp(5px, 1vh, 10px)',
                fontSize: 'clamp(12px, 1.4vw, 16px)',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: canEvaluate ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                opacity: canEvaluate ? 1 : 0.6,
                flexShrink: 0
              }}
              onMouseEnter={(e) => canEvaluate && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              التقييم
            </button>

            {/* Results - All Users */}
            <button
              onClick={() => router.push('/dashboard/results')}
              style={{
                width: '100%',
                padding: 'clamp(10px, 1.5vh, 15px)',
                background: 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'clamp(5px, 1vh, 10px)',
                fontSize: 'clamp(12px, 1.4vw, 16px)',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              النتائج
            </button>

            {/* Live Stats - All Users */}
            <button
              onClick={() => router.push('/dashboard/live')}
              style={{
                width: '100%',
                padding: 'clamp(10px, 1.5vh, 15px)',
                background: 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'clamp(5px, 1vh, 10px)',
                fontSize: 'clamp(12px, 1.4vw, 16px)',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              لوحة المعلومات المباشرة
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: 'clamp(10px, 1.5vh, 15px)',
                background: '#ffffff',
                color: '#e74c3c',
                border: '2px solid #e74c3c',
                borderRadius: 'clamp(5px, 1vh, 10px)',
                fontSize: 'clamp(12px, 1.4vw, 16px)',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginTop: 'clamp(5px, 1vh, 10px)',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e74c3c'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff'
                e.currentTarget.style.color = '#e74c3c'
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