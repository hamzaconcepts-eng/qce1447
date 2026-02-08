'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

interface User {
  id: string
  username: string
  role: string
}

interface Stats {
  totalCompetitors: number
  evaluatedCount: number
  waitingCount: number
  maleCount: number
  femaleCount: number
  levelDistribution: { [key: string]: number }
  cityDistribution: { [key: string]: number }
  evaluationsToday: number
  currentHour: number
}

interface ActiveEvaluation {
  level: string
  competitor_name: string | null
  started_at: string
}

export default function LiveStatsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalCompetitors: 0,
    evaluatedCount: 0,
    waitingCount: 0,
    maleCount: 0,
    femaleCount: 0,
    levelDistribution: {},
    cityDistribution: {},
    evaluationsToday: 0,
    currentHour: 0
  })
  const [activeEvaluations, setActiveEvaluations] = useState<{ [key: string]: ActiveEvaluation }>({})
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const router = useRouter()

  const levels = [
    'المستوى الأول: المرحلة الجامعية | الحج والمؤمنون',
    'المستوى الثاني: الصفوف 10-12 | الشعراء والنمل',
    'المستوى الثالث: الصفوف 7-9 | العنكبوت والروم',
    'المستوى الرابع: الصفوف 4-6 | جزء تبارك',
    'المستوى الخامس: الصفوف 1-3 | جزء عمَّ'
  ]

  const levelShortNames = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس']

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      router.push('/')
      return
    }
    const userData = JSON.parse(userStr)
    setUser(userData)
    fetchStats()
    fetchActiveEvaluations()

    const interval = setInterval(() => {
      fetchStats()
      fetchActiveEvaluations()
    }, 5000) // Update every 5 seconds for live effect

    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000)

    return () => {
      clearInterval(interval)
      clearInterval(clockInterval)
    }
  }, [router])

  const fetchActiveEvaluations = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('active_evaluations')
        .select('*')

      if (error) throw error

      const activeMap: { [key: string]: ActiveEvaluation } = {}
      data?.forEach(item => {
        activeMap[item.level] = item
      })
      setActiveEvaluations(activeMap)
    } catch (error) {
      console.error('Error fetching active evaluations:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const supabase = createClient()

      const { data: competitors, error: compError } = await supabase
        .from('competitors')
        .select('*')

      if (compError) throw compError

      const { data: evaluations, error: evalError } = await supabase
        .from('evaluations')
        .select('*')

      if (evalError) throw evalError

      const total = competitors?.length || 0
      const evaluated = evaluations?.length || 0
      const waiting = total - evaluated

      const maleCount = competitors?.filter(c => c.gender === 'male').length || 0
      const femaleCount = competitors?.filter(c => c.gender === 'female').length || 0

      const levelDist: { [key: string]: number } = {}
      levels.forEach(level => {
        levelDist[level] = competitors?.filter(c => c.level === level).length || 0
      })

      const cityDist: { [key: string]: number } = {}
      competitors?.forEach(c => {
        cityDist[c.city] = (cityDist[c.city] || 0) + 1
      })

      const sortedCities = Object.entries(cityDist)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      const topCities: { [key: string]: number } = {}
      sortedCities.forEach(([city, count]) => {
        topCities[city] = count
      })

      const today = new Date().toDateString()
      const evalsToday = evaluations?.filter(e => {
        const evalDate = new Date(e.created_at).toDateString()
        return evalDate === today
      }).length || 0

      setStats({
        totalCompetitors: total,
        evaluatedCount: evaluated,
        waitingCount: waiting,
        maleCount,
        femaleCount,
        levelDistribution: levelDist,
        cityDistribution: topCities,
        evaluationsToday: evalsToday,
        currentHour: new Date().getHours()
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching stats:', error)
      setLoading(false)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const getProgressPercentage = () => {
    if (stats.totalCompetitors === 0) return 0
    return Math.round((stats.evaluatedCount / stats.totalCompetitors) * 100)
  }

  const getMilestoneMessage = () => {
    const progress = getProgressPercentage()
    if (progress === 100) return '🎊 اكتمل التقييم! 🎊'
    if (progress >= 75) return '💪 الشوط الأخير!'
    if (progress >= 50) return '🌟 نصف الطريق!'
    return null
  }

  const getFilteredStats = () => {
    if (genderFilter === 'all') return stats

    // Calculate filtered counts based on gender
    const filteredTotal = genderFilter === 'male' ? stats.maleCount : stats.femaleCount

    // Calculate filtered evaluated count
    const ratio = genderFilter === 'male'
      ? stats.maleCount / stats.totalCompetitors
      : stats.femaleCount / stats.totalCompetitors

    const filteredEvaluated = Math.round(stats.evaluatedCount * ratio)
    const filteredWaiting = filteredTotal - filteredEvaluated

    const filteredLevelDist: { [key: string]: number } = {}
    levels.forEach(level => {
      const count = stats.levelDistribution[level] || 0
      filteredLevelDist[level] = Math.round(count * ratio)
    })

    const filteredCityDist: { [key: string]: number } = {}
    Object.entries(stats.cityDistribution).forEach(([city, count]) => {
      filteredCityDist[city] = Math.round(count * ratio)
    })

    return {
      ...stats,
      totalCompetitors: filteredTotal,
      evaluatedCount: filteredEvaluated,
      waitingCount: filteredWaiting,
      levelDistribution: filteredLevelDist,
      cityDistribution: filteredCityDist
    }
  }

  if (!user) return null

  const displayStats = getFilteredStats()
  const milestoneMsg = getMilestoneMessage()

  return (
    <>
      <style jsx global>{`
        @keyframes countUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
          50% { box-shadow: 0 12px 30px rgba(95, 179, 179, 0.2); }
        }

        @keyframes fillBar {
          0% { width: 0; }
          100% { width: var(--target-width); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes shimmer {
          0% { 
            background-position: -200% 0;
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
          100% { 
            background-position: 200% 0;
            opacity: 0.6;
          }
        }

        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          10%, 30% { transform: scale(1.1); }
          20%, 40% { transform: scale(1); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        body {
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        .screen-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
        }

        .dashboard-box {
          width: 1920px;
          height: 1080px;
          max-width: 100vw;
          max-height: 100vh;
          background: #ffffff;
          box-shadow: 0 25px 70px rgba(0,0,0,0.4);
          animation: fadeIn 0.5s ease-out;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .content-wrapper {
          width: 100%;
          height: 100%;
          padding: 25px 35px;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .stat-card {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-radius: 15px;
          padding: 18px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          transition: all 0.3s;
          animation: slideUp 0.6s ease-out, glow 3s ease-in-out infinite;
          text-align: center;
        }

        .stat-card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }

        .stat-number {
          font-size: 48px;
          font-weight: 800;
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: pulse 2s ease-in-out infinite;
          line-height: 1;
        }

        .stat-label {
          font-size: 15px;
          color: #666;
          font-weight: 600;
          margin-top: 8px;
        }

        .progress-circle {
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: conic-gradient(
            #5fb3b3 0deg,
            #5fb3b3 calc(var(--progress) * 3.6deg),
            #e0e0e0 calc(var(--progress) * 3.6deg),
            #e0e0e0 360deg
          );
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(95, 179, 179, 0.3);
          animation: rotate 20s linear infinite;
        }

        .progress-inner {
          width: 175px;
          height: 175px;
          border-radius: 50%;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: rotate 20s linear infinite reverse;
        }

        .progress-percentage {
          font-size: 52px;
          font-weight: 800;
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
          animation: heartbeat 2s ease-in-out infinite;
        }

        .live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #fee;
          padding: 7px 14px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 15px;
          color: #c00;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .live-dot {
          width: 9px;
          height: 9px;
          background: #f00;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }

        .bar-chart-container {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .bar-item {
          display: flex;
          align-items: center;
          gap: 9px;
          animation: slideUp 0.5s ease-out;
        }

        .bar-item:nth-child(1) .bar-fill { animation-delay: 0s; }
        .bar-item:nth-child(2) .bar-fill { animation-delay: 0.3s; }
        .bar-item:nth-child(3) .bar-fill { animation-delay: 0.6s; }
        .bar-item:nth-child(4) .bar-fill { animation-delay: 0.9s; }
        .bar-item:nth-child(5) .bar-fill { animation-delay: 1.2s; }

        .bar-label {
          min-width: 165px;
          font-size: 13px;
          font-weight: 600;
          color: #333;
          text-align: right;
        }

        .bar-wrapper {
          flex: 1;
          height: 32px;
          background: #f0f0f0;
          border-radius: 15px;
          overflow: hidden;
          animation: glow 2s ease-in-out infinite;
        }

        .bar-fill {
          height: 100%;
          background: linear-gradient(
            90deg,
            #5fb3b3 0%,
            #4aa3a3 25%,
            #5fb3b3 50%,
            #4aa3a3 75%,
            #5fb3b3 100%
          );
          background-size: 200% 100%;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 15px;
          font-weight: 700;
          animation: fillBar 2s cubic-bezier(0.4, 0, 0.2, 1), shimmer 4s ease-in-out infinite;
          animation-fill-mode: forwards;
        }

        .milestone-badge {
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          color: #333;
          padding: 10px 28px;
          border-radius: 50px;
          font-size: 20px;
          font-weight: 800;
          text-align: center;
          box-shadow: 0 10px 30px rgba(255, 215, 0, 0.4);
          animation: float 3s ease-in-out infinite, pulse 2s ease-in-out infinite;
        }

        .clock-display {
          font-size: 42px;
          font-weight: 700;
          color: #1a3a3a;
          font-family: 'Cairo', monospace;
          animation: pulse 2s ease-in-out infinite;
          min-width: 180px;
          text-align: right;
        }

        .fullscreen-btn {
          position: fixed;
          bottom: 25px;
          right: 25px;
          width: 55px;
          height: 55px;
          border-radius: 50%;
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          color: white;
          border: none;
          cursor: pointer;
          font-size: 22px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
          transition: all 0.3s;
          z-index: 1000;
          animation: float 3s ease-in-out infinite;
        }

        .fullscreen-btn:hover {
          transform: scale(1.15);
          box-shadow: 0 12px 30px rgba(0,0,0,0.4);
        }

        .back-btn {
          position: fixed;
          bottom: 25px;
          left: 25px;
          padding: 12px 25px;
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 700;
          font-family: 'Cairo', sans-serif;
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
          transition: all 0.3s;
          z-index: 1000;
          animation: float 3s ease-in-out infinite 0.5s;
        }

        .back-btn:hover {
          transform: translateY(-5px) scale(1.05);
          box-shadow: 0 12px 30px rgba(0,0,0,0.4);
        }

        .filter-button {
          padding: 9px 22px;
          border: 2px solid #e0e0e0;
          background: white;
          color: #666;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Cairo', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          animation: slideUp 0.5s ease-out;
        }

        .filter-button.active {
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          color: white;
          border-color: #5fb3b3;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .filter-button:hover {
          border-color: #5fb3b3;
          transform: translateY(-2px);
        }

        .logo-container {
          animation: float 4s ease-in-out infinite;
        }

        .section-box {
          animation: slideUp 0.6s ease-out, glow 3s ease-in-out infinite;
        }

        .header-center {
          flex: 1;
          text-align: center;
          min-width: 0;
        }

        .header-right {
          display: flex;
          flex-direction: column;
          gap: 7px;
          align-items: flex-end;
          min-width: 200px;
        }

        .evaluation-row {
          display: flex;
          align-items: center;
          padding: 12px 15px;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-radius: 12px;
          margin-bottom: 10px;
          border-right: 4px solid #5fb3b3;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          transition: all 0.3s;
        }

        .evaluation-row:hover {
          transform: translateX(-5px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.1);
        }

        .evaluation-row.active {
          background: linear-gradient(135deg, #e8f5f5 0%, #f0f8f8 100%);
          border-right: 4px solid #27ae60;
        }

        .level-badge {
          min-width: 100px;
          padding: 8px 12px;
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          color: white;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
        }

        .competitor-name {
          flex: 1;
          padding: 0 15px;
          font-size: 16px;
          font-weight: 600;
          color: #1a3a3a;
        }

        .competitor-name.empty {
          color: #999;
          font-style: italic;
          font-weight: 400;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #27ae60;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          background: #27ae60;
          border-radius: 50%;
          animation: blink 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="screen-container">
        <div className="dashboard-box">
          <div className="content-wrapper">

            {/* Header */}
            <div style={{ marginBottom: '18px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '13px' }}>
                <div className="logo-container" style={{ width: '65px', height: '65px' }}>
                  <Image
                    src="/images/logo.svg"
                    alt="Logo"
                    width={65}
                    height={65}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    priority
                  />
                </div>

                <div className="header-center">
                  <h1 style={{
                    color: '#1a3a3a',
                    fontSize: '32px',
                    fontWeight: '800',
                    marginBottom: '7px',
                    background: 'linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1.2
                  }}>
                    مسابقة مركز رياض العلم لحفظ القرآن الكريم
                  </h1>
                  <p style={{ color: '#666', fontSize: '16px', fontWeight: '600', marginBottom: '9px' }}>
                    إحصائيات حية • الدورة الخامسة - رمضان 1447هـ
                  </p>
                </div>

                <div className="header-right">
                  <div className="live-indicator">
                    <span className="live-dot"></span>
                    <span>مباشر</span>
                  </div>
                  <div className="clock-display">
                    {currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Gender Filter */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '13px' }}>
                <button
                  className={`filter-button ${genderFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setGenderFilter('all')}
                >
                  الكل
                </button>
                <button
                  className={`filter-button ${genderFilter === 'male' ? 'active' : ''}`}
                  onClick={() => setGenderFilter('male')}
                >
                  ذكور
                </button>
                <button
                  className={`filter-button ${genderFilter === 'female' ? 'active' : ''}`}
                  onClick={() => setGenderFilter('female')}
                >
                  إناث
                </button>
              </div>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#666', fontSize: '22px', flex: 1 }}>
                جاري التحميل...
              </div>
            )}

            {!loading && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '18px', minHeight: 0 }}>
                {/* Main Stats Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '13px',
                  flexShrink: 0
                }}>
                  <div className="stat-card">
                    <div className="stat-number">{displayStats.totalCompetitors}</div>
                    <div className="stat-label">إجمالي المتسابقين</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-number" style={{
                      background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                      {stats.evaluatedCount}
                    </div>
                    <div className="stat-label">تم التقييم</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-number" style={{
                      background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                      {stats.waitingCount}
                    </div>
                    <div className="stat-label">في الانتظار</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-number" style={{
                      background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                      {stats.evaluationsToday}
                    </div>
                    <div className="stat-label">التقييمات اليوم</div>
                  </div>
                </div>

                {/* Main Content Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 3fr',
                  gap: '18px',
                  flex: 1,
                  minHeight: 0
                }}>

                  {/* Left Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Progress Circle */}
                    <div className="section-box" style={{
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                      borderRadius: '15px',
                      padding: '18px',
                      textAlign: 'center',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <h2 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1a3a3a',
                        marginBottom: '15px'
                      }}>
                        ⚡ نسبة الإنجاز
                      </h2>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: milestoneMsg ? '15px' : '0' }}>
                        <div
                          className="progress-circle"
                          style={{ '--progress': getProgressPercentage() } as React.CSSProperties}
                        >
                          <div className="progress-inner">
                            <div className="progress-percentage">{getProgressPercentage()}%</div>
                            <div style={{ fontSize: '14px', color: '#666', fontWeight: '600' }}>مكتمل</div>
                          </div>
                        </div>
                      </div>
                      {milestoneMsg && (
                        <div className="milestone-badge">
                          {milestoneMsg}
                        </div>
                      )}
                    </div>

                    {/* Currently Being Evaluated */}
                    <div className="section-box" style={{
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                      borderRadius: '15px',
                      padding: '15px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#1a3a3a',
                        marginBottom: '12px',
                        textAlign: 'center'
                      }}>
                        🎯 جاري التقييم الآن
                      </h3>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '7px' }}>
                        {levels.map((level, index) => {
                          const activeEval = activeEvaluations[level]
                          const isActive = activeEval && activeEval.competitor_name

                          return (
                            <div
                              key={level}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '7px 10px',
                                background: isActive
                                  ? 'linear-gradient(135deg, #e8f5f5 0%, #f0f8f8 100%)'
                                  : 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                                borderRadius: '8px',
                                borderRight: isActive ? '3px solid #27ae60' : '3px solid #5fb3b3',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                transition: 'all 0.3s',
                                gap: '10px',
                                minHeight: '38px'
                              }}
                            >
                              <div style={{
                                minWidth: '115px',
                                maxWidth: '115px',
                                padding: '5px 8px',
                                background: 'linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%)',
                                color: 'white',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '700',
                                textAlign: 'center',
                                flexShrink: 0,
                                whiteSpace: 'nowrap'
                              }}>
                                المستوى {['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'][index]}
                              </div>
                              <div style={{
                                flex: 1,
                                fontSize: '14px',
                                fontWeight: '600',
                                color: isActive ? '#1a3a3a' : '#999',
                                fontStyle: isActive ? 'normal' : 'italic',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                minWidth: 0,
                                direction: 'rtl'
                              }}>
                                {isActive ? activeEval.competitor_name : 'في الانتظار...'}
                              </div>
                              {isActive && (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  color: '#27ae60',
                                  flexShrink: 0
                                }}>
                                  <span style={{
                                    width: '8px',
                                    height: '8px',
                                    background: '#27ae60',
                                    borderRadius: '50%',
                                    animation: 'blink 1.5s ease-in-out infinite'
                                  }}></span>
                                  <span>جاري</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Level Distribution */}
                    <div className="section-box" style={{
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                      borderRadius: '15px',
                      padding: '18px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                      flex: 1
                    }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1a3a3a',
                        marginBottom: '13px',
                        textAlign: 'center'
                      }}>
                        📊 التوزيع حسب المستوى
                      </h3>
                      <div className="bar-chart-container">
                        {levels.map((level, index) => {
                          const count = displayStats.levelDistribution[level] || 0
                          const maxCount = Math.max(...Object.values(displayStats.levelDistribution))
                          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0

                          return (
                            <div key={level} className="bar-item">
                              <div className="bar-label">
                                المستوى {levelShortNames[index]}
                              </div>
                              <div className="bar-wrapper">
                                <div
                                  className="bar-fill"
                                  style={{
                                    '--target-width': `${percentage}%`,
                                    width: `${percentage}%`
                                  } as React.CSSProperties}
                                >
                                  {count}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Top Cities */}
                    <div className="section-box" style={{
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                      borderRadius: '15px',
                      padding: '18px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                      flex: 1
                    }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1a3a3a',
                        marginBottom: '13px',
                        textAlign: 'center'
                      }}>
                        🌍 الولايات الأكثر مشاركة
                      </h3>
                      <div className="bar-chart-container">
                        {Object.entries(displayStats.cityDistribution).slice(0, 5).map(([city, count]) => {
                          const maxCount = Math.max(...Object.values(displayStats.cityDistribution))
                          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0

                          return (
                            <div key={city} className="bar-item">
                              <div className="bar-label" style={{ minWidth: '140px' }}>
                                {city}
                              </div>
                              <div className="bar-wrapper">
                                <div
                                  className="bar-fill"
                                  style={{
                                    '--target-width': `${percentage}%`,
                                    width: `${percentage}%`,
                                    background: 'linear-gradient(90deg, #3498db 0%, #2980b9 100%)'
                                  } as React.CSSProperties}
                                >
                                  {count}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <button onClick={() => router.push('/dashboard')} className="back-btn">
          ← القائمة الرئيسية
        </button>

        {/* Fullscreen Button */}
        <button onClick={toggleFullscreen} className="fullscreen-btn" title="وضع ملء الشاشة">
          {isFullscreen ? '✕' : '⛶'}
        </button>
      </div>
    </>
  )
}