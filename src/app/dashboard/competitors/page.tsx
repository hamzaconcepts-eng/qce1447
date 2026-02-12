'use client'

import React, { useEffect, useState } from 'react'
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

type SortField = 'full_name' | 'gender' | 'level' | 'city' | 'status'
type SortDirection = 'asc' | 'desc'

export default function CompetitorsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Sorting
  const [sortField, setSortField] = useState<SortField>('full_name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'single' | 'selected' | 'all'>('single')
  const [deletePassword, setDeletePassword] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false)

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
    if (userData.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    setUser(userData)
    fetchCompetitors()
  }, [router])

  const filteredCompetitors = React.useMemo(() => {
    let filtered = [...competitors]

    if (searchTerm) {
      filtered = filtered.filter(c => {
        const searchLower = searchTerm.toLowerCase().trim()
        const nameLower = c.full_name.toLowerCase()
        
        // Direct match (includes)
        if (nameLower.includes(searchLower)) return true
        
        // Phone match
        if (c.mobile.includes(searchTerm)) return true
        
        // Smart name matching - split search terms and check all words
        const searchWords = searchLower.split(/\s+/)
        const nameWords = nameLower.split(/\s+/)
        
        // Check if all search words exist in name (any order)
        const allWordsMatch = searchWords.every((searchWord: string) =>
          nameWords.some((nameWord: string) => nameWord.includes(searchWord))
        )
        
        return allWordsMatch
      })
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

    return filtered
  }, [competitors, searchTerm, filterGender, filterLevel, filterStatus, sortField, sortDirection])

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1)
  }, [searchTerm, filterGender, filterLevel, filterStatus])

  const fetchCompetitors = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setCompetitors(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching competitors:', error)
      setLoading(false)
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredCompetitors.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCompetitors = filteredCompetitors.slice(startIndex, endIndex)

  const handleDelete = (id: string) => {
    setDeletingId(id)
    setDeleteMode('single')
    setShowDeleteModal(true)
  }

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      alert('يرجى اختيار متسابقين للحذف')
      return
    }
    setDeleteMode('selected')
    setShowDeleteModal(true)
  }

  const handleDeleteAll = () => {
    setDeleteMode('all')
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (deletePassword !== '9999') {
      alert('كلمة المرور غير صحيحة')
      return
    }

    setIsDeleting(true)

    try {
      const supabase = createClient()
      
      // Collect IDs to delete
      let idsToDelete: string[] = []

      if (deleteMode === 'single' && deletingId) {
        idsToDelete = [deletingId]
      } else if (deleteMode === 'selected') {
        idsToDelete = Array.from(selectedIds)
      } else if (deleteMode === 'all') {
        idsToDelete = competitors.map(c => c.id)
      }

      // Delete from database
      for (const id of idsToDelete) {
        const { error } = await supabase
          .from('competitors')
          .delete()
          .eq('id', id)
        
        if (error) {
          console.error('Error deleting competitor:', id, error)
        }
      }

      // Re-fetch fresh data from server
      const { data: freshData, error: fetchError } = await supabase
        .from('competitors')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      
      const newData = freshData || []

      // Close modal FIRST, then update data
      setShowDeleteModal(false)
      setDeletePassword('')
      setDeletingId(null)
      setIsDeleting(false)
      setSelectedIds(new Set())
      setCurrentPage(1)

      // Update competitors - this will trigger the applyFilters useEffect
      setCompetitors(newData)
      
      // Show non-blocking success toast
      setShowDeleteSuccess(true)
      setTimeout(() => setShowDeleteSuccess(false), 3000)
      
    } catch (error) {
      console.error('Error deleting:', error)
      setIsDeleting(false)
      alert('حدث خطأ أثناء الحذف. يرجى المحاولة مرة أخرى.')
    }
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === currentCompetitors.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(currentCompetitors.map(c => c.id)))
    }
  }

  const resetFilters = () => {
    setSearchTerm('')
    setFilterGender('')
    setFilterLevel('')
    setFilterStatus('')
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>قائمة المتسابقين</title>
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Noto+Kufi+Arabic:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { 
            size: A4 portrait; 
            margin: 10mm;
          }
          body { 
            font-family: 'Noto Kufi Arabic', 'Sora', -apple-system, BlinkMacSystemFont, sans-serif; 
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
        </style>
      </head>
      <body>
        <div class="header">
          <h1>قائمة المتسابقين - مسابقة مركز رياض العلم</h1>
          <div class="date">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')} | إجمالي: ${filteredCompetitors.length} متسابق</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>الاسم</th>
              <th style="width: 45px;">الجنس</th>
              <th>المستوى</th>
              <th style="width: 70px;">المدينة</th>
              <th style="width: 70px;">الهاتف</th>
              <th style="width: 65px;">الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${filteredCompetitors.map((c, i) => `
              <tr>
                <td class="row-num">${i + 1}</td>
                <td class="name-col">${c.full_name}</td>
                <td>${c.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                <td class="level-col">${c.level.split(':')[0]}</td>
                <td>${c.city}</td>
                <td>${c.mobile}</td>
                <td>${c.status === 'evaluated' ? 'تم التقييم' : 'لم يتم التقييم'}</td>
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

  if (!user) return null

  return (
    <>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Noto+Kufi+Arabic:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <style jsx global>{`
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
        @keyframes orbPulse1 { 0% { transform: translate(0, 0) scale(1); opacity: 0.25; } 50% { transform: translate(30px, -20px) scale(1.15); opacity: 0.35; } 100% { transform: translate(-20px, 10px) scale(0.95); opacity: 0.2; } }
        @keyframes orbPulse2 { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(-40px, 30px) scale(1.1); } }
        @keyframes orbPulse3 { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(30px, -20px) scale(1.08); } }
        .bg-canvas::after { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 197, 94, 0.012) 2px, rgba(34, 197, 94, 0.012) 4px); pointer-events: none; }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(34, 197, 94, 0.05); border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(200, 162, 78, 0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(200, 162, 78, 0.5); }
        
        .app-container {
          background: rgba(34, 197, 94, 0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(34, 197, 94, 0.15);
          padding: 30px;
          border-radius: clamp(20px, 3vh, 32px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 80px rgba(34, 197, 94, 0.05);
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        .compact-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 12px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 10px;
          overflow: hidden;
        }

        .compact-table th,
        .compact-table td {
          padding: 6px 8px;
          text-align: center;
          border-bottom: 1px solid rgba(200, 162, 78, 0.12);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .compact-table th {
          background: linear-gradient(135deg, #0B1F0E, #166534);
          font-weight: 700;
          color: #FFFFFF;
          position: sticky;
          top: 0;
          z-index: 10;
          font-size: 11px;
          cursor: pointer;
          user-select: none;
          letter-spacing: 0.3px;
        }

        .compact-table th:hover {
          background: linear-gradient(135deg, #166534, #0B1F0E);
        }

        .compact-table .name-cell {
          text-align: right;
          font-weight: 600;
          color: #1A1A1A;
          max-width: 180px;
        }

        .compact-table .level-cell {
          font-size: 10px;
          max-width: 120px;
          color: #555;
        }

        .compact-table tbody tr {
          transition: all 0.2s;
        }

        .compact-table tbody tr:hover {
          background: rgba(200, 162, 78, 0.08);
        }

        .compact-table tbody tr td {
          color: #333;
        }

        .sort-indicator {
          display: inline-block;
          margin-left: 4px;
          font-size: 10px;
          color: #D4AF5E;
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
          border: 1px solid rgba(200, 162, 78, 0.3);
          background: rgba(200, 162, 78, 0.06);
          color: #D4AF5E;
          cursor: pointer;
          border-radius: clamp(6px, 0.8vh, 8px);
          font-family: 'Noto Kufi Arabic', 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
        }

        .page-button:hover {
          background: rgba(200, 162, 78, 0.15);
          border-color: rgba(200, 162, 78, 0.5);
        }

        .page-button.active {
          background: linear-gradient(135deg, #B8922E, #D4AF5E);
          color: #0A0F0A;
          border-color: transparent;
          box-shadow: 0 4px 16px rgba(200,162,78,0.4);
        }

        .page-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .back-button {
          width: 100%;
          margin-top: 20px;
          padding: 12px;
          background: transparent;
          color: #D4AF5E;
          border: 1px solid rgba(200, 162, 78, 0.3);
          border-radius: clamp(8px, 1.2vh, 12px);
          font-size: 15px;
          font-weight: 700;
          font-family: 'Noto Kufi Arabic', 'Sora', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          opacity: 0.7;
        }

        .back-button:hover {
          background: rgba(200, 162, 78, 0.08);
          opacity: 1;
          border-color: rgba(200, 162, 78, 0.5);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes slideIn {
          from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.6s linear infinite;
          margin-left: 8px;
        }
      `}</style>

      {/* Animated Background */}
      <div className="bg-canvas">
        <div className="bg-orb green-1"></div>
        <div className="bg-orb green-2"></div>
        <div className="bg-orb gold-1"></div>
        <div className="bg-orb gold-2"></div>
      </div>

      {/* Delete Success Toast */}
      {showDeleteSuccess && (
        <div style={{
          position: 'fixed',
          top: '15px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(34, 197, 94, 0.12)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '10px 24px',
          borderRadius: '10px',
          fontSize: '13px',
          textAlign: 'center',
          color: '#4ADE80',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          fontWeight: '700',
          fontFamily: 'Noto Kufi Arabic, Sora, sans-serif',
          zIndex: 2000,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          maxWidth: '85vw',
          animation: 'slideIn 0.3s ease-out'
        }}>
          ✓ تم الحذف بنجاح
        </div>
      )}

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

          {/* Back Button - Top */}
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%',
              marginBottom: 'clamp(12px, 2vh, 18px)',
              padding: 'clamp(10px, 1.5vh, 14px)',
              background: 'transparent',
              color: '#D4AF5E',
              border: '1px solid rgba(200, 162, 78, 0.3)',
              borderRadius: 'clamp(8px, 1.2vh, 12px)',
              fontSize: 'clamp(13px, 1.8vw, 15px)',
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
          
          {/* Header */}
          <div style={{ marginBottom: '25px', textAlign: 'center' }}>
            <div style={{
              width: 'clamp(45px, 7vw, 60px)',
              height: 'clamp(45px, 7vw, 60px)',
              margin: '0 auto 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0B1F0E, #0A0F0A)',
              border: '2px solid #C8A24E',
              boxShadow: '0 0 28px rgba(200,162,78,0.3), 0 0 8px rgba(200,162,78,0.2)'
            }}>
              <Image
                src="/images/logo.svg"
                alt="Logo"
                width={50}
                height={50}
                style={{ 
                  width: '70%', 
                  height: '70%', 
                  objectFit: 'contain',
                  filter: 'brightness(0) saturate(100%) invert(79%) sepia(18%) saturate(1234%) hue-rotate(359deg) brightness(95%) contrast(88%)'
                }}
                priority
              />
            </div>
            <h1 style={{
              fontSize: '20px',
              fontWeight: '700',
              marginBottom: '5px',
              background: 'linear-gradient(135deg, #C8A24E, #E0C478, #D4AF5E)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              قائمة المتسابقين
            </h1>
            <p style={{ color: 'rgba(240, 253, 244, 0.5)', fontSize: '13px' }}>
              إجمالي: {filteredCompetitors.length} متسابق | الصفحة {currentPage} من {totalPages}
            </p>
          </div>

          {/* Search & Filters */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الهاتف..."
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
              onFocus={(e) => { e.target.style.borderColor = '#C8A24E'; e.target.style.boxShadow = '0 0 0 3px rgba(200,162,78,0.12)' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(200, 162, 78, 0.25)'; e.target.style.boxShadow = 'none' }}
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
              <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} style={{ padding: '8px', border: '1px solid rgba(200, 162, 78, 0.25)', borderRadius: '6px', fontSize: '13px', fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', cursor: 'pointer', background: 'rgba(200, 162, 78, 0.06)', color: '#F0FDF4', outline: 'none' }}>
                <option value="" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>كل الأجناس</option>
                <option value="male" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>ذكر</option>
                <option value="female" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>أنثى</option>
              </select>

              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '8px', border: '1px solid rgba(200, 162, 78, 0.25)', borderRadius: '6px', fontSize: '13px', fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', cursor: 'pointer', background: 'rgba(200, 162, 78, 0.06)', color: '#F0FDF4', outline: 'none' }}>
                <option value="" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>كل الحالات</option>
                <option value="evaluated" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>تم التقييم</option>
                <option value="not_evaluated" style={{ background: '#0A0F0A', color: '#F0FDF4' }}>لم يتم التقييم</option>
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

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <button onClick={handlePrint} style={{ padding: '8px 15px', background: 'linear-gradient(135deg, #166534, #22C55E)', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', cursor: 'pointer', boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)', transition: 'all 0.2s' }}>
              طباعة PDF
            </button>
            <button onClick={handleDeleteSelected} disabled={selectedIds.size === 0} style={{ padding: '8px 15px', background: selectedIds.size === 0 ? 'rgba(200, 162, 78, 0.2)' : 'linear-gradient(135deg, #B8922E, #D4AF5E)', color: selectedIds.size === 0 ? 'rgba(240, 253, 244, 0.4)' : '#0A0F0A', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer', boxShadow: selectedIds.size === 0 ? 'none' : '0 4px 16px rgba(200,162,78,0.3)', transition: 'all 0.2s' }}>
              حذف المحدد ({selectedIds.size})
            </button>
            <button onClick={handleDeleteAll} style={{ padding: '8px 15px', background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', cursor: 'pointer', boxShadow: '0 4px 16px rgba(220, 38, 38, 0.3)', transition: 'all 0.2s' }}>
              حذف الكل
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            {loading && <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(240, 253, 244, 0.5)' }}>جاري التحميل...</div>}

            {!loading && filteredCompetitors.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(240, 253, 244, 0.4)' }}>لا توجد نتائج</div>
            )}

            {!loading && currentCompetitors.length > 0 && (
              <table className="compact-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input type="checkbox" checked={selectedIds.size === currentCompetitors.length && currentCompetitors.length > 0} onChange={toggleSelectAll} />
                    </th>
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
                    <th style={{ width: '85px' }}>الهاتف</th>
                    <th style={{ width: '95px' }} onClick={() => handleSort('status')}>
                      الحالة
                      {sortField === 'status' && (
                        <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th style={{ width: '60px' }}>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCompetitors.map((competitor, index) => (
                    <tr key={competitor.id}>
                      <td>
                        <input type="checkbox" checked={selectedIds.has(competitor.id)} onChange={() => toggleSelection(competitor.id)} />
                      </td>
                      <td style={{ fontWeight: '600', color: '#0B1F0E' }}>{startIndex + index + 1}</td>
                      <td className="name-cell">{competitor.full_name}</td>
                      <td>{competitor.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                      <td className="level-cell">{competitor.level.split(':')[0]}</td>
                      <td>{competitor.city}</td>
                      <td style={{ direction: 'ltr' }}>{competitor.mobile}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', background: competitor.status === 'evaluated' ? 'rgba(22, 101, 52, 0.1)' : 'rgba(200, 162, 78, 0.1)', color: competitor.status === 'evaluated' ? '#166534' : '#A07C2E', border: competitor.status === 'evaluated' ? '1px solid rgba(22, 101, 52, 0.25)' : '1px solid rgba(200, 162, 78, 0.25)' }}>
                          {competitor.status === 'evaluated' ? 'تم التقييم' : 'لم يتم التقييم'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => handleDelete(competitor.id)} style={{ padding: '4px 10px', background: 'rgba(220, 38, 38, 0.08)', color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.2)', borderRadius: '5px', fontSize: '11px', fontWeight: '600', fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', cursor: 'pointer', transition: 'all 0.2s' }}>
                          حذف
                        </button>
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
                // Show first 3, last 3, and current ± 1
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

          {/* Back Button */}
          <button onClick={() => router.push('/dashboard')} className="back-button">
            العودة للقائمة الرئيسية
          </button>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div style={{ background: 'rgba(34, 197, 94, 0.08)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '25px', borderRadius: 'clamp(16px, 2.5vh, 24px)', maxWidth: '400px', width: '90%', boxShadow: '0 16px 64px rgba(0, 0, 0, 0.5), 0 0 80px rgba(34, 197, 94, 0.05)' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: '#FCA5A5', fontSize: '18px', fontWeight: '700', marginBottom: '12px', textAlign: 'center' }}>⚠️ تأكيد الحذف</h2>
            <p style={{ color: 'rgba(240, 253, 244, 0.8)', fontSize: '14px', marginBottom: '15px', textAlign: 'center' }}>
              {deleteMode === 'single' && 'هل أنت متأكد من حذف هذا المتسابق؟'}
              {deleteMode === 'selected' && `هل أنت متأكد من حذف ${selectedIds.size} متسابق؟`}
              {deleteMode === 'all' && `هل أنت متأكد من حذف جميع المتسابقين (${competitors.length} متسابق)؟`}
            </p>
            <input 
              type="password" 
              placeholder="أدخل كلمة المرور" 
              value={deletePassword} 
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={isDeleting}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid rgba(200, 162, 78, 0.25)', 
                borderRadius: '8px', 
                fontSize: '14px', 
                marginBottom: '15px', 
                fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', 
                textAlign: 'center',
                opacity: isDeleting ? 0.6 : 1,
                background: 'rgba(200, 162, 78, 0.06)',
                color: '#F0FDF4',
                outline: 'none'
              }} 
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={confirmDelete} 
                disabled={isDeleting}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  background: isDeleting ? 'rgba(200, 162, 78, 0.2)' : 'linear-gradient(135deg, #dc2626, #ef4444)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', 
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: isDeleting ? 'none' : '0 4px 16px rgba(220, 38, 38, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {isDeleting && <span className="spinner"></span>}
                {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
              <button 
                onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }} 
                disabled={isDeleting}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  background: 'rgba(200, 162, 78, 0.1)', 
                  color: '#D4AF5E', 
                  border: '1px solid rgba(200, 162, 78, 0.3)', 
                  borderRadius: '8px', 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  fontFamily: 'Noto Kufi Arabic, Sora, sans-serif', 
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1,
                  transition: 'all 0.2s'
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