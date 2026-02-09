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

interface Competitor {
  id: string
  full_name: string
  gender: string
  level: string
  city: string
  mobile: string
  status: string
  created_at: string
}

interface Evaluation {
  id?: string
  competitor_id: string
  evaluator_name: string
  tanbih_count: number
  fateh_count: number
  tashkeel_count: number
  tajweed_count: number
  final_score: number
  created_at?: string
  updated_at?: string
}

type SortField = 'full_name' | 'gender' | 'level' | 'city' | 'status'
type SortDirection = 'asc' | 'desc'

export default function EvaluatePage() {
  const [user, setUser] = useState<User | null>(null)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [filteredCompetitors, setFilteredCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Sorting
  const [sortField, setSortField] = useState<SortField>('full_name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Selected competitor for evaluation
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)
  const [existingEvaluation, setExistingEvaluation] = useState<Evaluation | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Evaluation scores
  const [tanbihCount, setTanbihCount] = useState(0)
  const [fatehCount, setFatehCount] = useState(0)
  const [tashkeelCount, setTashkeelCount] = useState(0)
  const [tajweedCount, setTajweedCount] = useState(0)
  const [finalScore, setFinalScore] = useState(100)

  // UI states
  const [hasChanges, setHasChanges] = useState(false)
  const [showBackWarning, setShowBackWarning] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const [showAlreadyEvaluated, setShowAlreadyEvaluated] = useState(false)
  const [saving, setSaving] = useState(false)

  const levels = [
    'المستوى الأول: المرحلة الجامعية | الحج والمؤمنون',
    'المستوى الثاني: الصفوف 10-12 | الشعراء والنمل',
    'المستوى الثالث: الصفوف 7-9 | العنكبوت والروم',
    'المستوى الرابع: الصفوف 4-6 | جزء تبارك',
    'المستوى الخامس: الصفوف 1-3 | جزء عمَّ'
  ]

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
    const userData = JSON.parse(userStr)
    if (userData.role !== 'admin' && userData.role !== 'evaluator') {
      router.push('/dashboard')
      return
    }
    setUser(userData)
    fetchCompetitors()
  }, [router])

  useEffect(() => {
    applyFilters()
  }, [competitors, searchTerm, filterGender, filterLevel, filterStatus, sortField, sortDirection])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterGender, filterLevel, filterStatus])

  useEffect(() => {
    calculateFinalScore()
  }, [tanbihCount, fatehCount, tashkeelCount, tajweedCount])

  const fetchCompetitors = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) throw error

      setCompetitors(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching competitors:', error)
      setLoading(false)
    }
  }

  // NEW FUNCTION: Update active evaluation to show on live stats
  const updateActiveEvaluation = async (competitor: Competitor) => {
    try {
      const supabase = createClient()
      await supabase
        .from('active_evaluations')
        .upsert({
          level: competitor.level,
          competitor_id: competitor.id,
          competitor_name: competitor.full_name,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'level'
        })
    } catch (error) {
      console.error('Error updating active evaluation:', error)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const applyFilters = () => {
    let filtered = [...competitors]

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterGender) {
      filtered = filtered.filter(c => c.gender === filterGender)
    }

    if (filterLevel) {
      filtered = filtered.filter(c => c.level === filterLevel)
    }

    if (filterStatus) {
      filtered = filtered.filter(c => c.status === filterStatus)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      if (sortField === 'gender') {
        aValue = a.gender === 'male' ? 'ذكر' : 'أنثى'
        bValue = b.gender === 'male' ? 'ذكر' : 'أنثى'
      }

      if (sortField === 'status') {
        aValue = a.status === 'evaluated' ? 'تم التقييم' : 'لم يتم التقييم'
        bValue = b.status === 'evaluated' ? 'تم التقييم' : 'لم يتم التقييم'
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredCompetitors(filtered)
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredCompetitors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCompetitors = filteredCompetitors.slice(startIndex, endIndex)

  const calculateFinalScore = () => {
    const deduction = (tanbihCount * 1) + (fatehCount * 2) + (tashkeelCount * 1) + (tajweedCount * 0.5)
    const score = Math.max(0, 100 - deduction)
    setFinalScore(Number(score.toFixed(1)))
  }

  const handleSelectCompetitor = async (competitor: Competitor) => {
    if (hasChanges && selectedCompetitor) {
      setShowBackWarning(true)
      return
    }

    setSelectedCompetitor(competitor)
    setHasChanges(false)
    setShowSaveSuccess(false)

    // NEW: Update active evaluation to show on live stats dashboard
    await updateActiveEvaluation(competitor)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('evaluations')
      .select('*')
      .eq('competitor_id', competitor.id)
      .single()

    if (data && !error) {
      setExistingEvaluation(data)
      setTanbihCount(data.tanbih_count)
      setFatehCount(data.fateh_count)
      setTashkeelCount(data.tashkeel_count)
      setTajweedCount(data.tajweed_count)
      setShowAlreadyEvaluated(true)
    } else {
      setExistingEvaluation(null)
      setTanbihCount(0)
      setFatehCount(0)
      setTashkeelCount(0)
      setTajweedCount(0)
      setShowAlreadyEvaluated(false)
    }
  }

  const incrementCount = (type: 'tanbih' | 'fateh' | 'tashkeel' | 'tajweed') => {
    setHasChanges(true)
    switch (type) {
      case 'tanbih': setTanbihCount(prev => prev + 1); break
      case 'fateh': setFatehCount(prev => prev + 1); break
      case 'tashkeel': setTashkeelCount(prev => prev + 1); break
      case 'tajweed': setTajweedCount(prev => prev + 1); break
    }
  }

  const decrementCount = (type: 'tanbih' | 'fateh' | 'tashkeel' | 'tajweed') => {
    setHasChanges(true)
    switch (type) {
      case 'tanbih': setTanbihCount(prev => Math.max(0, prev - 1)); break
      case 'fateh': setFatehCount(prev => Math.max(0, prev - 1)); break
      case 'tashkeel': setTashkeelCount(prev => Math.max(0, prev - 1)); break
      case 'tajweed': setTajweedCount(prev => Math.max(0, prev - 1)); break
    }
  }

  const handleSave = async () => {
    if (!selectedCompetitor || !user) return

    setSaving(true)

    try {
      const supabase = createClient()

      const evaluationData = {
        competitor_id: selectedCompetitor.id,
        evaluator_name: user.username,
        tanbih_count: tanbihCount,
        fateh_count: fatehCount,
        tashkeel_count: tashkeelCount,
        tajweed_count: tajweedCount,
        final_score: finalScore
      }

      let savedEvaluation

      if (existingEvaluation) {
        const { data, error } = await supabase
          .from('evaluations')
          .update({
            ...evaluationData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEvaluation.id)
          .select()
          .single()

        if (error) throw error
        savedEvaluation = data
      } else {
        const { data, error } = await supabase
          .from('evaluations')
          .insert([evaluationData])
          .select()
          .single()

        if (error) throw error
        savedEvaluation = data
      }

      await supabase
        .from('competitors')
        .update({ status: 'evaluated' })
        .eq('id', selectedCompetitor.id)

      // Update existing evaluation with the saved data
      setExistingEvaluation(savedEvaluation)
      setHasChanges(false)
      setShowSaveSuccess(true)
      setSaving(false)

      await fetchCompetitors()

      setTimeout(() => setShowSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving evaluation:', error)
      setSaving(false)
    }
  }

  const handleBackToList = () => {
    if (hasChanges) {
      setShowBackWarning(true)
    } else {
      setSelectedCompetitor(null)
    }
  }

  const handleBack = () => {
    if (hasChanges) {
      setShowBackWarning(true)
    } else {
      router.push('/dashboard')
    }
  }

  const confirmBack = () => {
    setShowBackWarning(false)
    if (selectedCompetitor) {
      setSelectedCompetitor(null)
    } else {
      router.push('/dashboard')
    }
  }

  const handlePrintScoreCard = () => {
    if (!selectedCompetitor) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const scoreHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>بطاقة التقييم - ${selectedCompetitor.full_name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { 
            size: letter;
            margin: 12mm;
          }
          body { 
            font-family: 'Cairo', sans-serif; 
            direction: rtl;
            background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
            min-height: calc(var(--vh, 1vh) * 100);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 8mm;
          }
          .certificate {
            background: white;
            width: 8.5in;
            height: 11in;
            padding: 0;
            position: relative;
            box-shadow: 0 30px 80px rgba(0,0,0,0.4);
            overflow: hidden;
          }
          
          .certificate::before,
          .certificate::after {
            content: '';
            position: absolute;
            width: 60px;
            height: 60px;
            border: 2px solid #5fb3b3;
            opacity: 0.4;
          }
          
          .certificate::before {
            top: 12px;
            right: 12px;
            border-bottom: none;
            border-left: none;
          }
          
          .certificate::after {
            bottom: 12px;
            left: 12px;
            border-top: none;
            border-right: none;
          }
          
          .header {
            background: linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%);
            padding: 25px 30px;
            text-align: center;
          }
          
          .logo-circle {
            width: 70px;
            height: 70px;
            margin: 0 auto 12px;
            background: white;
            border-radius: 50%;
            padding: 8px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.2);
          }
          
          .logo-circle img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          
          .header h1 {
            color: white;
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 5px;
            text-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          
          .header .subtitle {
            color: rgba(255,255,255,0.95);
            font-size: 15px;
            font-weight: 600;
            text-shadow: 0 2px 6px rgba(0,0,0,0.15);
          }
          
          .content {
            padding: 25px 35px 20px;
          }
          
          .edition {
            text-align: center;
            color: #5fb3b3;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 20px;
            letter-spacing: 0.5px;
          }
          
          .participant-name {
            font-size: 26px;
            font-weight: 800;
            color: #1a3a3a;
            text-align: center;
            margin-bottom: 18px;
            padding-bottom: 10px;
            border-bottom: 3px solid #5fb3b3;
          }
          
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
          }
          
          .detail-card {
            background: #f8f9fa;
            padding: 8px 12px;
            border-radius: 8px;
            border-right: 3px solid #5fb3b3;
            text-align: right;
          }
          
          .detail-label {
            font-size: 10px;
            color: #6c757d;
            margin-bottom: 2px;
            font-weight: 600;
          }
          
          .detail-value {
            font-size: 13px;
            color: #1a3a3a;
            font-weight: 700;
          }
          
          .level-card {
            grid-column: span 2;
            background: #f0f9f9;
            padding: 10px 12px;
            border-radius: 8px;
            border-right: 3px solid #1a3a3a;
            text-align: right;
          }
          
          .score-breakdown-container {
            margin: 20px 0 25px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            align-items: center;
          }
          
          .score-section {
            text-align: center;
          }
          
          .score-label {
            font-size: 12px;
            color: #495057;
            margin-bottom: 10px;
            font-weight: 700;
            letter-spacing: 1px;
          }
          
          .final-score {
            font-size: 65px;
            font-weight: 800;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
          }
          
          .score-green { 
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); 
            color: #155724;
            border: 3px solid #28a745;
          }
          .score-yellow { 
            background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%); 
            color: #856404;
            border: 3px solid #ffc107;
          }
          .score-red { 
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); 
            color: #721c24;
            border: 3px solid #dc3545;
          }
          
          .breakdown-side {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .breakdown-title {
            font-size: 12px;
            font-weight: 700;
            color: #495057;
            margin-bottom: 5px;
            text-align: right;
            letter-spacing: 0.5px;
          }
          
          .breakdown-item {
            background: white;
            padding: 8px 10px;
            border-radius: 8px;
            border: 2px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.04);
          }
          
          .breakdown-label {
            font-size: 12px;
            font-weight: 700;
            color: #495057;
          }
          
          .breakdown-value {
            text-align: left;
          }
          
          .breakdown-count {
            font-size: 18px;
            font-weight: 800;
            color: #1a3a3a;
          }
          
          .breakdown-deduction {
            font-size: 9px;
            color: #6c757d;
            font-weight: 600;
          }
          
          .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: #f8f9fa;
            padding: 12px 35px;
            text-align: center;
            border-top: 2px solid #e9ecef;
          }
          
          .footer-date {
            color: #6c757d;
            font-size: 11px;
            font-weight: 600;
          }
          
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .certificate {
              box-shadow: none;
              width: 8.5in;
              height: 11in;
            }
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <div class="logo-circle">
              <img src="/images/logo.svg" alt="شعار مركز رياض العلم">
            </div>
            <h1>مسابقة مركز رياض العلم</h1>
            <div class="subtitle">لحفظ القرآن الكريم</div>
          </div>
          
          <div class="content">
            <div class="edition">• الدورة الخامسة - رمضان 1447هـ •</div>
            <div class="participant-name">${selectedCompetitor.full_name}</div>
            
            <div class="details-grid">
              <div class="detail-card">
                <div class="detail-label">الجنس</div>
                <div class="detail-value">${selectedCompetitor.gender === 'male' ? 'ذكر' : 'أنثى'}</div>
              </div>
              
              <div class="detail-card">
                <div class="detail-label">المدينة</div>
                <div class="detail-value">${selectedCompetitor.city}</div>
              </div>
              
              <div class="level-card">
                <div class="detail-label">المستوى</div>
                <div class="detail-value">${selectedCompetitor.level}</div>
              </div>
            </div>
            
            <div class="score-breakdown-container">
              <div class="score-section">
                <div class="score-label">• الدرجة النهائية •</div>
                <div class="final-score ${
                  finalScore >= 95 ? 'score-green' : 
                  finalScore >= 90 ? 'score-yellow' : 
                  'score-red'
                }">
                  ${finalScore}
                </div>
              </div>
              
              <div class="breakdown-side">
                <div class="breakdown-title">تفصيل الأخطاء</div>
                
                <div class="breakdown-item">
                  <div class="breakdown-label">تنبيه</div>
                  <div class="breakdown-value">
                    <div class="breakdown-count">${tanbihCount}</div>
                    <div class="breakdown-deduction">-${tanbihCount} درجة</div>
                  </div>
                </div>
                
                <div class="breakdown-item">
                  <div class="breakdown-label">فتح</div>
                  <div class="breakdown-value">
                    <div class="breakdown-count">${fatehCount}</div>
                    <div class="breakdown-deduction">-${fatehCount * 2} درجة</div>
                  </div>
                </div>
                
                <div class="breakdown-item">
                  <div class="breakdown-label">تشكيل</div>
                  <div class="breakdown-value">
                    <div class="breakdown-count">${tashkeelCount}</div>
                    <div class="breakdown-deduction">-${tashkeelCount} درجة</div>
                  </div>
                </div>
                
                <div class="breakdown-item">
                  <div class="breakdown-label">تجويد</div>
                  <div class="breakdown-value">
                    <div class="breakdown-count">${tajweedCount}</div>
                    <div class="breakdown-deduction">-${tajweedCount * 0.5} درجة</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-date">تاريخ التقييم: ${new Date().toLocaleDateString('ar-SA')}</div>
          </div>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(scoreHTML)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  const resetFilters = () => {
    setSearchTerm('')
    setFilterGender('')
    setFilterLevel('')
    setFilterStatus('')
  }

  if (!user) {
    return null
  }

  return (
    <>
      <style jsx global>{`
        body {
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          min-height: calc(var(--vh, 1vh) * 100);
        }
        
        .app-container {
          background: #ffffff;
          padding: 30px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 15px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .category-group {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 15px;
          margin-bottom: 20px;
        }

        .group-title {
          font-size: 16px;
          font-weight: 600;
          color: #5fb3b3;
          margin-bottom: 15px;
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 2px solid #e0e0e0;
        }

        .print-button-compact {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #e8e8e8;
          color: #666666;
          border: 1px solid #d0d0d0;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          font-family: 'Cairo', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
        }

        .print-button-compact:hover {
          background: #d8d8d8;
          color: #555555;
          border-color: #b8b8b8;
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }

        .compact-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .compact-table th,
        .compact-table td {
          padding: 6px 8px;
          text-align: center;
          border-bottom: 1px solid #e0e0e0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .compact-table th {
          background: #f5f5f5;
          font-weight: 600;
          color: #555555;
          position: sticky;
          top: 0;
          z-index: 10;
          font-size: 11px;
          cursor: pointer;
          user-select: none;
        }

        .compact-table th:hover {
          background: #e8e8e8;
        }

        .compact-table .name-cell {
          text-align: right;
          font-weight: 600;
          color: #333333;
          max-width: 200px;
        }

        .compact-table .level-cell {
          font-size: 10px;
          max-width: 150px;
        }

        .compact-table tr {
          cursor: pointer;
          transition: all 0.2s;
        }

        .compact-table tr:hover {
          background: #f0f9f9;
        }

        .sort-indicator {
          display: inline-block;
          margin-left: 4px;
          font-size: 10px;
        }

        .pagination {
          display: flex;
          gap: 5px;
          justify-content: center;
          align-items: center;
          margin-top: 20px;
        }

        .page-button {
          padding: 6px 12px;
          border: 1px solid #e0e0e0;
          background: white;
          cursor: pointer;
          border-radius: 5px;
          font-family: 'Cairo', sans-serif;
          font-size: 13px;
          transition: all 0.2s;
        }

        .page-button:hover {
          background: #f0f9f9;
          border-color: #5fb3b3;
        }

        .page-button.active {
          background: #5fb3b3;
          color: white;
          border-color: #5fb3b3;
        }

        .page-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .back-button {
          width: 100%;
          margin-top: 20px;
          padding: 12px;
          background: #ffffff;
          color: #5fb3b3;
          border: 2px solid #5fb3b3;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          font-family: 'Cairo', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-button:hover {
          background: #5fb3b3;
          color: white;
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
      `}</style>

      <div style={{
        minHeight: 'calc(var(--vh, 1vh) * 100)',
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
              تقييم المتسابقين
            </h1>

            {!selectedCompetitor && (
              <p style={{
                color: '#666666',
                fontSize: '14px'
              }}>
                إجمالي: {filteredCompetitors.length} متسابق | الصفحة {currentPage} من {totalPages}
              </p>
            )}
          </div>

          {!selectedCompetitor ? (
            <>
              {/* Search */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="بحث بالاسم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '10px',
                    fontSize: '15px',
                    textAlign: 'right',
                    fontFamily: 'Cairo, sans-serif',
                    marginBottom: '10px'
                  }}
                />

                {/* Filters */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '10px'
                }}>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    style={{
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'Cairo, sans-serif',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">كل الأجناس</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'Cairo, sans-serif',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">كل الحالات</option>
                    <option value="evaluated">تم التقييم</option>
                    <option value="not_evaluated">لم يتم التقييم</option>
                  </select>

                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    style={{
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'Cairo, sans-serif',
                      cursor: 'pointer',
                      gridColumn: 'span 2'
                    }}
                  >
                    <option value="">كل المستويات</option>
                    {levels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>

                  <button
                    onClick={resetFilters}
                    style={{
                      gridColumn: 'span 2',
                      padding: '10px',
                      background: '#f5f5f5',
                      color: '#666666',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      fontFamily: 'Cairo, sans-serif',
                      cursor: 'pointer'
                    }}
                  >
                    إعادة تعيين
                  </button>
                </div>
              </div>

              {/* Competitors Table */}
              <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                {loading && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666666' }}>
                    جاري التحميل...
                  </div>
                )}

                {!loading && filteredCompetitors.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666666' }}>
                    لا توجد نتائج
                  </div>
                )}

                {!loading && currentCompetitors.length > 0 && (
                  <table className="compact-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th onClick={() => handleSort('full_name')}>
                          الاسم
                          {sortField === 'full_name' && (
                            <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th style={{ width: '60px' }} onClick={() => handleSort('gender')}>
                          الجنس
                          {sortField === 'gender' && (
                            <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th onClick={() => handleSort('level')}>
                          المستوى
                          {sortField === 'level' && (
                            <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th style={{ width: '100px' }} onClick={() => handleSort('city')}>
                          المدينة
                          {sortField === 'city' && (
                            <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th style={{ width: '95px' }} onClick={() => handleSort('status')}>
                          الحالة
                          {sortField === 'status' && (
                            <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCompetitors.map((competitor, index) => (
                        <tr 
                          key={competitor.id}
                          onClick={() => handleSelectCompetitor(competitor)}
                        >
                          <td style={{ fontWeight: '600', color: '#5fb3b3' }}>
                            {startIndex + index + 1}
                          </td>
                          <td className="name-cell">
                            {competitor.full_name}
                          </td>
                          <td>{competitor.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                          <td className="level-cell">{competitor.level.split(':')[0]}</td>
                          <td>{competitor.city}</td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontSize: '10px',
                              fontWeight: '600',
                              background: competitor.status === 'evaluated' ? '#d4edda' : '#fff3cd',
                              color: competitor.status === 'evaluated' ? '#27ae60' : '#f39c12'
                            }}>
                              {competitor.status === 'evaluated' ? 'تم التقييم' : 'لم يتم التقييم'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="page-button" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                    الأولى
                  </button>
                  <button className="page-button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    السابق
                  </button>
                  
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1
                    if (page <= 3 || page > totalPages - 3 || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button key={page} className={`page-button ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>
                          {page}
                        </button>
                      )
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page}>...</span>
                    }
                    return null
                  })}
                  
                  <button className="page-button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    التالي
                  </button>
                  <button className="page-button" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                    الأخيرة
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Evaluation Screen - BEAUTIFUL PROFESSIONAL FINAL */}
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'grid',
                gridTemplateColumns: '1fr clamp(260px, 27vw, 360px)',
                gridTemplateRows: 'auto 1fr',
                gap: 'clamp(8px, 1.2vw, 14px)',
                padding: 'clamp(6px, 1vh, 12px)',
                overflow: 'hidden',
                boxSizing: 'border-box',
                background: '#ffffff'
              }}>
                
                {/* FIXED ALERTS */}
                {showAlreadyEvaluated && (
                  <div style={{
                    position: 'fixed',
                    top: '15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#fff3cd',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    textAlign: 'center',
                    color: '#856404',
                    border: '1px solid #ffc107',
                    zIndex: 1000,
                    boxShadow: '0 3px 15px rgba(0,0,0,0.12)',
                    maxWidth: '85vw'
                  }}>
                    ⚠️ تم تقييم هذا المتسابق مسبقاً
                  </div>
                )}

                {showSaveSuccess && (
                  <div style={{
                    position: 'fixed',
                    top: '15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#d4edda',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    textAlign: 'center',
                    color: '#27ae60',
                    fontWeight: '700',
                    zIndex: 1000,
                    boxShadow: '0 3px 15px rgba(0,0,0,0.12)',
                    maxWidth: '85vw'
                  }}>
                    ✓ تم حفظ التقييم بنجاح
                  </div>
                )}

                {/* TOP ROW */}
                <div style={{
                  gridColumn: '1 / 2',
                  gridRow: '1 / 2',
                  display: 'flex',
                  gap: 'clamp(8px, 1.2vw, 14px)',
                  height: 'auto',
                  overflow: 'hidden'
                }}>
                  
                  {/* تنبيه */}
                  <div style={{
                    flex: 1,
                    background: '#ffffff',
                    borderRadius: '10px',
                    padding: 'clamp(12px, 1.8vh, 18px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                    border: '1.5px solid #e0e0e0',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '6px', flexShrink: 0 }}>
                      <div style={{
                        fontSize: 'clamp(18px, 2.3vw, 26px)',
                        fontWeight: '800',
                        color: '#333',
                        marginBottom: '3px',
                        lineHeight: '1'
                      }}>
                        تنبيه
                      </div>
                      <div style={{
                        fontSize: 'clamp(10px, 1.1vw, 12px)',
                        color: '#888',
                        fontWeight: '400',
                        lineHeight: '1'
                      }}>
                        {tanbihCount === 0 ? '(-0)' : `(-${tanbihCount})`}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'clamp(8px, 1.2vw, 12px)',
                      marginTop: 'auto'
                    }}>
                      <button
                        onClick={() => incrementCount('tanbih')}
                        style={{
                          flex: 1,
                          padding: 'clamp(20px, 3vh, 30px) clamp(10px, 1.5vw, 15px)',
                          background: 'linear-gradient(135deg, #5fb3b3 0%, #4a9d9d 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: 'clamp(28px, 3.8vw, 42px)',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(95,179,179,0.25)'
                        }}
                      >
                        +
                      </button>

                      <div style={{
                        fontSize: 'clamp(36px, 5vw, 56px)',
                        fontWeight: '800',
                        color: '#333',
                        minWidth: 'clamp(45px, 6vw, 70px)',
                        textAlign: 'center',
                        lineHeight: '1'
                      }}>
                        {tanbihCount}
                      </div>

                      <button
                        onClick={() => decrementCount('tanbih')}
                        style={{
                          flex: 1,
                          padding: 'clamp(20px, 3vh, 30px) clamp(10px, 1.5vw, 15px)',
                          background: '#95a5a6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: 'clamp(28px, 3.8vw, 42px)',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                        }}
                      >
                        −
                      </button>
                    </div>
                  </div>

                  {/* فتح */}
                  <div style={{
                    flex: 1,
                    background: '#ffffff',
                    borderRadius: '10px',
                    padding: 'clamp(12px, 1.8vh, 18px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                    border: '1.5px solid #e0e0e0',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '6px', flexShrink: 0 }}>
                      <div style={{
                        fontSize: 'clamp(18px, 2.3vw, 26px)',
                        fontWeight: '800',
                        color: '#333',
                        marginBottom: '3px',
                        lineHeight: '1'
                      }}>
                        فتح
                      </div>
                      <div style={{
                        fontSize: 'clamp(10px, 1.1vw, 12px)',
                        color: '#888',
                        fontWeight: '400',
                        lineHeight: '1'
                      }}>
                        {fatehCount === 0 ? '(-0)' : `(-${fatehCount * 2})`}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'clamp(8px, 1.2vw, 12px)',
                      marginTop: 'auto'
                    }}>
                      <button
                        onClick={() => incrementCount('fateh')}
                        style={{
                          flex: 1,
                          padding: 'clamp(20px, 3vh, 30px) clamp(10px, 1.5vw, 15px)',
                          background: 'linear-gradient(135deg, #5fb3b3 0%, #4a9d9d 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: 'clamp(28px, 3.8vw, 42px)',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(95,179,179,0.25)'
                        }}
                      >
                        +
                      </button>

                      <div style={{
                        fontSize: 'clamp(36px, 5vw, 56px)',
                        fontWeight: '800',
                        color: '#333',
                        minWidth: 'clamp(45px, 6vw, 70px)',
                        textAlign: 'center',
                        lineHeight: '1'
                      }}>
                        {fatehCount}
                      </div>

                      <button
                        onClick={() => decrementCount('fateh')}
                        style={{
                          flex: 1,
                          padding: 'clamp(20px, 3vh, 30px) clamp(10px, 1.5vw, 15px)',
                          background: '#95a5a6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: 'clamp(28px, 3.8vw, 42px)',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                        }}
                      >
                        −
                      </button>
                    </div>
                  </div>
                </div>

                {/* TOP RIGHT - Logo, Title, Name, Score, Buttons */}
                <div style={{
                  gridColumn: '2 / 3',
                  gridRow: '1 / 2',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'clamp(6px, 1vh, 10px)',
                  overflow: 'hidden'
                }}>
                  
                  <div style={{
                    width: 'clamp(40px, 6vw, 65px)',
                    height: 'clamp(40px, 6vw, 65px)',
                    margin: '0 auto',
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

                  <h1 style={{
                    fontSize: 'clamp(13px, 1.7vw, 17px)',
                    fontWeight: '600',
                    color: '#666',
                    margin: 0,
                    textAlign: 'center',
                    lineHeight: '1.1',
                    flexShrink: 0
                  }}>
                    تقييم المتسابقين
                  </h1>

                  <div style={{
                    width: '55%',
                    height: '1px',
                    background: 'linear-gradient(to right, transparent, #d0d0d0, transparent)',
                    margin: '0 auto',
                    flexShrink: 0
                  }} />

                  <h2 style={{
                    fontSize: 'clamp(15px, 2.1vw, 23px)',
                    fontWeight: '800',
                    color: '#1a3a3a',
                    margin: 0,
                    lineHeight: '1.1',
                    textAlign: 'center',
                    flexShrink: 0,
                    letterSpacing: '-0.3px'
                  }}>
                    {selectedCompetitor.full_name}
                  </h2>

                  <p style={{
                    fontSize: 'clamp(9px, 1.1vw, 12px)',
                    color: '#666',
                    margin: 0,
                    lineHeight: '1.3',
                    textAlign: 'center',
                    flexShrink: 0
                  }}>
                    {selectedCompetitor.gender === 'male' ? 'ذكر' : 'أنثى'} • {selectedCompetitor.level} • {selectedCompetitor.city}
                  </p>

                  <div style={{
                    background: finalScore >= 95 ? '#d4edda' : finalScore >= 90 ? '#fff3cd' : '#ffebee',
                    padding: 'clamp(18px, 2.8vh, 32px)',
                    borderRadius: '10px',
                    textAlign: 'center',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 0
                  }}>
                    <div style={{
                      fontSize: 'clamp(50px, 7.5vw, 90px)',
                      fontWeight: '800',
                      color: finalScore >= 95 ? '#27ae60' : finalScore >= 90 ? '#f39c12' : '#e74c3c',
                      lineHeight: '1'
                    }}>
                      {finalScore}
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      padding: 'clamp(11px, 1.7vh, 17px)',
                      background: saving ? '#95a5a6' : 'linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: 'clamp(13px, 1.7vw, 17px)',
                      fontWeight: '700',
                      fontFamily: 'Cairo, sans-serif',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      boxShadow: '0 3px 12px rgba(95, 179, 179, 0.25)',
                      flexShrink: 0
                    }}
                  >
                    {saving ? 'جاري الحفظ...' : 'حفظ التقييم'}
                  </button>

                  <button
                    onClick={handlePrintScoreCard}
                    style={{
                      padding: 'clamp(7px, 1.2vh, 11px)',
                      background: '#ffffff',
                      color: '#5fb3b3',
                      border: '1.5px solid #5fb3b3',
                      borderRadius: '8px',
                      fontSize: 'clamp(10px, 1.25vw, 13px)',
                      fontWeight: '700',
                      fontFamily: 'Cairo, sans-serif',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'clamp(4px, 0.5vw, 6px)',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#5fb3b3';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.color = '#5fb3b3';
                    }}
                  >
                    <span>📄</span>
                    <span>طباعة الشهادة PDF</span>
                  </button>

                  <button
                    onClick={handleBackToList}
                    style={{
                      padding: 'clamp(10px, 1.6vh, 14px)',
                      background: '#ffffff',
                      color: '#5fb3b3',
                      border: '1.5px solid #5fb3b3',
                      borderRadius: '8px',
                      fontSize: 'clamp(11px, 1.4vw, 15px)',
                      fontWeight: '700',
                      fontFamily: 'Cairo, sans-serif',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#5fb3b3';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.color = '#5fb3b3';
                    }}
                  >
                    العودة إلى قائمة المتسابقين
                  </button>
                </div>

                {/* BOTTOM LEFT - Evaluation Rules + تشكيل و تجويد */}
                <div style={{
                  gridColumn: '1 / 2',
                  gridRow: '2 / 3',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'clamp(8px, 1.2vw, 14px)',
                  overflow: 'hidden'
                }}>
                  
                  <div style={{
                    background: '#f8f9fa',
                    borderRadius: '10px',
                    padding: 'clamp(10px, 1.5vh, 16px)',
                    border: '1.5px solid #e0e0e0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    flexShrink: 0
                  }}>
                    <h3 style={{
                      fontSize: 'clamp(13px, 1.6vw, 17px)',
                      fontWeight: '700',
                      color: '#1a3a3a',
                      margin: '0 0 clamp(6px, 0.8vh, 10px) 0',
                      textAlign: 'center',
                      lineHeight: '1.2'
                    }}>
                      ضوابط التقييم
                    </h3>
                    <div style={{
                      fontSize: 'clamp(9px, 1.05vw, 11px)',
                      color: '#555',
                      lineHeight: '1.6',
                      textAlign: 'right'
                    }}>
                      <p style={{ margin: '0 0 clamp(3px, 0.5vh, 5px) 0' }}>
                        • يُعطى كل متسابق <strong>3 أسئلة</strong> من القرآن الكريم
                      </p>
                      <p style={{ margin: '0 0 clamp(3px, 0.5vh, 5px) 0' }}>
                        • <strong>تنبيه:</strong> خصم درجة واحدة (-1) لكل خطأ
                      </p>
                      <p style={{ margin: '0 0 clamp(3px, 0.5vh, 5px) 0' }}>
                        • <strong>فتح:</strong> خصم درجتين (-2) لكل خطأ
                      </p>
                      <p style={{ margin: '0 0 clamp(3px, 0.5vh, 5px) 0' }}>
                        • <strong>تشكيل:</strong> خصم درجة واحدة (-1) لكل خطأ
                      </p>
                      <p style={{ margin: 0 }}>
                        • <strong>تجويد:</strong> خصم نصف درجة (-0.5) لكل خطأ
                      </p>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: 'clamp(8px, 1.2vw, 14px)',
                    flex: 1,
                    overflow: 'hidden'
                  }}>
                    
                    <div style={{
                      flex: 1,
                      background: '#ffffff',
                      borderRadius: '10px',
                      padding: 'clamp(10px, 1.5vh, 16px)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                      border: '1.5px solid #e0e0e0',
                      overflow: 'hidden',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ textAlign: 'center', marginBottom: '5px', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 'clamp(16px, 2.1vw, 23px)',
                          fontWeight: '800',
                          color: '#333',
                          marginBottom: '2px',
                          lineHeight: '1'
                        }}>
                          تشكيل
                        </div>
                        <div style={{
                          fontSize: 'clamp(9px, 1vw, 11px)',
                          color: '#888',
                          fontWeight: '400',
                          lineHeight: '1'
                        }}>
                          {tashkeelCount === 0 ? '(-0)' : `(-${tashkeelCount})`}
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'clamp(6px, 1vw, 10px)',
                        flex: 1
                      }}>
                        <button
                          onClick={() => incrementCount('tashkeel')}
                          style={{
                            flex: 1,
                            height: '100%',
                            background: 'linear-gradient(135deg, #5fb3b3 0%, #4a9d9d 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: 'clamp(24px, 3.4vw, 38px)',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(95,179,179,0.25)'
                          }}
                        >
                          +
                        </button>

                        <div style={{
                          fontSize: 'clamp(32px, 4.5vw, 52px)',
                          fontWeight: '800',
                          color: '#333',
                          minWidth: 'clamp(40px, 5.5vw, 65px)',
                          textAlign: 'center',
                          lineHeight: '1'
                        }}>
                          {tashkeelCount}
                        </div>

                        <button
                          onClick={() => decrementCount('tashkeel')}
                          style={{
                            flex: 1,
                            height: '100%',
                            background: '#95a5a6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: 'clamp(24px, 3.4vw, 38px)',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                          }}
                        >
                          −
                        </button>
                      </div>
                    </div>

                    <div style={{
                      flex: 1,
                      background: '#ffffff',
                      borderRadius: '10px',
                      padding: 'clamp(10px, 1.5vh, 16px)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                      border: '1.5px solid #e0e0e0',
                      overflow: 'hidden',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ textAlign: 'center', marginBottom: '5px', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 'clamp(16px, 2.1vw, 23px)',
                          fontWeight: '800',
                          color: '#333',
                          marginBottom: '2px',
                          lineHeight: '1'
                        }}>
                          تجويد
                        </div>
                        <div style={{
                          fontSize: 'clamp(9px, 1vw, 11px)',
                          color: '#888',
                          fontWeight: '400',
                          lineHeight: '1'
                        }}>
                          {tajweedCount === 0 ? '(-0)' : `(-${tajweedCount * 0.5})`}
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'clamp(6px, 1vw, 10px)',
                        flex: 1
                      }}>
                        <button
                          onClick={() => incrementCount('tajweed')}
                          style={{
                            flex: 1,
                            height: '100%',
                            background: 'linear-gradient(135deg, #5fb3b3 0%, #4a9d9d 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: 'clamp(24px, 3.4vw, 38px)',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(95,179,179,0.25)'
                          }}
                        >
                          +
                        </button>

                        <div style={{
                          fontSize: 'clamp(32px, 4.5vw, 52px)',
                          fontWeight: '800',
                          color: '#333',
                          minWidth: 'clamp(40px, 5.5vw, 65px)',
                          textAlign: 'center',
                          lineHeight: '1'
                        }}>
                          {tajweedCount}
                        </div>

                        <button
                          onClick={() => decrementCount('tajweed')}
                          style={{
                            flex: 1,
                            height: '100%',
                            background: '#95a5a6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: 'clamp(24px, 3.4vw, 38px)',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                          }}
                        >
                          −
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  gridColumn: '2 / 3',
                  gridRow: '2 / 3'
                }} />
              </div>
            </>
          )}

          {/* Back to Main Menu from List */}
          {!selectedCompetitor && (
            <button
              onClick={() => router.push('/dashboard')}
              className="back-button"
            >
              العودة للقائمة الرئيسية
            </button>
          )}
        </div>
      </div>

      {/* Back Warning Modal */}
      {showBackWarning && (
        <div className="modal-overlay" onClick={() => setShowBackWarning(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{
              color: '#333333',
              fontSize: '20px',
              fontWeight: '700',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              تحذير
            </h2>

            <p style={{
              color: '#e74c3c',
              fontSize: '15px',
              marginBottom: '20px',
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              ⚠️ لديك تغييرات غير محفوظة. هل تريد المتابعة بدون حفظ؟
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={confirmBack}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  fontFamily: 'Cairo, sans-serif',
                  cursor: 'pointer'
                }}
              >
                نعم، العودة بدون حفظ
              </button>
              <button
                onClick={() => setShowBackWarning(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  fontFamily: 'Cairo, sans-serif',
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}