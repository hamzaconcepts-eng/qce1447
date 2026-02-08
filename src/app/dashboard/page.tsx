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
        body {
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          min-height: 100vh;
        }
        
        .app-container {
          background: #ffffff;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          width: 100%;
          max-width: 1400px;
        }
        
        @media (max-width: 480px) {
          .app-container {
            padding: 25px 20px;
            border-radius: 15px;
          }
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
        
        <div className="app-container">
          
          {/* Logo */}
          <div style={{
            width: '100px',
            height: '100px',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
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
            marginBottom: '10px',
            fontSize: '26px',
            fontWeight: '700',
            lineHeight: '1.3',
            textAlign: 'center'
          }}>
            مسابقة مركز رياض العلم لحفظ القرآن الكريم
          </h1>

          {/* User Info Header */}
          <div style={{
            background: '#f0f9f9',
            padding: '15px',
            borderRadius: '10px',
            marginTop: '20px',
            marginBottom: '30px',
            border: '1px solid #c7e6e6',
            maxWidth: '500px',
            margin: '20px auto 30px'
          }}>
            <p style={{
              color: '#555555',
              fontSize: '14px',
              marginBottom: '5px',
              textAlign: 'center'
            }}>
              مرحباً،
            </p>
            <p style={{
              color: '#1a3a3a',
              fontSize: '18px',
              fontWeight: '700',
              textAlign: 'center'
            }}>
              {user.username}
            </p>
            <p style={{
              color: '#5fb3b3',
              fontSize: '14px',
              fontWeight: '600',
              marginTop: '5px',
              textAlign: 'center'
            }}>
              {getRoleInArabic(user.role)}
            </p>
          </div>

          {/* Main Buttons */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            
            {/* Register New Competitor - Admin Only */}
            <button
              onClick={() => canRegister && router.push('/dashboard/register')}
              disabled={!canRegister}
              style={{
                width: '100%',
                padding: '15px',
                background: canRegister 
                  ? 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)'
                  : '#e0e0e0',
                color: canRegister ? 'white' : '#999999',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: canRegister ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                opacity: canRegister ? 1 : 0.6
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
                padding: '15px',
                background: canView 
                  ? 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)'
                  : '#e0e0e0',
                color: canView ? 'white' : '#999999',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: canView ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                opacity: canView ? 1 : 0.6
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
                padding: '15px',
                background: canEvaluate 
                  ? 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)'
                  : '#e0e0e0',
                color: canEvaluate ? 'white' : '#999999',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: canEvaluate ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                opacity: canEvaluate ? 1 : 0.6
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
                padding: '15px',
                background: 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s'
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
                padding: '15px',
                background: 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              لوحة المعلومات المباشرة
            </button>

            {/* Back to Login - All Users */}
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '15px',
                background: '#ffffff',
                color: '#e74c3c',
                border: '2px solid #e74c3c',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginTop: '10px'
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