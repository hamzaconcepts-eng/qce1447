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

        // Normalize level - ALWAYS returns a valid level (defaults to Level 5)
        const level = normalizeLevel(levelInput)

        // Validate phone number (8-15 digits)
        if (!/^\d{8,15}$/.test(mobile)) {
          errorCount++
          errors.push({
            row: i + 1,
            name: fullName,
            reason: `رقم الهاتف غير صحيح: ${mobile}`
          })
          continue
        }

        // Create unique key for this competitor (EXCLUDING mobile)
        const uniqueKey = `${fullName}|${gender}|${level}|${city}`

        // Check if already seen in this file
        if (seenInFile.has(uniqueKey)) {
          skippedCount++
          continue
        }

        seenInFile.add(uniqueKey)

        // Check database for exact duplicate (EXCLUDING mobile)
        const { data: existing } = await supabase
          .from('competitors')
          .select('id')
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
            reason: error.message
          })
        } else {
          successCount++
        }
      }

      setImportStats({ success: successCount, skipped: skippedCount, errors: errorCount })
      setImportErrors(errors)
      setImportSuccess(true)
      setImporting(false)

      // Clear file input
      setCsvFile(null)
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''

    } catch (error) {
      console.error('CSV import error:', error)
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
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        @media (max-width: 480px) {
          .app-container {
            padding: 25px 20px;
            border-radius: 15px;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.6s linear infinite;
        }

        .error-list {
          max-height: 300px;
          overflow-y: auto;
          background: #fff3cd;
          padding: 15px;
          border-radius: 10px;
          margin-top: 15px;
          border: 1px solid #ffc107;
        }

        .error-item {
          padding: 8px 0;
          border-bottom: 1px solid #ffe8a1;
          font-size: 13px;
          color: #856404;
        }

        .error-item:last-child {
          border-bottom: none;
        }

        .tab-button {
          flex: 1;
          padding: 12px 20px;
          border: none;
          background: #f5f5f5;
          color: #666666;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Cairo', sans-serif;
          cursor: pointer;
          transition: all 0.3s;
          border-bottom: 3px solid transparent;
        }

        .tab-button.active {
          background: white;
          color: #5fb3b3;
          border-bottom-color: #5fb3b3;
        }

        .tab-button:hover {
          background: #f0f9f9;
        }

        .tab-content {
          padding: 30px 0;
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
          
          {/* Header */}
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Image
                src="/images/logo.svg"
                alt="شعار مركز رياض العلم"
                width={60}
                height={60}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                priority
              />
            </div>

            <h1 style={{
              color: '#333333',
              fontSize: '22px',
              fontWeight: '700',
              marginBottom: '5px'
            }}>
              تسجيل المتسابقين
            </h1>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '0',
            marginBottom: '0',
            borderRadius: '10px 10px 0 0',
            overflow: 'hidden',
            border: '2px solid #e0e0e0',
            borderBottom: 'none'
          }}>
            <button
              className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              تسجيل يدوي
            </button>
            <button
              className={`tab-button ${activeTab === 'import' ? 'active' : ''}`}
              onClick={() => setActiveTab('import')}
            >
              استيراد CSV
            </button>
          </div>

          {/* Tab Content */}
          <div style={{
            border: '2px solid #e0e0e0',
            borderRadius: '0 0 10px 10px',
            padding: '30px',
            minHeight: '400px'
          }}>
            
            {/* Manual Registration Tab */}
            {activeTab === 'manual' && (
              <div className="tab-content">
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
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
                        padding: '12px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '10px',
                        fontSize: '15px',
                        textAlign: 'right',
                        fontFamily: 'Cairo, sans-serif'
                      }}
                      placeholder="الاسم الثلاثي الكامل"
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#555555',
                      textAlign: 'right'
                    }}>
                      الجنس
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontFamily: 'Cairo, sans-serif',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">اختر الجنس</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
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
                        padding: '12px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontFamily: 'Cairo, sans-serif',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">اختر المستوى</option>
                      {levels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
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
                        padding: '12px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '10px',
                        fontSize: '15px',
                        textAlign: 'right',
                        fontFamily: 'Cairo, sans-serif'
                      }}
                      placeholder="اسم المدينة"
                    />
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
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
                        padding: '12px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '10px',
                        fontSize: '15px',
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
                      padding: '15px',
                      background: loading ? '#95a5a6' : 'linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: '700',
                      fontFamily: 'Cairo, sans-serif',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 15px rgba(26, 58, 58, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
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
                  padding: '20px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  border: '2px dashed #5fb3b3'
                }}>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '14px',
                      fontFamily: 'Cairo, sans-serif'
                    }}
                  />
                  <p style={{
                    fontSize: '12px',
                    color: '#666666',
                    marginTop: '10px',
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
                    padding: '15px',
                    background: (!csvFile || importing) ? '#95a5a6' : '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: '700',
                    fontFamily: 'Cairo, sans-serif',
                    cursor: (!csvFile || importing) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  {importing && <span className="spinner"></span>}
                  {importing ? 'جاري الاستيراد...' : 'استيراد البيانات'}
                </button>

                {/* Import Results */}
                {importSuccess && (
                  <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: '#d4edda',
                    borderRadius: '10px',
                    border: '1px solid #28a745'
                  }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#27ae60',
                      marginBottom: '10px',
                      textAlign: 'center'
                    }}>
                      تفاصيل الاستيراد
                    </h3>
                    <div style={{
                      fontSize: '14px',
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
                          marginBottom: '10px',
                          color: '#856404'
                        }}>
                          تفصيل الأخطاء:
                        </div>
                        {importErrors.map((error, index) => (
                          <div key={index} className="error-item">
                            <strong>السطر {error.row}:</strong> {error.name}
                            <br />
                            <span style={{ fontSize: '12px' }}>السبب: {error.reason}</span>
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
              marginTop: '30px',
              padding: '15px',
              background: '#ffffff',
              color: '#5fb3b3',
              border: '2px solid #5fb3b3',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '700',
              fontFamily: 'Cairo, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.2s'
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