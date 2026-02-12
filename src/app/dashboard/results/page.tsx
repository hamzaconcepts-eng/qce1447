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

interface Result {
  id: string
  competitor_id: string
  full_name: string
  gender: string
  level: string
  city: string
  mobile: string
  final_score: number
  tanbih_count: number
  fateh_count: number
  tashkeel_count: number
  tajweed_count: number
  evaluator_name: string
  created_at: string
}

type SortField = 'full_name' | 'gender' | 'level' | 'city' | 'final_score'
type SortDirection = 'asc' | 'desc'

export default function ResultsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [filteredResults, setFilteredResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Tab state
  const [activeTab, setActiveTab] = useState<'all' | 'winners'>('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Sorting
  const [sortField, setSortField] = useState<SortField>('final_score')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterScoreRange, setFilterScoreRange] = useState('')

  // Winners filter
  const [winnersGenderFilter, setWinnersGenderFilter] = useState('')

  // Selected results for certificate printing
  const [selectedResults, setSelectedResults] = useState<string[]>([])

  const levels = [
    'المستوى الأول: المرحلة الجامعية | الحج والمؤمنون',
    'المستوى الثاني: الصفوف 10-12 | الشعراء والنمل',
    'المستوى الثالث: الصفوف 7-9 | العنكبوت والروم',
    'المستوى الرابع: الصفوف 4-6 | جزء تبارك',
    'المستوى الخامس: الصفوف 1-3 | جزء عمَّ'
  ]

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      router.push('/')
      return
    }
    const userData = JSON.parse(userStr)
    setUser(userData)
    fetchResults()
  }, [router])

  useEffect(() => {
    applyFilters()
  }, [results, searchTerm, filterGender, filterLevel, filterScoreRange, sortField, sortDirection])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterGender, filterLevel, filterScoreRange])

  // Viewport height fix for mobile
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    setVH()
    window.addEventListener('resize', setVH)
    return () => window.removeEventListener('resize', setVH)
  }, [])

  const fetchResults = async () => {
    try {
      const supabase = createClient()
      
      // Join evaluations with competitors
      const { data, error } = await supabase
        .from('evaluations')
        .select(`
          *,
          competitors (
            full_name,
            gender,
            level,
            city,
            mobile
          )
        `)
        .order('final_score', { ascending: false })

      if (error) throw error

      // Flatten the data
      const flattenedResults = (data || []).map((evaluation: any) => ({
        id: evaluation.id,
        competitor_id: evaluation.competitor_id,
        full_name: evaluation.competitors.full_name,
        gender: evaluation.competitors.gender,
        level: evaluation.competitors.level,
        city: evaluation.competitors.city,
        mobile: evaluation.competitors.mobile,
        final_score: evaluation.final_score,
        tanbih_count: evaluation.tanbih_count,
        fateh_count: evaluation.fateh_count,
        tashkeel_count: evaluation.tashkeel_count,
        tajweed_count: evaluation.tajweed_count,
        evaluator_name: evaluation.evaluator_name,
        created_at: evaluation.created_at
      }))

      setResults(flattenedResults)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching results:', error)
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'final_score' ? 'desc' : 'asc')
    }
  }

  const applyFilters = () => {
    let filtered = [...results]

    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterGender) {
      filtered = filtered.filter(r => r.gender === filterGender)
    }

    if (filterLevel) {
      filtered = filtered.filter(r => r.level === filterLevel)
    }

    if (filterScoreRange) {
      filtered = filtered.filter(r => {
        if (filterScoreRange === 'excellent') return r.final_score >= 95
        if (filterScoreRange === 'very_good') return r.final_score >= 90 && r.final_score < 95
        if (filterScoreRange === 'good') return r.final_score >= 80 && r.final_score < 90
        if (filterScoreRange === 'pass') return r.final_score >= 60 && r.final_score < 80
        if (filterScoreRange === 'fail') return r.final_score < 60
        return true
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === 'gender') {
        aValue = a.gender === 'male' ? 'ذكر' : 'أنثى'
        bValue = b.gender === 'male' ? 'ذكر' : 'أنثى'
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredResults(filtered)
  }

  // Get top 3 for each level and gender (with optional gender filter)
  const getWinners = (genderFilter: string = '') => {
    const winners: { [key: string]: { male: Result[], female: Result[] } } = {}

    levels.forEach(level => {
      const levelResults = results.filter(r => r.level === level)
      
      const maleResults = levelResults
        .filter(r => r.gender === 'male')
        .sort((a, b) => b.final_score - a.final_score)
        .slice(0, 3)
      
      const femaleResults = levelResults
        .filter(r => r.gender === 'female')
        .sort((a, b) => b.final_score - a.final_score)
        .slice(0, 3)
      
      winners[level] = { male: maleResults, female: femaleResults }
    })

    return winners
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentResults = filteredResults.slice(startIndex, endIndex)

  const resetFilters = () => {
    setSearchTerm('')
    setFilterGender('')
    setFilterLevel('')
    setFilterScoreRange('')
  }

  const handlePrintAllResults = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>نتائج المسابقة</title>
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Noto+Kufi+Arabic:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { 
            size: A4 portrait; 
            margin: 10mm;
          }
          body { 
            font-family: 'Noto Kufi Arabic', 'Sora', sans-serif; 
            direction: rtl;
            font-size: 9px;
            line-height: 1.3;
          }
          .header { 
            text-align: center; 
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #333;
          }
          h1 { font-size: 15px; margin-bottom: 4px; }
          .date { font-size: 10px; color: #666; }
          table { 
            width: 100%; 
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 3px 5px; 
            text-align: center;
            font-size: 8px;
          }
          th { 
            background: #f5f5f5; 
            font-weight: 700;
            font-size: 8px;
          }
          .name-col { 
            text-align: right;
          }
          .level-col {
            font-size: 7px;
          }
          .row-num { font-weight: 600; color: #C8A24E; }
          .score-excellent { color: #27ae60; font-weight: 700; }
          .score-very-good { color: #f39c12; font-weight: 700; }
          .score-good { color: #3498db; font-weight: 700; }
          .score-pass { color: #95a5a6; font-weight: 700; }
          .score-fail { color: #e74c3c; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>نتائج مسابقة مركز رياض العلم لحفظ القرآن الكريم</h1>
          <div class="date">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')} | إجمالي: ${filteredResults.length} نتيجة</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px;">الترتيب</th>
              <th>الاسم</th>
              <th style="width: 35px;">الجنس</th>
              <th>المستوى</th>
              <th style="width: 60px;">المدينة</th>
              <th style="width: 65px;">الهاتف</th>
              <th style="width: 40px;">الدرجة</th>
              <th style="width: 30px;">تنبيه</th>
              <th style="width: 30px;">فتح</th>
              <th style="width: 35px;">تشكيل</th>
              <th style="width: 35px;">تجويد</th>
            </tr>
          </thead>
          <tbody>
            ${filteredResults.map((r, i) => `
              <tr>
                <td class="row-num">${i + 1}</td>
                <td class="name-col">${r.full_name}</td>
                <td>${r.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                <td class="level-col">${r.level.split(':')[0]}</td>
                <td>${r.city}</td>
                <td>${r.mobile}</td>
                <td class="${
                  r.final_score >= 95 ? 'score-excellent' :
                  r.final_score >= 90 ? 'score-very-good' :
                  r.final_score >= 80 ? 'score-good' :
                  r.final_score >= 60 ? 'score-pass' : 'score-fail'
                }">${r.final_score}</td>
                <td>${r.tanbih_count}</td>
                <td>${r.fateh_count}</td>
                <td>${r.tashkeel_count}</td>
                <td>${r.tajweed_count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const handlePrintWinners = () => {
    const winners = getWinners()
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Determine which genders to show based on filter
    const showMale = !winnersGenderFilter || winnersGenderFilter === 'male'
    const showFemale = !winnersGenderFilter || winnersGenderFilter === 'female'

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>الفائزون في المسابقة</title>
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Noto+Kufi+Arabic:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { 
            size: A4 portrait; 
            margin: 12mm;
          }
          body { 
            font-family: 'Noto Kufi Arabic', 'Sora', sans-serif; 
            direction: rtl;
            font-size: 10px;
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 3px solid #5fb3b3;
          }
          h1 { 
            font-size: 18px; 
            margin-bottom: 5px;
            color: #1a3a3a;
            font-weight: 800;
          }
          .subtitle {
            font-size: clamp(10px, 2vw, 12px);
            color: #666;
            font-weight: 600;
          }
          .level-section {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          .level-title {
            background: linear-gradient(135deg, #1a3a3a 0%, #5fb3b3 100%);
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: clamp(10px, 2vw, 12px);
            font-weight: 700;
            margin-bottom: 10px;
            text-align: center;
          }
          .gender-group {
            margin-bottom: 12px;
          }
          .gender-title {
            background: #f5f5f5;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: clamp(9px, 1.8vw, 11px);
            font-weight: 700;
            color: #333;
            margin-bottom: 8px;
            border-right: 4px solid #5fb3b3;
          }
          .winner-card {
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 8px 12px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .winner-card.first {
            border-color: #FFD700;
            background: linear-gradient(135deg, #FFF9E6 0%, #FFFEF0 100%);
          }
          .winner-card.second {
            border-color: #C0C0C0;
            background: linear-gradient(135deg, #F5F5F5 0%, #FAFAFA 100%);
          }
          .winner-card.third {
            border-color: #CD7F32;
            background: linear-gradient(135deg, #FFF5E6 0%, #FFFAF0 100%);
          }
          .rank {
            font-size: 20px;
            font-weight: 800;
            min-width: 30px;
          }
          .rank.first { color: #FFD700; }
          .rank.second { color: #C0C0C0; }
          .rank.third { color: #CD7F32; }
          .winner-info {
            flex: 1;
            margin: 0 10px;
          }
          .winner-name {
            font-size: clamp(9px, 1.8vw, 11px);
            font-weight: 700;
            color: #1a3a3a;
            margin-bottom: 2px;
          }
          .winner-details {
            font-size: 9px;
            color: #666;
          }
          .winner-score {
            font-size: 16px;
            font-weight: 800;
            min-width: 50px;
            text-align: center;
          }
          .winner-score.first { color: #27ae60; }
          .winner-score.second { color: #f39c12; }
          .winner-score.third { color: #3498db; }
          .no-winners {
            text-align: center;
            padding: 15px;
            color: #999;
            font-size: 10px;
            font-style: italic;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 2px solid #e0e0e0;
            color: #666;
            font-size: 9px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏆 الفائزون في مسابقة مركز رياض العلم 🏆</h1>
          <div class="subtitle">الدورة الخامسة - رمضان 1447هـ</div>
          ${winnersGenderFilter ? `<div class="subtitle" style="margin-top: 5px;">فئة ${winnersGenderFilter === 'male' ? 'الذكور' : 'الإناث'}</div>` : ''}
          <div class="subtitle" style="margin-top: 5px;">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</div>
        </div>

        ${levels.map(level => {
          const levelWinners = winners[level]
          const hasMaleWinners = showMale && levelWinners.male.length > 0
          const hasFemaleWinners = showFemale && levelWinners.female.length > 0

          return `
            <div class="level-section">
              <div class="level-title">${level}</div>
              
              ${showMale ? `
              <!-- Male Winners -->
              <div class="gender-group">
                <div class="gender-title">🎖️ فئة الذكور</div>
                ${hasMaleWinners ? levelWinners.male.map((winner, index) => `
                  <div class="winner-card ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}">
                    <div class="rank ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}">
                      ${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <div class="winner-info">
                      <div class="winner-name">${winner.full_name}</div>
                      <div class="winner-details">${winner.city} • ${winner.mobile}</div>
                    </div>
                    <div class="winner-score ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}">
                      ${winner.final_score}
                    </div>
                  </div>
                `).join('') : '<div class="no-winners">لا يوجد فائزون</div>'}
              </div>
              ` : ''}

              ${showFemale ? `
              <!-- Female Winners -->
              <div class="gender-group">
                <div class="gender-title">🎖️ فئة الإناث</div>
                ${hasFemaleWinners ? levelWinners.female.map((winner, index) => `
                  <div class="winner-card ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}">
                    <div class="rank ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}">
                      ${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <div class="winner-info">
                      <div class="winner-name">${winner.full_name}</div>
                      <div class="winner-details">${winner.city} • ${winner.mobile}</div>
                    </div>
                    <div class="winner-score ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}">
                      ${winner.final_score}
                    </div>
                  </div>
                `).join('') : '<div class="no-winners">لا يوجد فائزات</div>'}
              </div>
              ` : ''}
            </div>
          `
        }).join('')}

        <div class="footer">
          مبارك للفائزين • نسأل الله أن يتقبل من الجميع
        </div>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }


  // Certificate printing - ALL in ONE PDF
  const handlePrintCertificates = () => {
    if (selectedResults.length === 0) {
      alert('الرجاء اختيار متسابق واحد على الأقل')
      return
    }

    const selectedCompetitors = results.filter(r => selectedResults.includes(r.id))
    
    // Open one window for all certificates
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const now = new Date()
    const gregorianDate = now.toLocaleDateString('ar-SA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    const hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Build all certificates in one HTML
    const certificatesHTML = selectedCompetitors.map((competitor, index) => {
      const tanbihCount = competitor.tanbih_count
      const fatehCount = competitor.fateh_count
      const tashkeelCount = competitor.tashkeel_count
      const tajweedCount = competitor.tajweed_count
      const finalScore = competitor.final_score

      return `<div class="certificate" style="${index > 0 ? 'page-break-before: always;' : ''}"><div class="header"><div class="logo"><img src="/images/logo.svg" alt="شعار مركز رياض العلم"></div><h1>مسابقة مركز رياض العلم</h1><div class="subtitle">لحفظ القرآن الكريم</div><div class="edition">• الدورة الخامسة - رمضان 1447هـ •</div></div><div class="content"><div class="cert-title">شهادة تقييم</div><div class="participant-name">${competitor.full_name}</div><div class="details-grid"><div class="detail-card"><div class="detail-label">الولاية</div><div class="detail-value">${competitor.city}</div></div><div class="detail-card"><div class="detail-label">المستوى</div><div class="detail-value">${competitor.level}</div></div></div><div class="score-breakdown-container"><div class="score-section"><div class="score-label">• الدرجة النهائية •</div><div class="final-score ${finalScore >= 95 ? 'score-green' : finalScore >= 90 ? 'score-yellow' : 'score-red'}">${finalScore}</div><div class="signature-section"><div class="signature-space"></div><div class="signature-line"></div><div class="signature-name">مركز رياض العلم</div></div></div><div class="breakdown-side"><div class="breakdown-title">تفصيل الأخطاء</div><div class="breakdown-item"><div class="breakdown-label">تنبيه</div><div class="breakdown-value"><div class="breakdown-count">${tanbihCount}</div><div class="breakdown-deduction">-${tanbihCount} درجة</div></div></div><div class="breakdown-item"><div class="breakdown-label">فتح</div><div class="breakdown-value"><div class="breakdown-count">${fatehCount}</div><div class="breakdown-deduction">-${fatehCount * 2} درجة</div></div></div><div class="breakdown-item"><div class="breakdown-label">تشكيل</div><div class="breakdown-value"><div class="breakdown-count">${tashkeelCount}</div><div class="breakdown-deduction">-${tashkeelCount} درجة</div></div></div><div class="breakdown-item"><div class="breakdown-label">تجويد</div><div class="breakdown-value"><div class="breakdown-count">${tajweedCount}</div><div class="breakdown-deduction">-${tajweedCount * 0.5} درجة</div></div></div></div></div></div><div class="footer"><div class="footer-dates"><div class="footer-date">التاريخ الهجري: ${hijriDate}</div><div class="footer-date">التاريخ الميلادي: ${gregorianDate}</div></div></div></div>`
    }).join('')

    const fullHTML = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>شهادات التقييم - ${selectedCompetitors.length} متسابق</title><link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Noto+Kufi+Arabic:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"><style>* { margin: 0; padding: 0; box-sizing: border-box; }@page { size: A4; margin: 0; }body { font-family: 'Noto Kufi Arabic', 'Sora', -apple-system, BlinkMacSystemFont, sans-serif; direction: rtl; background: white; margin: 0; padding: 0; }.certificate { background: white; width: 210mm; height: 297mm; position: relative; page-break-inside: avoid; margin: 0; padding: 0; display: flex; flex-direction: column; }.certificate::before, .certificate::after { content: ''; position: absolute; width: 30px; height: 30px; border: 1.5px solid #C8A24E; opacity: 0.25; z-index: 10; }.certificate::before { top: 15px; right: 15px; border-bottom: none; border-left: none; }.certificate::after { bottom: 15px; left: 15px; border-top: none; border-right: none; }.header { background: linear-gradient(135deg, #0B1F0E 0%, #C8A24E 100%); padding: 30px 30px 25px; text-align: center; }.logo { width: 65px; height: 65px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; }.logo img { width: 100%; height: 100%; object-fit: contain; filter: brightness(0) invert(1); }.header h1 { color: white; font-size: 20px; font-weight: 700; margin-bottom: 6px; }.header .subtitle { color: rgba(255,255,255,0.95); font-size: 15px; font-weight: 500; margin-bottom: 8px; }.header .edition { color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 600; letter-spacing: 0.5px; }.content { padding: 30px 40px 20px; flex: 1; display: flex; flex-direction: column; }.cert-title { text-align: center; font-size: 18px; font-weight: 700; color: #C8A24E; margin-bottom: 20px; letter-spacing: 1.5px; }.participant-name { font-size: 22px; font-weight: 800; color: #0B1F0E; text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #C8A24E; }.details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; max-width: 500px; margin-left: auto; margin-right: auto; }.detail-card { background: #f8f9fa; padding: 10px 15px; border-radius: 6px; border-right: 3px solid #C8A24E; text-align: right; }.detail-label { font-size: 11px; color: #6c757d; margin-bottom: 4px; font-weight: 600; }.detail-value { font-size: 14px; color: #0B1F0E; font-weight: 700; }.score-breakdown-container { margin: 20px 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: 25px; align-items: stretch; flex: 1; }.score-section { text-align: center; display: flex; flex-direction: column; justify-content: space-between; height: 100%; }.score-label { font-size: 13px; color: #495057; margin-bottom: 12px; font-weight: 700; }.final-score { font-size: 68px; font-weight: 900; padding: 25px; border-radius: 10px; box-shadow: 0 3px 12px rgba(0,0,0,0.06); }.score-green { background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); color: #155724; border: 2px solid #28a745; }.score-yellow { background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%); color: #856404; border: 2px solid #ffc107; }.score-red { background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); color: #721c24; border: 2px solid #dc3545; }.signature-section { margin-top: 12px; padding-top: 0; text-align: center; }.signature-space { height: 20px; margin-bottom: 4px; }.signature-line { border-top: 1.5px solid #0B1F0E; width: 170px; margin: 0 auto 6px; }.signature-name { font-size: 12px; color: #495057; font-weight: 600; }.breakdown-side { display: flex; flex-direction: column; gap: 10px; height: 100%; justify-content: space-between; }.breakdown-title { font-size: 13px; font-weight: 700; color: #495057; margin-bottom: 6px; text-align: right; }.breakdown-item { background: white; padding: 10px 14px; border-radius: 6px; border: 1.5px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,0.02); }.breakdown-label { font-size: 13px; font-weight: 700; color: #495057; }.breakdown-value { text-align: left; }.breakdown-count { font-size: 18px; font-weight: 800; color: #0B1F0E; }.breakdown-deduction { font-size: 10px; color: #6c757d; font-weight: 600; }.footer { margin-top: auto; background: #f8f9fa; padding: 15px 40px; text-align: center; border-top: 1px solid #dee2e6; }.footer-dates { display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; }.footer-date { color: #6c757d; font-size: 11px; font-weight: 600; }@media print { body { margin: 0; padding: 0; }.certificate { box-shadow: none; page-break-inside: avoid; page-break-after: always; }@page { size: A4; margin: 0; }}</style></head><body>${certificatesHTML}</body></html>`

    printWindow.document.write(fullHTML)
    printWindow.document.close()
    
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const toggleSelectAll = () => {
    if (selectedResults.length === currentResults.length) {
      setSelectedResults([])
    } else {
      setSelectedResults(currentResults.map(r => r.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedResults.includes(id)) {
      setSelectedResults(selectedResults.filter(rid => rid !== id))
    } else {
      setSelectedResults([...selectedResults, id])
    }
  }

  if (!user) return null

  const winners = getWinners()

  return (
    <>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Noto+Kufi+Arabic:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: calc(var(--vh, 1vh) * 100); width: 100vw; overflow: hidden; }
        body {
          background: #0A0F0A;
          font-family: 'Noto Kufi Arabic', 'Sora', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #F0FDF4;
          -webkit-font-smoothing: antialiased;
          min-height: calc(var(--vh, 1vh) * 100);
        }
        .bg-canvas { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; overflow: hidden; pointer-events: none; }
        .bg-orb { position: absolute; border-radius: 50%; filter: blur(120px); opacity: 0.3; }
        .bg-orb.green-1 { width: 500px; height: 500px; background: radial-gradient(circle, #22C55E, transparent 70%); bottom: -15%; left: 20%; animation: orbPulse1 15s ease-in-out infinite alternate; }
        .bg-orb.green-2 { width: 350px; height: 350px; background: radial-gradient(circle, #166534, transparent 70%); top: 10%; right: -5%; animation: orbPulse2 20s ease-in-out infinite alternate; }
        .bg-orb.gold-1 { width: 400px; height: 400px; background: radial-gradient(circle, #C8A24E, transparent 70%); top: 35%; left: -8%; opacity: 0.18; animation: orbPulse3 18s ease-in-out infinite alternate; }
        .bg-orb.gold-2 { width: 300px; height: 300px; background: radial-gradient(circle, #D4AF5E, transparent 70%); bottom: 20%; right: -5%; opacity: 0.12; animation: orbPulse2 22s ease-in-out infinite alternate; }
        @keyframes orbPulse1 { 0% { transform: translate(0,0) scale(1); opacity: 0.25; } 50% { transform: translate(30px,-20px) scale(1.15); opacity: 0.35; } 100% { transform: translate(-20px,10px) scale(0.95); opacity: 0.2; } }
        @keyframes orbPulse2 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(-40px,30px) scale(1.1); } }
        @keyframes orbPulse3 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(30px,-20px) scale(1.08); } }
        .bg-canvas::after { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34,197,94,0.012) 2px, rgba(34,197,94,0.012) 4px); pointer-events: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(34,197,94,0.05); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(200,162,78,0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(200,162,78,0.5); }

        .app-container {
          background: rgba(34,197,94,0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(34,197,94,0.15);
          padding: clamp(15px, 3vw, 30px);
          border-radius: clamp(20px, 3vh, 32px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 80px rgba(34,197,94,0.05);
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }
        .compact-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: clamp(10px, 2vw, 12px); }
        .compact-table th, .compact-table td { padding: clamp(4px, 1vw, 6px) clamp(4px, 1.5vw, 8px); text-align: center; border-bottom: 1px solid rgba(34,197,94,0.1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .compact-table th { background: rgba(200,162,78,0.1); font-weight: 700; color: #C8A24E; position: sticky; top: 0; z-index: 10; font-size: clamp(9px, 1.8vw, 11px); cursor: pointer; user-select: none; letter-spacing: 0.3px; backdrop-filter: blur(10px); }
        .compact-table th:hover { background: rgba(200,162,78,0.18); }
        .compact-table .name-cell { text-align: right; font-weight: 600; color: #F0FDF4; max-width: 180px; }
        .compact-table .level-cell { font-size: 10px; max-width: 120px; color: rgba(240,253,244,0.7); }
        .compact-table tbody tr { transition: all 0.2s; }
        .compact-table tbody tr:hover { background: rgba(200,162,78,0.08); }
        .compact-table tbody tr td { color: rgba(240,253,244,0.8); }
        .sort-indicator { display: inline-block; margin-left: 4px; font-size: 10px; color: #D4AF5E; }
        .pagination { display: flex; gap: 5px; justify-content: center; align-items: center; margin-top: 20px; }
        .page-button { padding: 6px 12px; border: 1px solid rgba(200,162,78,0.3); background: rgba(200,162,78,0.06); color: #D4AF5E; cursor: pointer; border-radius: clamp(6px, 0.8vh, 8px); font-family: 'Noto Kufi Arabic', 'Sora', sans-serif; font-size: 13px; font-weight: 600; transition: all 0.2s; backdrop-filter: blur(10px); }
        .page-button:hover { background: rgba(200,162,78,0.15); border-color: rgba(200,162,78,0.5); }
        .page-button.active { background: linear-gradient(135deg, #B8922E, #D4AF5E); color: #0A0F0A; border-color: transparent; box-shadow: 0 4px 16px rgba(200,162,78,0.4); }
        .page-button:disabled { opacity: 0.35; cursor: not-allowed; }
        .back-button { width: 100%; margin-top: 20px; padding: 12px; background: transparent; color: #D4AF5E; border: 1px solid rgba(200,162,78,0.3); border-radius: clamp(8px, 1.2vh, 12px); font-size: 15px; font-weight: 700; font-family: 'Noto Kufi Arabic', 'Sora', sans-serif; cursor: pointer; transition: all 0.2s; opacity: 0.7; }
        .back-button:hover { background: rgba(200,162,78,0.08); opacity: 1; border-color: rgba(200,162,78,0.5); }
        .tab-button { flex: 1; padding: 12px 20px; border: none; background: rgba(200,162,78,0.06); color: rgba(240,253,244,0.5); font-size: 15px; font-weight: 600; font-family: 'Noto Kufi Arabic', 'Sora', sans-serif; cursor: pointer; transition: all 0.3s; border-bottom: 3px solid transparent; }
        .tab-button.active { background: rgba(34,197,94,0.08); color: #C8A24E; border-bottom-color: #C8A24E; }
        .tab-button:hover { background: rgba(200,162,78,0.1); }
        .winner-card { background: rgba(34,197,94,0.04); border: 1px solid rgba(34,197,94,0.15); border-radius: 12px; padding: 15px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; backdrop-filter: blur(10px); }
        .winner-card:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        .winner-card.first { border-color: rgba(255,215,0,0.4); background: rgba(255,215,0,0.06); }
        .winner-card.second { border-color: rgba(192,192,192,0.3); background: rgba(192,192,192,0.06); }
        .winner-card.third { border-color: rgba(205,127,50,0.3); background: rgba(205,127,50,0.06); }
        .checkbox-column { width: 40px; text-align: center; }
        .checkbox-column input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; margin: 0; }
      `}</style>

      {/* Animated Background */}
      <div className="bg-canvas">
        <div className="bg-orb green-1"></div>
        <div className="bg-orb green-2"></div>
        <div className="bg-orb gold-1"></div>
        <div className="bg-orb gold-2"></div>
      </div>

      <div style={{
        minHeight: 'calc(var(--vh, 1vh) * 100)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'clamp(10px, 2vh, 20px)',
        position: 'relative',
        zIndex: 1
      }}>
        <div className="app-container">
          
          {/* Header */}
          {/* Back Button - Top */}
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%',
              marginBottom: 'clamp(15px, 3vw, 20px)',
              padding: 'clamp(10px, 2.5vw, 14px)',
              background: 'transparent',
              color: '#D4AF5E',
              border: '1px solid rgba(200, 162, 78, 0.3)',
              borderRadius: 'clamp(8px, 1.2vh, 12px)',
              fontSize: 'clamp(13px, 3vw, 16px)',
              fontWeight: '700',
              fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.2s',
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
            العودة للقائمة الرئيسية
          </button>

          <div style={{ marginBottom: '25px', textAlign: 'center' }}>
            <div style={{ width: 'clamp(45px, 7vw, 60px)', height: 'clamp(45px, 7vw, 60px)', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'linear-gradient(135deg, #0B1F0E, #0A0F0A)', border: '2px solid #C8A24E', boxShadow: '0 0 28px rgba(200,162,78,0.3), 0 0 8px rgba(200,162,78,0.2)' }}>
              <Image
                src="/images/logo.svg"
                alt="Logo"
                width={50}
                height={50}
                style={{ width: '70%', height: '70%', objectFit: 'contain', filter: 'brightness(0) saturate(100%) invert(79%) sepia(18%) saturate(1234%) hue-rotate(359deg) brightness(95%) contrast(88%)' }}
                priority
              />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '5px', background: 'linear-gradient(135deg, #C8A24E, #E0C478, #D4AF5E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              نتائج المسابقة
            </h1>
            {activeTab === 'all' && (
              <p style={{ color: 'rgba(240, 253, 244, 0.5)', fontSize: '13px' }}>
                إجمالي: {filteredResults.length} نتيجة | الصفحة {currentPage} من {totalPages}
              </p>
            )}
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '0',
            marginBottom: '0',
            borderRadius: '10px 10px 0 0',
            overflow: 'hidden',
            border: '1px solid rgba(200, 162, 78, 0.2)',
            borderBottom: 'none'
          }}>
            <button
              className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              جميع النتائج
            </button>
            <button
              className={`tab-button ${activeTab === 'winners' ? 'active' : ''}`}
              onClick={() => setActiveTab('winners')}
            >
              🏆 الفائزون
            </button>
          </div>

          {/* Tab Content */}
          <div style={{
            border: '1px solid rgba(200, 162, 78, 0.2)',
            borderRadius: '0 0 10px 10px',
            padding: '20px',
            minHeight: '400px'
          }}>

            {/* All Results Tab */}
            {activeTab === 'all' && (
              <>
                {/* Search & Filters */}
                <div style={{ marginBottom: '20px' }}>
                  <input
                    type="text"
                    placeholder="بحث بالاسم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid rgba(200, 162, 78, 0.25)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      textAlign: 'right',
                      fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
                      marginBottom: '10px',
                      background: 'rgba(200, 162, 78, 0.06)',
                      color: '#F0FDF4',
                      outline: 'none'
                    }}
                  />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                    <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} style={{ padding: '8px', border: '1px solid rgba(200, 162, 78, 0.25)', borderRadius: '6px', fontSize: '13px', fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', cursor: 'pointer', background: 'rgba(200, 162, 78, 0.06)', color: '#F0FDF4', outline: 'none' }}>
                      <option value="" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>كل الأجناس</option>
                      <option value="male" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>ذكر</option>
                      <option value="female" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>أنثى</option>
                    </select>

                    <select value={filterScoreRange} onChange={(e) => setFilterScoreRange(e.target.value)} style={{ padding: '8px', border: '1px solid rgba(200, 162, 78, 0.25)', borderRadius: '6px', fontSize: '13px', fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', cursor: 'pointer', background: 'rgba(200, 162, 78, 0.06)', color: '#F0FDF4', outline: 'none' }}>
                      <option value="" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>كل الدرجات</option>
                      <option value="excellent" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>ممتاز (95-100)</option>
                      <option value="very_good" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>جيد جداً (90-94)</option>
                      <option value="good" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>جيد (80-89)</option>
                      <option value="pass" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>مقبول (60-79)</option>
                      <option value="fail" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>راسب (&lt;60)</option>
                    </select>

                    <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} style={{ padding: '8px', border: '1px solid rgba(200, 162, 78, 0.25)', borderRadius: '6px', fontSize: '13px', fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', cursor: 'pointer', gridColumn: 'span 2', background: 'rgba(200, 162, 78, 0.06)', color: '#F0FDF4', outline: 'none' }}>
                      <option value="" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>كل المستويات</option>
                      {levels.map(level => (
                        <option key={level} value={level} style={{ background: '#0A0F0A', color: '#F0FDF4' }}>{level}</option>
                      ))}
                    </select>

                    <button onClick={resetFilters} style={{ gridColumn: 'span 2', padding: '8px', background: 'rgba(200, 162, 78, 0.08)', color: 'rgba(240, 253, 244, 0.5)', border: '1px solid rgba(200, 162, 78, 0.15)', borderRadius: '6px', fontSize: '13px', fontWeight: '600', fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', cursor: 'pointer', transition: 'all 0.2s' }}>
                      إعادة تعيين
                    </button>
                  </div>
                </div>

                {/* Print Buttons */}
                <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={handlePrintAllResults} 
                    style={{ 
                      padding: '8px 15px', 
                      background: 'linear-gradient(135deg, #166534, #22C55E)', 
                      color: '#FFFFFF', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontSize: '13px', 
                      fontWeight: '700', 
                      fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', 
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)',
                      transition: 'all 0.2s' 
                    }}
                  >
                    طباعة النتائج
                  </button>
                  
                  {selectedResults.length > 0 && (
                    <button 
                      onClick={handlePrintCertificates}
                      style={{ 
                        padding: '8px 15px', 
                        background: 'linear-gradient(135deg, #B8922E, #D4AF5E)', 
                        color: '#0A0F0A', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontSize: '13px', 
                        fontWeight: '700', 
                        fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', 
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(200,162,78,0.3)',
                        transition: 'all 0.2s'
                      }}
                    >
                      طباعة الشهادات ({selectedResults.length})
                    </button>
                  )}
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  {loading && <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(240, 253, 244, 0.5)' }}>جاري التحميل...</div>}

                  {!loading && filteredResults.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(240, 253, 244, 0.4)' }}>لا توجد نتائج</div>
                  )}

                  {!loading && currentResults.length > 0 && (
                    <table className="compact-table">
                      <thead>
                        <tr>
                          <th className="checkbox-column">
                            <input
                              type="checkbox"
                              checked={selectedResults.length === currentResults.length && currentResults.length > 0}
                              onChange={toggleSelectAll}
                              title="تحديد الكل"
                            />
                          </th>
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
                          <th style={{ width: '85px' }}>الهاتف</th>
                          <th style={{ width: '70px' }} onClick={() => handleSort('final_score')}>
                            الدرجة
                            {sortField === 'final_score' && (
                              <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </th>
                          <th style={{ width: '50px' }}>تنبيه</th>
                          <th style={{ width: '50px' }}>فتح</th>
                          <th style={{ width: '50px' }}>تشكيل</th>
                          <th style={{ width: '50px' }}>تجويد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentResults.map((result, index) => (
                          <tr key={result.id}>
                            <td className="checkbox-column">
                            <input
                              type="checkbox"
                              checked={selectedResults.includes(result.id)}
                              onChange={() => toggleSelect(result.id)}
                            />
                          </td>
                            <td className="name-cell">{result.full_name}</td>
                            <td>{result.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                            <td className="level-cell">{result.level.split(':')[0]}</td>
                            <td>{result.city}</td>
                            <td style={{ direction: 'ltr' }}>{result.mobile}</td>
                            <td>
                              <span style={{
                                fontWeight: '700',
                                fontSize: '12px',
                                color: result.final_score >= 95 ? '#4ADE80' : 
                                      result.final_score >= 90 ? '#D4AF5E' : '#FCA5A5'
                              }}>
                                {result.final_score}
                              </span>
                            </td>
                            <td style={{ fontSize: '11px' }}>{result.tanbih_count}</td>
                            <td style={{ fontSize: '11px' }}>{result.fateh_count}</td>
                            <td style={{ fontSize: '11px' }}>{result.tashkeel_count}</td>
                            <td style={{ fontSize: '11px' }}>{result.tajweed_count}</td>
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
            )}

            {/* Winners Tab */}
            {activeTab === 'winners' && (
              <>
                {/* Winners Filter & Print */}
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <select 
                    value={winnersGenderFilter} 
                    onChange={(e) => setWinnersGenderFilter(e.target.value)} 
                    style={{ 
                      padding: '10px 15px', 
                      border: '1px solid rgba(200, 162, 78, 0.25)', 
                      borderRadius: '8px', 
                      fontSize: '14px', 
                      fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', 
                      cursor: 'pointer',
                      minWidth: '150px',
                      background: 'rgba(200, 162, 78, 0.06)',
                      color: '#F0FDF4',
                      outline: 'none'
                    }}
                  >
                    <option value="" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>كل الفئات</option>
                    <option value="male" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>الذكور فقط</option>
                    <option value="female" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>الإناث فقط</option>
                  </select>

                  <button 
                    onClick={handlePrintWinners} 
                    style={{ 
                      padding: '10px 20px', 
                      background: 'linear-gradient(135deg, #B8922E, #D4AF5E)', 
                      color: '#0A0F0A', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontSize: '15px', 
                      fontWeight: '700', 
                      fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', 
                      cursor: 'pointer', 
                      boxShadow: '0 4px 16px rgba(200,162,78,0.4)',
                      transition: 'all 0.2s' 
                    }}
                  >
                    🖨️ طباعة قائمة الفائزين
                  </button>
                </div>

                {/* Winners by Level */}
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {levels.map(level => {
                    const levelWinners = winners[level]
                    const showMale = !winnersGenderFilter || winnersGenderFilter === 'male'
                    const showFemale = !winnersGenderFilter || winnersGenderFilter === 'female'
                    const hasMaleWinners = showMale && levelWinners.male.length > 0
                    const hasFemaleWinners = showFemale && levelWinners.female.length > 0

                    // Skip level if no winners match filter
                    if (!hasMaleWinners && !hasFemaleWinners) return null

                    return (
                      <div key={level} style={{ marginBottom: '30px' }}>
                        <h3 style={{
                          background: 'linear-gradient(135deg, rgba(200, 162, 78, 0.15), rgba(34, 197, 94, 0.1))',
                          color: '#C8A24E',
                          border: '1px solid rgba(200, 162, 78, 0.2)',
                          backdropFilter: 'blur(10px)',
                          padding: '12px 15px',
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontWeight: '700',
                          marginBottom: '15px',
                          textAlign: 'center'
                        }}>
                          {level}
                        </h3>

                        {/* Male Winners */}
                        {showMale && (
                          <div style={{ marginBottom: '20px' }}>
                            <h4 style={{
                              background: 'rgba(34, 197, 94, 0.06)',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: 'rgba(240, 253, 244, 0.7)',
                              marginBottom: '10px',
                              borderRight: '4px solid #C8A24E'
                            }}>
                              🎖️ فئة الذكور
                            </h4>
                            
                            {hasMaleWinners ? (
                              levelWinners.male.map((winner, index) => (
                                <div key={winner.id} className={`winner-card ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}`}>
                                  <div style={{
                                    fontSize: '28px',
                                    fontWeight: '800',
                                    minWidth: '40px',
                                    color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
                                  }}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                  </div>
                                  <div style={{ flex: 1, margin: '0 15px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#F0FDF4', marginBottom: '4px' }}>
                                      {winner.full_name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'rgba(240, 253, 244, 0.5)' }}>
                                      {winner.city} • {winner.mobile}
                                    </div>
                                  </div>
                                  <div style={{
                                    fontSize: '22px',
                                    fontWeight: '800',
                                    minWidth: '60px',
                                    textAlign: 'center',
                                    color: index === 0 ? '#4ADE80' : index === 1 ? '#D4AF5E' : '#60A5FA'
                                  }}>
                                    {winner.final_score}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(240, 253, 244, 0.3)', fontSize: '13px', fontStyle: 'italic' }}>
                                لا يوجد فائزون
                              </div>
                            )}
                          </div>
                        )}

                        {/* Female Winners */}
                        {showFemale && (
                          <div>
                            <h4 style={{
                              background: 'rgba(34, 197, 94, 0.06)',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: 'rgba(240, 253, 244, 0.7)',
                              marginBottom: '10px',
                              borderRight: '4px solid #C8A24E'
                            }}>
                              🎖️ فئة الإناث
                            </h4>
                            
                            {hasFemaleWinners ? (
                              levelWinners.female.map((winner, index) => (
                                <div key={winner.id} className={`winner-card ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}`}>
                                  <div style={{
                                    fontSize: '28px',
                                    fontWeight: '800',
                                    minWidth: '40px',
                                    color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'
                                  }}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                  </div>
                                  <div style={{ flex: 1, margin: '0 15px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#F0FDF4', marginBottom: '4px' }}>
                                      {winner.full_name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'rgba(240, 253, 244, 0.5)' }}>
                                      {winner.city} • {winner.mobile}
                                    </div>
                                  </div>
                                  <div style={{
                                    fontSize: '22px',
                                    fontWeight: '800',
                                    minWidth: '60px',
                                    textAlign: 'center',
                                    color: index === 0 ? '#4ADE80' : index === 1 ? '#D4AF5E' : '#60A5FA'
                                  }}>
                                    {winner.final_score}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(240, 253, 244, 0.3)', fontSize: '13px', fontStyle: 'italic' }}>
                                لا يوجد فائزات
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Back Button */}
          <button onClick={() => router.push('/dashboard')} className="back-button">
            العودة للقائمة الرئيسية
          </button>
        </div>
      </div>
    </>
  )
}