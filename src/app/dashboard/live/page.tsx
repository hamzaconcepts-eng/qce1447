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
    }, 5000)

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
    const displayStats = getFilteredStats()
    if (displayStats.totalCompetitors === 0) return 0
    return Math.round((displayStats.evaluatedCount / displayStats.totalCompetitors) * 100)
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

    const filteredTotal = genderFilter === 'male' ? stats.maleCount : stats.femaleCount
    const ratio = filteredTotal / stats.totalCompetitors
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
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0.4vh 1vh rgba(0,0,0,0.08); }
          50% { box-shadow: 0 0.6vh 1.5vh rgba(95, 179, 179, 0.2); }
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
          0% { background-position: -200% 0; opacity: 0.6; }
          50% { opacity: 1; }
          100% { background-position: 200% 0; opacity: 0.6; }
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

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          margin: 0;
          padding: 0;
          overflow: hidden;
          font-family: 'Cairo', sans-serif;
        }

        .screen-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          padding: 1vh 1vw;
        }

        .dashboard-box {
          width: 100%;
          height: 100%;
          background: #ffffff;
          box-shadow: 0 1.2vh 3.5vh rgba(0,0,0,0.4);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-radius: clamp(8px, 0.8vh, 15px);
        }

        .content-wrapper {
          width: 100%;
          height: 100%;
          padding: clamp(10px, 1.2vh, 25px) clamp(15px, 1.8vw, 35px);
          display: flex;
          flex-direction: column;
          gap: clamp(8px, 0.9vh, 18px);
        }

        .stat-card {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-radius: clamp(8px, 0.8vh, 15px);
          padding: clamp(8px, 0.9vh, 18px);
          box-shadow: 0 0.4vh 1vh rgba(0,0,0,0.08);
          transition: all 0.3s;
          animation: slideUp 0.6s ease-out, glow 3s ease-in-out infinite;
          text-align: center;
        }

        .stat-card:hover {
          transform: translateY(-0.3vh) scale(1.02);
          box-shadow: 0 0.8vh 1.8vh rgba(0,0,0,0.15);
        }

        .stat-number {
          font-size: clamp(24px, 2.5vw, 48px);
          font-weight: 800;
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: pulse 2s ease-in-out infinite;
          line-height: 1;
        }

        .stat-label {
          font-size: clamp(10px, 0.8vw, 15px);
          color: #666;
          font-weight: 600;
          margin-top: clamp(4px, 0.4vh, 8px);
        }

        .progress-circle {
          width: clamp(120px, 11vw, 220px);
          height: clamp(120px, 11vw, 220px);
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
          box-shadow: 0 0.5vh 1.5vh rgba(95, 179, 179, 0.3);
          animation: rotate 20s linear infinite;
        }

        .progress-inner {
          width: calc(100% - clamp(30px, 2.5vw, 45px));
          height: calc(100% - clamp(30px, 2.5vw, 45px));
          border-radius: 50%;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: rotate 20s linear infinite reverse;
        }

        .progress-percentage {
          font-size: clamp(26px, 2.7vw, 52px);
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
          gap: clamp(4px, 0.4vw, 7px);
          background: #fee;
          padding: clamp(4px, 0.4vh, 7px) clamp(7px, 0.7vw, 14px);
          border-radius: clamp(10px, 1vh, 20px);
          font-weight: 700;
          font-size: clamp(10px, 0.8vw, 15px);
          color: #c00;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .live-dot {
          width: clamp(5px, 0.5vw, 9px);
          height: clamp(5px, 0.5vw, 9px);
          background: #f00;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }

        .bar-chart-container {
          display: flex;
          flex-direction: column;
          gap: clamp(4px, 0.5vh, 9px);
        }

        .bar-item {
          display: flex;
          align-items: center;
          gap: clamp(4px, 0.5vw, 9px);
          animation: slideUp 0.5s ease-out;
        }

        .bar-label {
          min-width: clamp(80px, 8.6vw, 165px);
          font-size: clamp(9px, 0.7vw, 13px);
          font-weight: 600;
          color: #333;
          text-align: right;
        }

        .bar-wrapper {
          flex: 1;
          height: clamp(16px, 1.7vh, 32px);
          background: #f0f0f0;
          border-radius: clamp(8px, 0.8vh, 15px);
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #5fb3b3 0%, #4aa3a3 25%, #5fb3b3 50%, #4aa3a3 75%, #5fb3b3 100%);
          background-size: 200% 100%;
          border-radius: clamp(8px, 0.8vh, 15px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: clamp(10px, 0.8vw, 15px);
          font-weight: 700;
          animation: shimmer 4s ease-in-out infinite;
        }

        .milestone-badge {
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          color: #333;
          padding: clamp(5px, 0.5vh, 10px) clamp(14px, 1.5vw, 28px);
          border-radius: clamp(25px, 2.5vh, 50px);
          font-size: clamp(12px, 1vw, 20px);
          font-weight: 800;
          text-align: center;
          box-shadow: 0 0.5vh 1.5vh rgba(255, 215, 0, 0.4);
          animation: float 3s ease-in-out infinite, pulse 2s ease-in-out infinite;
        }

        .clock-display {
          font-size: clamp(20px, 2.2vw, 42px);
          font-weight: 700;
          color: #1a3a3a;
          font-family: 'Cairo', monospace;
          animation: pulse 2s ease-in-out infinite;
          text-align: right;
        }

        .fullscreen-btn {
          position: fixed;
          bottom: clamp(10px, 1.3vh, 25px);
          right: clamp(10px, 1.3vw, 25px);
          width: clamp(35px, 2.9vw, 55px);
          height: clamp(35px, 2.9vw, 55px);
          border-radius: 50%;
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          color: white;
          border: none;
          cursor: pointer;
          font-size: clamp(14px, 1.1vw, 22px);
          box-shadow: 0 0.4vh 1vh rgba(0,0,0,0.3);
          transition: all 0.3s;
          z-index: 1000;
          animation: float 3s ease-in-out infinite;
        }

        .fullscreen-btn:hover {
          transform: scale(1.15);
          box-shadow: 0 0.6vh 1.5vh rgba(0,0,0,0.4);
        }

        .back-btn {
          position: fixed;
          bottom: clamp(10px, 1.3vh, 25px);
          left: clamp(10px, 1.3vw, 25px);
          padding: clamp(6px, 0.6vh, 12px) clamp(12px, 1.3vw, 25px);
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          color: white;
          border: none;
          border-radius: clamp(5px, 0.5vh, 10px);
          cursor: pointer;
          font-size: clamp(11px, 0.8vw, 16px);
          font-weight: 700;
          font-family: 'Cairo', sans-serif;
          box-shadow: 0 0.4vh 1vh rgba(0,0,0,0.3);
          transition: all 0.3s;
          z-index: 1000;
          animation: float 3s ease-in-out infinite 0.5s;
        }

        .back-btn:hover {
          transform: translateY(-0.3vh) scale(1.05);
          box-shadow: 0 0.6vh 1.5vh rgba(0,0,0,0.4);
        }

        .filter-button {
          padding: clamp(5px, 0.5vh, 9px) clamp(11px, 1.1vw, 22px);
          border: 2px solid #e0e0e0;
          background: white;
          color: #666;
          border-radius: clamp(5px, 0.5vh, 10px);
          font-size: clamp(10px, 0.8vw, 15px);
          font-weight: 600;
          font-family: 'Cairo', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-button.active {
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          color: white;
          border-color: #5fb3b3;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .filter-button:hover {
          border-color: #5fb3b3;
          transform: translateY(-0.1vh);
        }

        .logo-container {
          animation: float 4s ease-in-out infinite;
        }

        .section-box {
          animation: slideUp 0.6s ease-out, glow 3s ease-in-out infinite;
        }

        /* Mobile/Phone specific */
        @media (max-width: 600px) {
          .screen-container {
            padding: 0.5vh 0.5vw;
          }
          
          .content-wrapper {
            gap: clamp(6px, 0.7vh, 12px);
          }

          .main-grid {
            grid-template-columns: 1fr !important;
          }

          .level-badge-text {
            font-size: clamp(8px, 0.6vw, 11px) !important;
          }
        }

        /* Tablet specific */
        @media (min-width: 601px) and (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        /* Ensure no scrolling */
        html, body {
          overflow: hidden;
          height: 100vh;
          width: 100vw;
        }
      `}</style>

      <div className="screen-container">
        <div className="dashboard-box">
          <div className="content-wrapper">

            {/* Header */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: 'clamp(6px, 0.7vh, 13px)',
                gap: 'clamp(8px, 1vw, 20px)'
              }}>
                <div className="logo-container" style={{ 
                  width: 'clamp(35px, 3.4vw, 65px)', 
                  height: 'clamp(35px, 3.4vw, 65px)',
                  flexShrink: 0
                }}>
                  <Image
                    src="/images/logo.svg"
                    alt="Logo"
                    width={65}
                    height={65}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    priority
                  />
                </div>

                <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                  <h1 style={{
                    color: '#1a3a3a',
                    fontSize: 'clamp(14px, 1.7vw, 32px)',
                    fontWeight: '800',
                    marginBottom: 'clamp(3px, 0.4vh, 7px)',
                    background: 'linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1.2
                  }}>
                    مسابقة مركز رياض العلم لحفظ القرآن الكريم
                  </h1>
                  <p style={{ 
                    color: '#666', 
                    fontSize: 'clamp(9px, 0.8vw, 16px)', 
                    fontWeight: '600', 
                    marginBottom: 'clamp(5px, 0.5vh, 9px)' 
                  }}>
                    إحصائيات حية • الدورة الخامسة - رمضان 1447هـ
                  </p>
                </div>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 'clamp(3px, 0.4vh, 7px)', 
                  alignItems: 'flex-end',
                  flexShrink: 0
                }}>
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
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(6px, 0.7vw, 13px)' }}>
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
              <div style={{ 
                textAlign: 'center', 
                padding: 'clamp(30px, 3vh, 60px)', 
                color: '#666', 
                fontSize: 'clamp(14px, 1.1vw, 22px)', 
                flex: 1 
              }}>
                جاري التحميل...
              </div>
            )}

            {!loading && (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 'clamp(8px, 0.9vh, 18px)', 
                minHeight: 0 
              }}>
                {/* Main Stats Cards */}
                <div className="stats-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 'clamp(6px, 0.7vw, 13px)',
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
                      {displayStats.evaluatedCount}
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
                      {displayStats.waitingCount}
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
                <div className="main-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 3fr',
                  gap: 'clamp(8px, 0.9vw, 18px)',
                  flex: 1,
                  minHeight: 0
                }}>

                  {/* Left Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 0.9vh, 18px)' }}>
                    {/* Progress Circle */}
                    <div className="section-box" style={{
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                      borderRadius: 'clamp(8px, 0.8vh, 15px)',
                      padding: 'clamp(9px, 0.9vh, 18px)',
                      textAlign: 'center',
                      boxShadow: '0 0.4vh 1vh rgba(0,0,0,0.08)',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <h2 style={{
                        fontSize: 'clamp(12px, 0.9vw, 18px)',
                        fontWeight: '700',
                        color: '#1a3a3a',
                        marginBottom: 'clamp(8px, 0.8vh, 15px)'
                      }}>
                        ⚡ نسبة الإنجاز
                      </h2>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        marginBottom: milestoneMsg ? 'clamp(8px, 0.8vh, 15px)' : '0' 
                      }}>
                        <div
                          className="progress-circle"
                          style={{ '--progress': getProgressPercentage() } as React.CSSProperties}
                        >
                          <div className="progress-inner">
                            <div className="progress-percentage">{getProgressPercentage()}%</div>
                            <div style={{ 
                              fontSize: 'clamp(9px, 0.7vw, 14px)', 
                              color: '#666', 
                              fontWeight: '600' 
                            }}>مكتمل</div>
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
                      borderRadius: 'clamp(8px, 0.8vh, 15px)',
                      padding: 'clamp(8px, 0.8vh, 15px)',
                      boxShadow: '0 0.4vh 1vh rgba(0,0,0,0.08)',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <h3 style={{
                        fontSize: 'clamp(11px, 0.8vw, 16px)',
                        fontWeight: '700',
                        color: '#1a3a3a',
                        marginBottom: 'clamp(6px, 0.6vh, 12px)',
                        textAlign: 'center'
                      }}>
                        🎯 جاري التقييم الآن
                      </h3>
                      <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center', 
                        gap: 'clamp(3px, 0.4vh, 7px)' 
                      }}>
                        {levels.map((level, index) => {
                          const activeEval = activeEvaluations[level]
                          const isActive = activeEval && activeEval.competitor_name

                          return (
                            <div
                              key={level}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: 'clamp(4px, 0.4vh, 7px) clamp(5px, 0.5vw, 10px)',
                                background: isActive
                                  ? 'linear-gradient(135deg, #e8f5f5 0%, #f0f8f8 100%)'
                                  : 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                                borderRadius: 'clamp(4px, 0.4vh, 8px)',
                                borderRight: isActive ? '3px solid #27ae60' : '3px solid #5fb3b3',
                                boxShadow: '0 0.1vh 0.4vh rgba(0,0,0,0.04)',
                                transition: 'all 0.3s',
                                gap: 'clamp(5px, 0.5vw, 10px)',
                                minHeight: 'clamp(20px, 2vh, 38px)'
                              }}
                            >
                              <div className="level-badge-text" style={{
                                minWidth: 'clamp(60px, 6vw, 115px)',
                                maxWidth: 'clamp(60px, 6vw, 115px)',
                                padding: 'clamp(3px, 0.3vh, 5px) clamp(4px, 0.4vw, 8px)',
                                background: 'linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%)',
                                color: 'white',
                                borderRadius: 'clamp(3px, 0.3vh, 6px)',
                                fontSize: 'clamp(8px, 0.6vw, 11px)',
                                fontWeight: '700',
                                textAlign: 'center',
                                flexShrink: 0,
                                whiteSpace: 'nowrap'
                              }}>
                                المستوى {['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'][index]}
                              </div>
                              <div style={{
                                flex: 1,
                                fontSize: 'clamp(9px, 0.7vw, 14px)',
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
                                  gap: 'clamp(2px, 0.2vw, 4px)',
                                  fontSize: 'clamp(7px, 0.5vw, 10px)',
                                  fontWeight: '600',
                                  color: '#27ae60',
                                  flexShrink: 0
                                }}>
                                  <span style={{
                                    width: 'clamp(4px, 0.4vw, 8px)',
                                    height: 'clamp(4px, 0.4vw, 8px)',
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 0.9vh, 18px)' }}>
                    {/* Level Distribution */}
                    <div className="section-box" style={{
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                      borderRadius: 'clamp(8px, 0.8vh, 15px)',
                      padding: 'clamp(9px, 0.9vh, 18px)',
                      boxShadow: '0 0.4vh 1vh rgba(0,0,0,0.08)',
                      flex: 1
                    }}>
                      <h3 style={{
                        fontSize: 'clamp(12px, 0.9vw, 18px)',
                        fontWeight: '700',
                        color: '#1a3a3a',
                        marginBottom: 'clamp(7px, 0.7vh, 13px)',
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
                                    width: `${percentage}%`
                                  }}
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
                      borderRadius: 'clamp(8px, 0.8vh, 15px)',
                      padding: 'clamp(9px, 0.9vh, 18px)',
                      boxShadow: '0 0.4vh 1vh rgba(0,0,0,0.08)',
                      flex: 1
                    }}>
                      <h3 style={{
                        fontSize: 'clamp(12px, 0.9vw, 18px)',
                        fontWeight: '700',
                        color: '#1a3a3a',
                        marginBottom: 'clamp(7px, 0.7vh, 13px)',
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
                              <div className="bar-label" style={{ minWidth: 'clamp(70px, 7.3vw, 140px)' }}>
                                {city}
                              </div>
                              <div className="bar-wrapper">
                                <div
                                  className="bar-fill"
                                  style={{
                                    width: `${percentage}%`,
                                    background: 'linear-gradient(90deg, #3498db 0%, #2980b9 100%)'
                                  }}
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