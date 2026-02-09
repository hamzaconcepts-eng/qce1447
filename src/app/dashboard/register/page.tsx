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
        if (gender === 'ذكر' || gender.toLowerCase() === 'male') {
          gender = 'male'
        } else if (gender === 'أنثى' || gender.toLowerCase() === 'female') {
          gender = 'female'
        } else {
          errorCount++
          errors.push({
            row: i + 1,
            name: fullName,
            reason: `الجنس غير صحيح: ${gender}`
          })
          continue
        }

        // Validate mobile number (8-15 digits)
        if (!/^\d{8,15}$/.test(mobile)) {
          errorCount++
          errors.push({
            row: i + 1,
            name: fullName,
            reason: `رقم الهاتف غير صحيح: ${mobile}`
          })
          continue
        }

        // Normalize level (with default fallback to Level 5)
        const level = normalizeLevel(levelInput)

        // Create unique key (name + gender + level + city) EXCLUDING mobile
        const uniqueKey = `${fullName}|${gender}|${level}|${city}`

        // Check for duplicates in THIS file
        if (seenInFile.has(uniqueKey)) {
          skippedCount++
          continue
        }

        // Check for duplicates in database
        const { data: existingInDB } = await supabase
          .from('competitors')
          .select('*')
          .eq('full_name', fullName)
          .eq('gender', gender)
          .eq('level', level)
          .eq('city', city)
          .single()

        if (existingInDB) {
          skippedCount++
          seenInFile.add(uniqueKey)
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
            reason: error.message
          })
          continue
        }

        successCount++
        seenInFile.add(uniqueKey)
      }

      setImportStats({ success: successCount, skipped: skippedCount, errors: errorCount })
      setImportErrors(errors)
      setImportSuccess(true)
      setImporting(false)

    } catch (error) {
      console.error('Error importing CSV:', error)
      alert('حدث خطأ أثناء استيراد الملف')
      setImporting(false)
    }
  }

  if (!user) {
    return null
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
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          font-family: 'Cairo', sans-serif;
        }

        body {
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
        }

        .spinner {
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .tab-content {
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .error-list {
          background: #fff3cd;
          padding: clamp(10px, 1.5vh, 15px);
          border-radius: clamp(5px, 0.8vh, 8px);
          margin-top: clamp(10px, 1.5vh, 15px);
        }

        .error-item {
          background: white;
          padding: clamp(8px, 1.2vh, 12px);
          margin-bottom: clamp(8px, 1.2vh, 12px);
          border-radius: clamp(4px, 0.6vh, 6px);
          font-size: clamp(11px, 1.2vw, 13px);
          color: #856404;
          text-align: right;
        }
      `}</style>
      
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'clamp(10px, 1.5vh, 20px)',
        background: 'linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%)'
      }}>
        
        <div style={{
          background: '#ffffff',
          padding: 'clamp(15px, 2.5vh, 30px) clamp(20px, 3vw, 40px)',
          borderRadius: 'clamp(10px, 1.5vh, 20px)',
          boxShadow: '0 1vh 3vh rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: 'clamp(350px, 90vw, 800px)',
          maxHeight: '95vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* Logo */}
          <div style={{
            width: 'clamp(50px, 8vw, 80px)',
            height: 'clamp(50px, 8vw, 80px)',
            margin: '0 auto clamp(8px, 1.2vh, 15px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Image
              src="/images/logo.svg"
              alt="شعار مركز رياض العلم"
              width={80}
              height={80}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              priority
            />
          </div>

          {/* Title */}
          <h1 style={{
            color: '#333333',
            marginBottom: 'clamp(5px, 1vh, 10px)',
            fontSize: 'clamp(14px, 2vw, 22px)',
            fontWeight: '700',
            lineHeight: '1.3',
            textAlign: 'center',
            flexShrink: 0
          }}>
            تسجيل متسابق جديد
          </h1>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: 'clamp(8px, 1vw, 12px)',
            marginBottom: 'clamp(10px, 1.5vh, 20px)',
            flexShrink: 0
          }}>
            <button
              onClick={() => setActiveTab('manual')}
              style={{
                flex: 1,
                padding: 'clamp(8px, 1.2vh, 12px)',
                background: activeTab === 'manual' 
                  ? 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)'
                  : '#f0f0f0',
                color: activeTab === 'manual' ? 'white' : '#666666',
                border: 'none',
                borderRadius: 'clamp(5px, 0.8vh, 10px)',
                fontSize: 'clamp(11px, 1.3vw, 14px)',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              تسجيل يدوي
            </button>
            <button
              onClick={() => setActiveTab('import')}
              style={{
                flex: 1,
                padding: 'clamp(8px, 1.2vh, 12px)',
                background: activeTab === 'import' 
                  ? 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)'
                  : '#f0f0f0',
                color: activeTab === 'import' ? 'white' : '#666666',
                border: 'none',
                borderRadius: 'clamp(5px, 0.8vh, 10px)',
                fontSize: 'clamp(11px, 1.3vw, 14px)',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s'
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
            paddingRight: 'clamp(3px, 0.5vw, 8px)',
            marginBottom: 'clamp(10px, 1.5vh, 15px)'
          }}>
            {/* Manual Registration Tab */}
            {activeTab === 'manual' && (
              <div className="tab-content">
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: 'clamp(12px, 1.8vh, 20px)' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: 'clamp(4px, 0.6vh, 8px)',
                      fontSize: 'clamp(11px, 1.2vw, 14px)',
                      fontWeight: '600',
                      color: '#555555',
                      textAlign: 'right'
                    }}>
                      الاسم الكامل
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: 'clamp(8px, 1.2vh, 12px)',
                        border: '2px solid #e0e0e0',
                        borderRadius: 'clamp(5px, 0.8vh, 10px)',
                        fontSize: 'clamp(12px, 1.4vw, 15px)',
                        textAlign: 'right',
                        fontFamily: 'Cairo, sans-serif'
                      }}
                      placeholder="اسم المتسابق الكامل"
                    />
                  </div>

                  <div style={{ marginBottom: 'clamp(12px, 1.8vh, 20px)' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: 'clamp(4px, 0.6vh, 8px)',
                      fontSize: 'clamp(11px, 1.2vw, 14px)',
                      fontWeight: '600',
                      color: '#555555',
                      textAlign: 'right'
                    }}>
                      الجنس
                    </label>
                    <div style={{ 
                      display: 'flex', 
                      gap: 'clamp(8px, 1.2vw, 15px)',
                      justifyContent: 'flex-end'
                    }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontSize: 'clamp(12px, 1.4vw, 14px)'
                      }}>
                        <span style={{ marginLeft: 'clamp(4px, 0.6vw, 8px)' }}>ذكر</span>
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={gender === 'male'}
                          onChange={(e) => setGender(e.target.value)}
                        />
                      </label>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontSize: 'clamp(12px, 1.4vw, 14px)'
                      }}>
                        <span style={{ marginLeft: 'clamp(4px, 0.6vw, 8px)' }}>أنثى</span>
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={gender === 'female'}
                          onChange={(e) => setGender(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>

                  <div style={{ marginBottom: 'clamp(12px, 1.8vh, 20px)' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: 'clamp(4px, 0.6vh, 8px)',
                      fontSize: 'clamp(11px, 1.2vw, 14px)',
                      fontWeight: '600',
                      color: '#555555',
                      textAlign: 'right'
                    }}>
                      المستوى
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: 'clamp(8px, 1.2vh, 12px)',
                        border: '2px solid #e0e0e0',
                        borderRadius: 'clamp(5px, 0.8vh, 10px)',
                        fontSize: 'clamp(12px, 1.4vw, 15px)',
                        textAlign: 'right',
                        fontFamily: 'Cairo, sans-serif'
                      }}
                    >
                      <option value="">اختر المستوى</option>
                      {levels.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 'clamp(12px, 1.8vh, 20px)' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: 'clamp(4px, 0.6vh, 8px)',
                      fontSize: 'clamp(11px, 1.2vw, 14px)',
                      fontWeight: '600',
                      color: '#555555',
                      textAlign: 'right'
                    }}>
                      المدينة
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      style={{
                        width: '100%',
                        padding: 'clamp(8px, 1.2vh, 12px)',
                        border: '2px solid #e0e0e0',
                        borderRadius: 'clamp(5px, 0.8vh, 10px)',
                        fontSize: 'clamp(12px, 1.4vw, 15px)',
                        textAlign: 'right',
                        fontFamily: 'Cairo, sans-serif'
                      }}
                      placeholder="اسم المدينة"
                    />
                  </div>

                  <div style={{ marginBottom: 'clamp(15px, 2.5vh, 30px)' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: 'clamp(4px, 0.6vh, 8px)',
                      fontSize: 'clamp(11px, 1.2vw, 14px)',
                      fontWeight: '600',
                      color: '#555555',
                      textAlign: 'right'
                    }}>
                      رقم الهاتف (8-15 رقم)
                    </label>
                    <input
                      type="text"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      style={{
                        width: '100%',
                        padding: 'clamp(8px, 1.2vh, 12px)',
                        border: '2px solid #e0e0e0',
                        borderRadius: 'clamp(5px, 0.8vh, 10px)',
                        fontSize: 'clamp(12px, 1.4vw, 15px)',
                        textAlign: 'right',
                        fontFamily: 'Cairo, sans-serif',
                        direction: 'ltr'
                      }}
                      placeholder="99999999"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: 'clamp(10px, 1.5vh, 15px)',
                      background: loading ? '#95a5a6' : 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'clamp(5px, 0.8vh, 10px)',
                      fontSize: 'clamp(13px, 1.5vw, 16px)',
                      fontWeight: '700',
                      fontFamily: 'Cairo, sans-serif',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 0.4vh 1.5vh rgba(26, 58, 58, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'clamp(5px, 0.8vw, 10px)'
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
                <div style={{
                  background: '#f0f9f9',
                  padding: 'clamp(12px, 2vh, 20px)',
                  borderRadius: 'clamp(6px, 1vh, 12px)',
                  marginBottom: 'clamp(12px, 2vh, 20px)',
                  border: '2px dashed #5fb3b3'
                }}>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    style={{
                      width: '100%',
                      padding: 'clamp(8px, 1.2vh, 10px)',
                      fontSize: 'clamp(11px, 1.2vw, 14px)',
                      fontFamily: 'Cairo, sans-serif'
                    }}
                  />
                  <p style={{
                    fontSize: 'clamp(9px, 1vw, 12px)',
                    color: '#666666',
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

                <button
                  onClick={handleCSVImport}
                  disabled={!csvFile || importing}
                  style={{
                    width: '100%',
                    padding: 'clamp(10px, 1.5vh, 15px)',
                    background: (!csvFile || importing) ? '#95a5a6' : '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'clamp(5px, 0.8vh, 10px)',
                    fontSize: 'clamp(13px, 1.5vw, 16px)',
                    fontWeight: '700',
                    fontFamily: 'Cairo, sans-serif',
                    cursor: (!csvFile || importing) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 0.4vh 1.5vh rgba(52, 152, 219, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'clamp(5px, 0.8vw, 10px)'
                  }}
                >
                  {importing && <span className="spinner"></span>}
                  {importing ? 'جاري الاستيراد...' : 'استيراد البيانات'}
                </button>

                {/* Import Results */}
                {importSuccess && (
                  <div style={{
                    marginTop: 'clamp(12px, 2vh, 20px)',
                    padding: 'clamp(10px, 1.5vh, 15px)',
                    background: '#d4edda',
                    borderRadius: 'clamp(5px, 0.8vh, 10px)',
                    border: '1px solid #28a745'
                  }}>
                    <h3 style={{
                      fontSize: 'clamp(13px, 1.5vw, 16px)',
                      fontWeight: '700',
                      color: '#27ae60',
                      marginBottom: 'clamp(8px, 1.2vh, 10px)',
                      textAlign: 'center'
                    }}>
                      تفاصيل الاستيراد
                    </h3>
                    <div style={{
                      fontSize: 'clamp(11px, 1.2vw, 14px)',
                      color: '#155724',
                      textAlign: 'right',
                      lineHeight: '2'
                    }}>
                      <div>✓ تم تسجيل: <strong>{importStats.success}</strong> متسابق</div>
                      <div>⊘ تم تجاهل (مكرر): <strong>{importStats.skipped}</strong> متسابق</div>
                      <div>✗ أخطاء: <strong>{importStats.errors}</strong> سطر</div>
                    </div>

                    {/* Error Details */}
                    {importErrors.length > 0 && (
                      <div className="error-list">
                        <div style={{
                          fontWeight: '700',
                          marginBottom: 'clamp(8px, 1.2vh, 10px)',
                          color: '#856404',
                          fontSize: 'clamp(11px, 1.2vw, 13px)'
                        }}>
                          تفصيل الأخطاء:
                        </div>
                        {importErrors.map((error, index) => (
                          <div key={index} className="error-item">
                            <strong>السطر {error.row}:</strong> {error.name}
                            <br />
                            <span style={{ fontSize: 'clamp(9px, 1vw, 12px)' }}>السبب: {error.reason}</span>
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
              padding: 'clamp(10px, 1.5vh, 15px)',
              background: '#ffffff',
              color: '#5fb3b3',
              border: '2px solid #5fb3b3',
              borderRadius: 'clamp(5px, 0.8vh, 10px)',
              fontSize: 'clamp(13px, 1.5vw, 16px)',
              fontWeight: '700',
              fontFamily: 'Cairo, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#5fb3b3'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.color = '#5fb3b3'
            }}
          >
            العودة للقائمة الرئيسية
          </button>
        </div>
      </div>
    </>
  )
}