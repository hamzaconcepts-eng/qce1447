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

interface ImportError {
  row: number
  name: string
  reason: string
}

export default function RegisterPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Tab state
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual')

  // Form states
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState('')
  const [level, setLevel] = useState('')
  const [city, setCity] = useState('')
  const [mobile, setMobile] = useState('')

  // CSV import states
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)
  const [importStats, setImportStats] = useState({ success: 0, skipped: 0, errors: 0 })
  const [importErrors, setImportErrors] = useState<ImportError[]>([])

  const levels = [
    'المستوى الأول: المرحلة الجامعية | الحج والمؤمنون',
    'المستوى الثاني: الصفوف 10-12 | الشعراء والنمل',
    'المستوى الثالث: الصفوف 7-9 | العنكبوت والروم',
    'المستوى الرابع: الصفوف 4-6 | جزء تبارك',
    'المستوى الخامس: الصفوف 1-3 | جزء عمَّ'
  ]

  // Helper function to normalize and validate level
  const normalizeLevel = (inputLevel: string): string => {
    const input = inputLevel.trim()
    
    // Try exact match first
    if (levels.includes(input)) {
      return input
    }
    
    // Normalize "جزء عم" to "جزء عمَّ"
    const withTashkeel = input.replace('جزء عم', 'جزء عمَّ')
    if (levels.includes(withTashkeel)) {
      return withTashkeel
    }
    
    // Try to match by key components (level number and surah)
    for (const validLevel of levels) {
      // Extract the main parts
      const validParts = validLevel.split('|').map(p => p.trim())
      const inputParts = input.split('|').map(p => p.trim())
      
      if (inputParts.length !== 2 || validParts.length !== 2) continue
      
      // Check if level prefix matches (المستوى الأول, الثاني, etc.)
      const validPrefix = validParts[0].split(':')[0].trim()
      const inputPrefix = inputParts[0].split(':')[0].trim()
      
      // Check if surah part matches (with tashkeel normalization)
      const validSurah = validParts[1].replace('جزء عم', 'جزء عمَّ')
      const inputSurah = inputParts[1].replace('جزء عم', 'جزء عمَّ')
      
      if (validPrefix === inputPrefix && validSurah === inputSurah) {
        return validLevel
      }
    }
    
    // DEFAULT: If no match found, assign to Level 5 (جزء عمَّ)
    return 'المستوى الخامس: الصفوف 1-3 | جزء عمَّ'
  }

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      router.push('/')
      return
    }
    const userData = JSON.parse(userStr)
    if (userData.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    setUser(userData)
  }, [router])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName || !gender || !level || !city || !mobile) {
      alert('يرجى ملء جميع الحقول')
      return
    }

    // Validate phone number (8-15 digits)
    if (!/^\d{8,15}$/.test(mobile)) {
      alert('رقم الهاتف يجب أن يحتوي على 8-15 رقماً فقط')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Check for exact duplicate (name, gender, level, city - EXCLUDING mobile)
      const { data: existingCompetitor } = await supabase
        .from('competitors')
        .select('*')
        .eq('full_name', fullName)
        .eq('gender', gender)
        .eq('level', level)
        .eq('city', city)
        .single()

      if (existingCompetitor) {
        alert('هذا المتسابق مسجل مسبقاً بنفس البيانات')
        setLoading(false)
        return
      }

      // Insert new competitor
      const { error } = await supabase.from('competitors').insert([
        {
          full_name: fullName,
          gender,
          level,
          city,
          mobile,
          status: 'not_evaluated'
        }
      ])

      if (error) throw error

      alert('تم التسجيل بنجاح')
      
      // Reset form
      setFullName('')
      setGender('')
      setLevel('')
      setCity('')
      setMobile('')
      
      setLoading(false)
    } catch (error) {
      console.error('Error registering competitor:', error)
      alert('حدث خطأ أثناء التسجيل')
      setLoading(false)
    }
  }

  const handleCSVImport = async () => {
    if (!csvFile) {
      alert('يرجى اختيار ملف CSV')
      return
    }

    setImporting(true)
    setImportSuccess(false)
    setImportErrors([])
    setImportStats({ success: 0, skipped: 0, errors: 0 })

    try {
      const text = await csvFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        alert('الملف فارغ أو غير صالح')
        setImporting(false)
        return
      }

      const supabase = createClient()
      
      let successCount = 0
      let skippedCount = 0
      let errorCount = 0
      const errors: ImportError[] = []
      
      // Track seen combinations in this file to avoid duplicates
      // Using name + gender + level + city (EXCLUDING mobile)
      const seenInFile = new Set<string>()

      // Skip header row, start from line 2
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const cols = line.split(',')
        
        if (cols.length < 5) {
          errorCount++
          errors.push({
            row: i + 1,
            name: cols[0] || 'غير محدد',
            reason: 'بيانات ناقصة - يجب أن يحتوي السطر على 5 أعمدة'
          })
          continue
        }

        const fullName = cols[0].trim()
        let gender = cols[1].trim()
        const levelInput = cols[2].trim()
        const city = cols[3].trim()
        const mobile = cols[4].trim()

        // Normalize gender
        if (gender === 'ذكر' || gender.toLowerCase() === 'male' || gender.toLowerCase() === 'm') {
          gender = 'male'
        } else if (gender === 'أنثى' || gender === 'انثى' || gender.toLowerCase() === 'female' || gender.toLowerCase() === 'f') {
          gender = 'female'
        } else {
          errorCount++
          errors.push({
            row: i + 1,
            name: fullName,
            reason: `جنس غير صحيح: "${gender}" - يجب أن يكون (ذكر/أنثى)`
          })
          continue
        }

        // Normalize and validate level
        const level = normalizeLevel(levelInput)

        // Validate phone number
        if (!/^\d{8,15}$/.test(mobile)) {
          errorCount++
          errors.push({
            row: i + 1,
            name: fullName,
            reason: `رقم هاتف غير صحيح: "${mobile}" - يجب أن يحتوي على 8-15 رقماً`
          })
          continue
        }

        // Check for duplicates in the same file (EXCLUDING mobile)
        const recordKey = `${fullName}|${gender}|${level}|${city}`
        if (seenInFile.has(recordKey)) {
          skippedCount++
          continue
        }
        seenInFile.add(recordKey)

        // Check for duplicates in database (EXCLUDING mobile)
        const { data: existing } = await supabase
          .from('competitors')
          .select('*')
          .eq('full_name', fullName)
          .eq('gender', gender)
          .eq('level', level)
          .eq('city', city)
          .single()

        if (existing) {
          skippedCount++
          continue
        }

        // Insert new competitor
        const { error } = await supabase.from('competitors').insert([
          {
            full_name: fullName,
            gender,
            level,
            city,
            mobile,
            status: 'not_evaluated'
          }
        ])

        if (error) {
          errorCount++
          errors.push({
            row: i + 1,
            name: fullName,
            reason: `خطأ في قاعدة البيانات: ${error.message}`
          })
        } else {
          successCount++
        }
      }

      setImportStats({ success: successCount, skipped: skippedCount, errors: errorCount })
      setImportErrors(errors)
      setImportSuccess(true)
      setImporting(false)
      
    } catch (error) {
      console.error('Import error:', error)
      alert('حدث خطأ أثناء استيراد البيانات')
      setImporting(false)
    }
  }

  if (!user) {
    return null
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

        /* Spinner */
        .spinner {
          width: clamp(14px, 2vw, 18px);
          height: clamp(14px, 2vw, 18px);
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Error list styling */
        .error-list {
          margin-top: clamp(10px, 1.5vh, 15px);
          padding: clamp(10px, 1.5vh, 15px);
          background: rgba(200, 162, 78, 0.08);
          border-radius: clamp(6px, 1vh, 10px);
          border: 1px solid rgba(200, 162, 78, 0.2);
        }

        .error-item {
          padding: clamp(6px, 1vh, 8px);
          margin-bottom: clamp(6px, 1vh, 8px);
          background: rgba(220, 38, 38, 0.1);
          border-radius: clamp(4px, 0.6vh, 6px);
          font-size: clamp(10px, 1.1vw, 12px);
          color: rgba(240, 253, 244, 0.8);
          text-align: right;
          line-height: 1.5;
        }

        .error-item:last-child {
          margin-bottom: 0;
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
          padding: 'clamp(14px, 2vh, 22px) clamp(16px, 2.2vw, 24px)',
          borderRadius: 'clamp(20px, 3vh, 32px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 80px rgba(34, 197, 94, 0.05)',
          width: '100%',
          maxWidth: 'clamp(380px, 92vw, 550px)',
          height: 'auto',
          maxHeight: '92vh',
          overflow: 'visible',
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
            width: 'clamp(45px, 7vw, 60px)',
            height: 'clamp(45px, 7vw, 60px)',
            margin: '0 auto clamp(8px, 1.2vh, 12px)',
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
              width={60}
              height={60}
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
            marginBottom: 'clamp(8px, 1.2vh, 12px)',
            fontSize: 'clamp(14px, 1.9vw, 18px)',
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
            تسجيل متسابق جديد
          </h1>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: 'clamp(8px, 1.2vw, 12px)',
            marginBottom: 'clamp(10px, 1.5vh, 14px)',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
            padding: '0 4px'
          }}>
            <button
              onClick={() => setActiveTab('manual')}
              style={{
                flex: 1,
                padding: 'clamp(8px, 1.2vh, 10px)',
                background: activeTab === 'manual' 
                  ? 'linear-gradient(135deg, #B8922E, #D4AF5E)'
                  : 'transparent',
                color: activeTab === 'manual' ? '#0A0F0A' : '#D4AF5E',
                border: activeTab === 'manual' ? 'none' : '1px solid rgba(200, 162, 78, 0.3)',
                borderRadius: 'clamp(8px, 1.2vh, 12px)',
                fontSize: 'clamp(11px, 1.3vw, 13px)',
                fontWeight: '700',
                fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.3s',
                opacity: activeTab === 'manual' ? 1 : 0.7,
                boxShadow: activeTab === 'manual' ? '0 4px 16px rgba(200,162,78,0.4)' : 'none'
              }}
            >
              تسجيل يدوي
            </button>
            <button
              onClick={() => setActiveTab('import')}
              style={{
                flex: 1,
                padding: 'clamp(8px, 1.2vh, 10px)',
                background: activeTab === 'import' 
                  ? 'linear-gradient(135deg, #B8922E, #D4AF5E)'
                  : 'transparent',
                color: activeTab === 'import' ? '#0A0F0A' : '#D4AF5E',
                border: activeTab === 'import' ? 'none' : '1px solid rgba(200, 162, 78, 0.3)',
                borderRadius: 'clamp(8px, 1.2vh, 12px)',
                fontSize: 'clamp(11px, 1.3vw, 13px)',
                fontWeight: '700',
                fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.3s',
                opacity: activeTab === 'import' ? 1 : 0.7,
                boxShadow: activeTab === 'import' ? '0 4px 16px rgba(200,162,78,0.4)' : 'none'
              }}
            >
              استيراد CSV
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: 'clamp(4px, 0.6vw, 8px)',
            marginBottom: 'clamp(8px, 1.2vh, 10px)',
            position: 'relative',
            zIndex: 1
          }}>
            {/* Manual Registration Tab */}
            {activeTab === 'manual' && (
              <div className="tab-content">
                <form onSubmit={handleSubmit}>
                  {/* Full Name */}
                  <div style={{ marginBottom: 'clamp(8px, 1.2vh, 10px)' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: 'clamp(3px, 0.5vh, 4px)',
                      fontSize: 'clamp(9px, 1vw, 11px)',
                      fontWeight: '600',
                      color: '#C8A24E',
                      opacity: 0.7,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      الاسم الكامل
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: 'clamp(9px, 1.3vh, 11px) clamp(12px, 1.8vw, 14px)',
                        background: '#FFFFFF',
                        border: '1px solid rgba(200, 162, 78, 0.3)',
                        borderRadius: 'clamp(8px, 1.2vh, 12px)',
                        fontSize: 'clamp(12px, 1.4vw, 14px)',
                        textAlign: 'right',
                        fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                        color: '#0A0F0A',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      placeholder="اسم المتسابق الكامل"
                      onFocus={(e) => {
                        e.target.style.borderColor = '#C8A24E'
                        e.target.style.boxShadow = '0 0 0 3px rgba(200,162,78,0.12)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(200, 162, 78, 0.3)'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  {/* Gender */}
                  <div style={{ marginBottom: 'clamp(8px, 1.2vh, 10px)', textAlign: 'right' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: 'clamp(4px, 0.6vh, 6px)',
                      fontSize: 'clamp(9px, 1vw, 11px)',
                      fontWeight: '600',
                      color: '#C8A24E',
                      opacity: 0.7,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      الجنس
                    </label>
                    <div style={{ 
                      display: 'inline-flex', 
                      gap: 'clamp(14px, 2vw, 20px)',
                      direction: 'rtl'
                    }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontSize: 'clamp(12px, 1.4vw, 14px)',
                        gap: 'clamp(6px, 0.8vw, 8px)',
                        color: '#F0FDF4'
                      }}>
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={gender === 'male'}
                          onChange={(e) => setGender(e.target.value)}
                          style={{
                            width: 'clamp(16px, 2vw, 18px)',
                            height: 'clamp(16px, 2vw, 18px)',
                            cursor: 'pointer',
                            accentColor: '#C8A24E'
                          }}
                        />
                        ذكر
                      </label>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontSize: 'clamp(12px, 1.4vw, 14px)',
                        gap: 'clamp(6px, 0.8vw, 8px)',
                        color: '#F0FDF4'
                      }}>
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={gender === 'female'}
                          onChange={(e) => setGender(e.target.value)}
                          style={{
                            width: 'clamp(16px, 2vw, 18px)',
                            height: 'clamp(16px, 2vw, 18px)',
                            cursor: 'pointer',
                            accentColor: '#C8A24E'
                          }}
                        />
                        أنثى
                      </label>
                    </div>
                  </div>

                  {/* Level */}
                  <div style={{ marginBottom: 'clamp(8px, 1.2vh, 10px)' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: 'clamp(3px, 0.5vh, 4px)',
                      fontSize: 'clamp(9px, 1vw, 11px)',
                      fontWeight: '600',
                      color: '#C8A24E',
                      opacity: 0.7,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      المستوى
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: 'clamp(9px, 1.3vh, 11px) clamp(12px, 1.8vw, 14px)',
                        background: '#FFFFFF',
                        border: '1px solid rgba(200, 162, 78, 0.3)',
                        borderRadius: 'clamp(8px, 1.2vh, 12px)',
                        fontSize: 'clamp(12px, 1.4vw, 14px)',
                        textAlign: 'right',
                        fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                        color: '#0A0F0A',
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#C8A24E'
                        e.target.style.boxShadow = '0 0 0 3px rgba(200,162,78,0.12)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(200, 162, 78, 0.3)'
                        e.target.style.boxShadow = 'none'
                      }}
                    >
                      <option value="" style={{ background: '#FFFFFF', color: '#0A0F0A' }}>اختر المستوى</option>
                      {levels.map((lvl, index) => (
                        <option key={index} value={lvl} style={{ background: '#FFFFFF', color: '#0A0F0A' }}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* City */}
                  <div style={{ marginBottom: 'clamp(8px, 1.2vh, 10px)' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: 'clamp(3px, 0.5vh, 4px)',
                      fontSize: 'clamp(9px, 1vw, 11px)',
                      fontWeight: '600',
                      color: '#C8A24E',
                      opacity: 0.7,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      المدينة
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      style={{
                        width: '100%',
                        padding: 'clamp(9px, 1.3vh, 11px) clamp(12px, 1.8vw, 14px)',
                        background: '#FFFFFF',
                        border: '1px solid rgba(200, 162, 78, 0.3)',
                        borderRadius: 'clamp(8px, 1.2vh, 12px)',
                        fontSize: 'clamp(12px, 1.4vw, 14px)',
                        textAlign: 'right',
                        fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                        color: '#0A0F0A',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      placeholder="اسم المدينة"
                      onFocus={(e) => {
                        e.target.style.borderColor = '#C8A24E'
                        e.target.style.boxShadow = '0 0 0 3px rgba(200,162,78,0.12)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(200, 162, 78, 0.3)'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  {/* Mobile */}
                  <div style={{ marginBottom: 'clamp(10px, 1.5vh, 12px)' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: 'clamp(3px, 0.5vh, 4px)',
                      fontSize: 'clamp(9px, 1vw, 11px)',
                      fontWeight: '600',
                      color: '#C8A24E',
                      opacity: 0.7,
                      textAlign: 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      رقم الهاتف (8-15 رقم)
                    </label>
                    <input
                      type="text"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      style={{
                        width: '100%',
                        padding: 'clamp(9px, 1.3vh, 11px) clamp(12px, 1.8vw, 14px)',
                        background: '#FFFFFF',
                        border: '1px solid rgba(200, 162, 78, 0.3)',
                        borderRadius: 'clamp(8px, 1.2vh, 12px)',
                        fontSize: 'clamp(12px, 1.4vw, 14px)',
                        textAlign: 'right',
                        fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                        color: '#0A0F0A',
                        outline: 'none',
                        direction: 'ltr',
                        transition: 'all 0.2s'
                      }}
                      placeholder="99999999"
                      onFocus={(e) => {
                        e.target.style.borderColor = '#C8A24E'
                        e.target.style.boxShadow = '0 0 0 3px rgba(200,162,78,0.12)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(200, 162, 78, 0.3)'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: 'clamp(10px, 1.4vh, 12px) clamp(20px, 3.5vw, 28px)',
                      background: loading ? 'rgba(200, 162, 78, 0.3)' : 'linear-gradient(135deg, #B8922E, #D4AF5E)',
                      color: loading ? 'rgba(240, 253, 244, 0.5)' : '#0A0F0A',
                      border: 'none',
                      borderRadius: 'clamp(8px, 1.2vh, 12px)',
                      fontSize: 'clamp(12px, 1.4vw, 14px)',
                      fontWeight: '700',
                      fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: loading ? 'none' : '0 4px 20px rgba(200,162,78,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'clamp(6px, 0.8vw, 10px)',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 6px 28px rgba(200,162,78,0.6)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 20px rgba(200,162,78,0.4)'
                    }}
                  >
                    {loading && <span className="spinner"></span>}
                    {loading ? 'جاري التسجيل...' : 'تسجيل المتسابق'}
                  </button>
                </form>
              </div>
            )}

            {/* CSV Import Tab */}
            {activeTab === 'import' && (
              <div className="tab-content">
                {/* File Upload Area */}
                <div style={{
                  background: 'rgba(200, 162, 78, 0.08)',
                  padding: 'clamp(12px, 2vh, 16px)',
                  borderRadius: 'clamp(10px, 1.5vh, 14px)',
                  marginBottom: 'clamp(12px, 2vh, 16px)',
                  border: '2px dashed rgba(200, 162, 78, 0.3)'
                }}>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    style={{
                      width: '100%',
                      padding: 'clamp(8px, 1.2vh, 10px)',
                      fontSize: 'clamp(11px, 1.2vw, 13px)',
                      fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                      color: '#F0FDF4',
                      background: 'rgba(200, 162, 78, 0.06)',
                      border: '1px solid rgba(200, 162, 78, 0.2)',
                      borderRadius: 'clamp(6px, 1vh, 8px)',
                      cursor: 'pointer'
                    }}
                  />
                  <p style={{
                    fontSize: 'clamp(9px, 1vw, 11px)',
                    color: 'rgba(240, 253, 244, 0.6)',
                    marginTop: 'clamp(8px, 1.2vh, 10px)',
                    textAlign: 'right',
                    lineHeight: '1.6'
                  }}>
                    الأعمدة المطلوبة: الاسم الكامل، الجنس (ذكر/أنثى)، المستوى، المدينة، رقم الهاتف
                    <br />
                    • يتم قبول أرقام الهواتف المكررة
                    <br />
                    • إذا كان المستوى غير صحيح، سيتم تعيينه تلقائياً للمستوى الخامس
                    <br />
                    • سيتم تجاهل التكرارات الموجودة في نفس الملف تلقائياً
                  </p>
                </div>

                {/* Import Button */}
                <button
                  onClick={handleCSVImport}
                  disabled={!csvFile || importing}
                  style={{
                    width: '100%',
                    padding: 'clamp(10px, 1.4vh, 12px) clamp(20px, 3.5vw, 28px)',
                    background: (!csvFile || importing) ? 'rgba(200, 162, 78, 0.3)' : 'linear-gradient(135deg, #166534, #22C55E)',
                    color: (!csvFile || importing) ? 'rgba(240, 253, 244, 0.5)' : '#FFFFFF',
                    border: 'none',
                    borderRadius: 'clamp(8px, 1.2vh, 12px)',
                    fontSize: 'clamp(12px, 1.4vw, 14px)',
                    fontWeight: '700',
                    fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                    cursor: (!csvFile || importing) ? 'not-allowed' : 'pointer',
                    boxShadow: (!csvFile || importing) ? 'none' : '0 4px 20px rgba(34, 197, 94, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'clamp(6px, 0.8vw, 10px)',
                    marginBottom: 'clamp(12px, 2vh, 16px)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    if (csvFile && !importing) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 6px 28px rgba(34, 197, 94, 0.6)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = (!csvFile || importing) ? 'none' : '0 4px 20px rgba(34, 197, 94, 0.4)'
                  }}
                >
                  {importing && <span className="spinner"></span>}
                  {importing ? 'جاري الاستيراد...' : 'استيراد البيانات'}
                </button>

                {/* Import Results */}
                {importSuccess && (
                  <div style={{
                    padding: 'clamp(12px, 1.8vh, 16px)',
                    background: 'rgba(34, 197, 94, 0.12)',
                    borderRadius: 'clamp(10px, 1.5vh, 14px)',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  }}>
                    <h3 style={{
                      fontSize: 'clamp(13px, 1.5vw, 15px)',
                      fontWeight: '700',
                      color: '#4ADE80',
                      marginBottom: 'clamp(8px, 1.2vh, 10px)',
                      textAlign: 'center'
                    }}>
                      تفاصيل الاستيراد
                    </h3>
                    <div style={{
                      fontSize: 'clamp(11px, 1.2vw, 13px)',
                      color: '#86EFAC',
                      textAlign: 'right',
                      lineHeight: '1.8'
                    }}>
                      <div style={{ marginBottom: 'clamp(4px, 0.6vh, 6px)' }}>
                        ✓ تم تسجيل: <strong style={{ color: '#4ADE80' }}>{importStats.success}</strong> متسابق
                      </div>
                      <div style={{ marginBottom: 'clamp(4px, 0.6vh, 6px)' }}>
                        ⊘ تم تجاهل (مكرر): <strong style={{ color: '#D4AF5E' }}>{importStats.skipped}</strong> متسابق
                      </div>
                      <div>
                        ✗ أخطاء: <strong style={{ color: '#FCA5A5' }}>{importStats.errors}</strong> سطر
                      </div>
                    </div>

                    {/* Error Details */}
                    {importErrors.length > 0 && (
                      <div className="error-list">
                        <div style={{
                          fontWeight: '700',
                          marginBottom: 'clamp(8px, 1.2vh, 10px)',
                          color: '#D4AF5E',
                          fontSize: 'clamp(11px, 1.2vw, 13px)'
                        }}>
                          تفصيل الأخطاء:
                        </div>
                        {importErrors.map((error, index) => (
                          <div key={index} className="error-item">
                            <strong>السطر {error.row}:</strong> {error.name}
                            <br />
                            <span style={{ fontSize: 'clamp(9px, 1vw, 11px)', opacity: 0.8 }}>
                              السبب: {error.reason}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Back Button */}
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%',
              padding: 'clamp(10px, 1.4vh, 12px) clamp(20px, 3.5vw, 28px)',
              background: 'transparent',
              color: '#D4AF5E',
              border: '1px solid rgba(200, 162, 78, 0.3)',
              borderRadius: 'clamp(8px, 1.2vh, 12px)',
              fontSize: 'clamp(12px, 1.4vw, 14px)',
              fontWeight: '700',
              fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
              opacity: 0.7,
              position: 'relative',
              zIndex: 1
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
            العودة للقائمة الرئيسية
          </button>
        </div>
      </div>
    </>
  )
}