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

type SortField = 'full_name' | 'gender' | 'level' | 'city' | 'status'
type SortDirection = 'asc' | 'desc'

export default function CompetitorsPage() {
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

  useEffect(() => {
    applyFilters()
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

  const applyFilters = () => {
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
        const allWordsMatch = searchWords.every(searchWord =>
          nameWords.some(nameWord => nameWord.includes(searchWord))
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

    setFilteredCompetitors(filtered)
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

      if (deleteMode === 'single' && deletingId) {
        // Delete single competitor
        const { error } = await supabase
          .from('competitors')
          .delete()
          .eq('id', deletingId)

        if (error) throw error
        
      } else if (deleteMode === 'selected') {
        // Delete selected competitors
        const idsArray = Array.from(selectedIds)
        
        // Delete in batches to avoid issues
        for (const id of idsArray) {
          const { error } = await supabase
            .from('competitors')
            .delete()
            .eq('id', id)
          
          if (error) throw error
        }
        
        setSelectedIds(new Set())
        
      } else if (deleteMode === 'all') {
        // Delete all competitors - get all IDs first
        const allIds = competitors.map(c => c.id)
        
        // Delete in batches
        for (const id of allIds) {
          const { error } = await supabase
            .from('competitors')
            .delete()
            .eq('id', id)
          
          if (error) {
            console.error('Error deleting competitor:', id, error)
            // Continue with other deletions even if one fails
          }
        }
        
        setSelectedIds(new Set())
      }

      // Refresh competitors list
      await fetchCompetitors()
      
      // Close modal and reset
      setShowDeleteModal(false)
      setDeletePassword('')
      setDeletingId(null)
      setIsDeleting(false)
      
      alert('تم الحذف بنجاح')
      
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
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { 
            size: A4 portrait; 
            margin: 10mm;
          }
          body { 
            font-family: 'Cairo', sans-serif; 
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
          .row-num { font-weight: 600; color: #5fb3b3; }
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
          max-width: 180px;
        }

        .compact-table .level-cell {
          font-size: 10px;
          max-width: 120px;
        }

        .compact-table tr:hover {
          background: #f9f9f9;
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
          margin-left: 8px;
        }
      `}</style>

      <div style={{
        minHeight: 'calc(var(--vh, 1vh) * 100)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}>
        <div className="app-container">
          
          {/* Header */}
          <div style={{ marginBottom: '25px', textAlign: 'center' }}>
            <div style={{ width: '50px', height: '50px', margin: '0 auto 10px' }}>
              <Image
                src="/images/logo.svg"
                alt="Logo"
                width={50}
                height={50}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                priority
              />
            </div>
            <h1 style={{ color: '#333', fontSize: '20px', fontWeight: '700', marginBottom: '5px' }}>
              قائمة المتسابقين
            </h1>
            <p style={{ color: '#666', fontSize: '13px' }}>
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
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                textAlign: 'right',
                fontFamily: 'Cairo, sans-serif',
                marginBottom: '10px'
              }}
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
              <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} style={{ padding: '8px', border: '2px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }}>
                <option value="">كل الأجناس</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>

              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '8px', border: '2px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }}>
                <option value="">كل الحالات</option>
                <option value="evaluated">تم التقييم</option>
                <option value="not_evaluated">لم يتم التقييم</option>
              </select>

              <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} style={{ padding: '8px', border: '2px solid #e0e0e0', borderRadius: '6px', fontSize: '13px', fontFamily: 'Cairo, sans-serif', cursor: 'pointer', gridColumn: 'span 2' }}>
                <option value="">كل المستويات</option>
                {levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>

              <button onClick={resetFilters} style={{ gridColumn: 'span 2', padding: '8px', background: '#f5f5f5', color: '#666', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }}>
                إعادة تعيين
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <button onClick={handlePrint} style={{ padding: '8px 15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }}>
              طباعة PDF
            </button>
            <button onClick={handleDeleteSelected} disabled={selectedIds.size === 0} style={{ padding: '8px 15px', background: selectedIds.size === 0 ? '#95a5a6' : '#e67e22', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', fontFamily: 'Cairo, sans-serif', cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer' }}>
              حذف المحدد ({selectedIds.size})
            </button>
            <button onClick={handleDeleteAll} style={{ padding: '8px 15px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }}>
              حذف الكل
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            {loading && <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>جاري التحميل...</div>}

            {!loading && filteredCompetitors.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>لا توجد نتائج</div>
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
                      <td style={{ fontWeight: '600', color: '#5fb3b3' }}>{startIndex + index + 1}</td>
                      <td className="name-cell">{competitor.full_name}</td>
                      <td>{competitor.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                      <td className="level-cell">{competitor.level.split(':')[0]}</td>
                      <td>{competitor.city}</td>
                      <td style={{ direction: 'ltr' }}>{competitor.mobile}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', background: competitor.status === 'evaluated' ? '#d4edda' : '#fff3cd', color: competitor.status === 'evaluated' ? '#27ae60' : '#f39c12' }}>
                          {competitor.status === 'evaluated' ? 'تم التقييم' : 'لم يتم التقييم'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => handleDelete(competitor.id)} style={{ padding: '4px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', fontSize: '11px', fontWeight: '600', fontFamily: 'Cairo, sans-serif', cursor: 'pointer' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', maxWidth: '400px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: '#333', fontSize: '18px', fontWeight: '700', marginBottom: '12px', textAlign: 'center' }}>تأكيد الحذف</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px', textAlign: 'center' }}>
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
                border: '2px solid #e0e0e0', 
                borderRadius: '8px', 
                fontSize: '14px', 
                marginBottom: '15px', 
                fontFamily: 'Cairo, sans-serif', 
                textAlign: 'center',
                opacity: isDeleting ? 0.6 : 1
              }} 
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={confirmDelete} 
                disabled={isDeleting}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  background: isDeleting ? '#95a5a6' : '#e74c3c', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  fontFamily: 'Cairo, sans-serif', 
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
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
                  background: '#95a5a6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  fontFamily: 'Cairo, sans-serif', 
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1
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