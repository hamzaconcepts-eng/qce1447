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

  const applyFilters = () => {
    let filtered = [...competitors]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Gender filter
    if (filterGender) {
      filtered = filtered.filter(c => c.gender === filterGender)
    }

    // Level filter
    if (filterLevel) {
      filtered = filtered.filter(c => c.level === filterLevel)
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(c => c.status === filterStatus)
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      if (sortField === 'full_name' || sortField === 'city') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredCompetitors(filtered)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedCompetitors.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedCompetitors.map(c => c.id)))
    }
  }

  const openDeleteModal = (mode: 'single' | 'selected' | 'all', id?: string) => {
    setDeleteMode(mode)
    setDeletingId(id || null)
    setShowDeleteModal(true)
    setDeletePassword('')
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setDeletePassword('')
    setDeletingId(null)
  }

  const handleDelete = async () => {
    if (deletePassword !== 'admin123') {
      alert('كلمة المرور غير صحيحة')
      return
    }

    setIsDeleting(true)

    try {
      const supabase = createClient()

      if (deleteMode === 'single' && deletingId) {
        const { error } = await supabase
          .from('competitors')
          .delete()
          .eq('id', deletingId)

        if (error) throw error
        alert('تم الحذف بنجاح')
      } else if (deleteMode === 'selected' && selectedIds.size > 0) {
        const { error } = await supabase
          .from('competitors')
          .delete()
          .in('id', Array.from(selectedIds))

        if (error) throw error
        alert(`تم حذف ${selectedIds.size} متسابق`)
        setSelectedIds(new Set())
      } else if (deleteMode === 'all') {
        const { error } = await supabase
          .from('competitors')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000')

        if (error) throw error
        alert('تم حذف جميع المتسابقين')
        setSelectedIds(new Set())
      }

      closeDeleteModal()
      fetchCompetitors()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('حدث خطأ أثناء الحذف')
    } finally {
      setIsDeleting(false)
    }
  }

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const paginatedCompetitors = filteredCompetitors.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredCompetitors.length / itemsPerPage)

  const getGenderInArabic = (gender: string) => {
    return gender === 'male' ? 'ذكر' : 'أنثى'
  }

  const getStatusInArabic = (status: string) => {
    return status === 'not_evaluated' ? 'لم يتم التقييم' : 'تم التقييم'
  }

  const getLevelShort = (level: string) => {
    const index = levels.indexOf(level)
    if (index === -1) return level
    return ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'][index]
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
          height: calc(var(--vh, 1vh) * 100);
          width: 100vw;
          overflow: hidden;
          font-family: 'Cairo', sans-serif;
        }

        body {
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
        }

        .table-container {
          overflow-x: auto;
          overflow-y: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        th, td {
          padding: clamp(8px, 1.2vh, 12px) clamp(6px, 1vw, 10px);
          text-align: right;
          border-bottom: 1px solid #e0e0e0;
          font-size: clamp(11px, 1.2vw, 13px);
        }

        th {
          background: linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%);
          color: white;
          font-weight: 700;
          position: sticky;
          top: 0;
          z-index: 10;
          cursor: pointer;
        }

        tr:hover {
          background: #f8f9fa;
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

        .modal {
          background: white;
          padding: clamp(20px, 3vh, 30px);
          border-radius: clamp(10px, 1.5vh, 15px);
          max-width: 90vw;
          width: clamp(300px, 80vw, 500px);
        }
      `}</style>

      <div style={{
        height: 'calc(var(--vh, 1vh) * 100)',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'clamp(10px, 1.5vh, 20px)',
        background: 'linear-gradient(135deg, #5fb3b3 0%, #1a3a3a 100%)'
      }}>
        
        <div style={{
          background: '#ffffff',
          padding: 'clamp(15px, 2vh, 25px)',
          borderRadius: 'clamp(10px, 1.5vh, 20px)',
          boxShadow: '0 1vh 3vh rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '95vw',
          height: '95vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* Header */}
          <div style={{ flexShrink: 0, marginBottom: 'clamp(10px, 1.5vh, 15px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.5vw, 15px)', marginBottom: 'clamp(10px, 1.5vh, 15px)' }}>
              <div style={{ width: 'clamp(40px, 6vw, 60px)', height: 'clamp(40px, 6vw, 60px)' }}>
                <Image
                  src="/images/logo.svg"
                  alt="Logo"
                  width={60}
                  height={60}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  priority
                />
              </div>
              <h1 style={{
                color: '#333333',
                fontSize: 'clamp(16px, 2.2vw, 24px)',
                fontWeight: '700',
                flex: 1
              }}>
                المتسابقون المسجلون
              </h1>
            </div>

            {/* Search and Filters */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 'clamp(6px, 1vw, 10px)',
              marginBottom: 'clamp(8px, 1.2vh, 12px)'
            }}>
              <input
                type="text"
                placeholder="بحث بالاسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: 'clamp(6px, 1vh, 10px)',
                  border: '2px solid #e0e0e0',
                  borderRadius: 'clamp(4px, 0.6vh, 8px)',
                  fontSize: 'clamp(11px, 1.2vw, 13px)',
                  fontFamily: 'Cairo, sans-serif',
                  textAlign: 'right'
                }}
              />
              
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                style={{
                  padding: 'clamp(6px, 1vh, 10px)',
                  border: '2px solid #e0e0e0',
                  borderRadius: 'clamp(4px, 0.6vh, 8px)',
                  fontSize: 'clamp(11px, 1.2vw, 13px)',
                  fontFamily: 'Cairo, sans-serif'
                }}
              >
                <option value="">كل الأجناس</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>

              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                style={{
                  padding: 'clamp(6px, 1vh, 10px)',
                  border: '2px solid #e0e0e0',
                  borderRadius: 'clamp(4px, 0.6vh, 8px)',
                  fontSize: 'clamp(11px, 1.2vw, 13px)',
                  fontFamily: 'Cairo, sans-serif'
                }}
              >
                <option value="">كل المستويات</option>
                {levels.map(level => (
                  <option key={level} value={level}>{getLevelShort(level)}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: 'clamp(6px, 1vh, 10px)',
                  border: '2px solid #e0e0e0',
                  borderRadius: 'clamp(4px, 0.6vh, 8px)',
                  fontSize: 'clamp(11px, 1.2vw, 13px)',
                  fontFamily: 'Cairo, sans-serif'
                }}
              >
                <option value="">كل الحالات</option>
                <option value="not_evaluated">لم يتم التقييم</option>
                <option value="evaluated">تم التقييم</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 'clamp(6px, 1vw, 10px)', flexWrap: 'wrap' }}>
              <button
                onClick={() => selectedIds.size > 0 && openDeleteModal('selected')}
                disabled={selectedIds.size === 0}
                style={{
                  padding: 'clamp(6px, 1vh, 10px) clamp(10px, 1.5vw, 15px)',
                  background: selectedIds.size > 0 ? '#e74c3c' : '#cccccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'clamp(4px, 0.6vh, 8px)',
                  fontSize: 'clamp(11px, 1.2vw, 13px)',
                  fontWeight: '700',
                  fontFamily: 'Cairo, sans-serif',
                  cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                حذف المحدد ({selectedIds.size})
              </button>

              <button
                onClick={() => openDeleteModal('all')}
                style={{
                  padding: 'clamp(6px, 1vh, 10px) clamp(10px, 1.5vw, 15px)',
                  background: '#c0392b',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'clamp(4px, 0.6vh, 8px)',
                  fontSize: 'clamp(11px, 1.2vw, 13px)',
                  fontWeight: '700',
                  fontFamily: 'Cairo, sans-serif',
                  cursor: 'pointer'
                }}
              >
                حذف الكل
              </button>

              <div style={{ flex: 1 }}></div>

              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  padding: 'clamp(6px, 1vh, 10px) clamp(10px, 1.5vw, 15px)',
                  background: '#5fb3b3',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'clamp(4px, 0.6vh, 8px)',
                  fontSize: 'clamp(11px, 1.2vw, 13px)',
                  fontWeight: '700',
                  fontFamily: 'Cairo, sans-serif',
                  cursor: 'pointer'
                }}
              >
                العودة
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'clamp(30px, 5vh, 60px)' }}>
              جاري التحميل...
            </div>
          ) : (
            <>
              <div className="table-container" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.size === paginatedCompetitors.length && paginatedCompetitors.length > 0}
                          onChange={toggleSelectAll}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th onClick={() => handleSort('full_name')} style={{ cursor: 'pointer' }}>
                        الاسم {sortField === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('gender')}>
                        الجنس {sortField === 'gender' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('level')}>
                        المستوى {sortField === 'level' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('city')}>
                        المدينة {sortField === 'city' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>الهاتف</th>
                      <th onClick={() => handleSort('status')}>
                        الحالة {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th style={{ width: '80px' }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCompetitors.map(competitor => (
                      <tr key={competitor.id}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(competitor.id)}
                            onChange={() => toggleSelect(competitor.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td>{competitor.full_name}</td>
                        <td>{getGenderInArabic(competitor.gender)}</td>
                        <td>{getLevelShort(competitor.level)}</td>
                        <td>{competitor.city}</td>
                        <td style={{ direction: 'ltr', textAlign: 'left' }}>{competitor.mobile}</td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: 'clamp(9px, 1vw, 11px)',
                            background: competitor.status === 'evaluated' ? '#d4edda' : '#fff3cd',
                            color: competitor.status === 'evaluated' ? '#155724' : '#856404'
                          }}>
                            {getStatusInArabic(competitor.status)}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => openDeleteModal('single', competitor.id)}
                            style={{
                              padding: '4px 8px',
                              background: '#e74c3c',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: 'clamp(9px, 1vw, 11px)',
                              cursor: 'pointer'
                            }}
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{
                flexShrink: 0,
                marginTop: 'clamp(10px, 1.5vh, 15px)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 'clamp(11px, 1.2vw, 13px)'
              }}>
                <div>
                  عرض {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredCompetitors.length)} من {filteredCompetitors.length}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: 'clamp(4px, 0.8vh, 8px) clamp(8px, 1.2vw, 12px)',
                      background: currentPage === 1 ? '#cccccc' : '#5fb3b3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: 'clamp(10px, 1.1vw, 12px)'
                    }}
                  >
                    السابق
                  </button>
                  <span style={{ padding: 'clamp(4px, 0.8vh, 8px)' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: 'clamp(4px, 0.8vh, 8px) clamp(8px, 1.2vw, 12px)',
                      background: currentPage === totalPages ? '#cccccc' : '#5fb3b3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: 'clamp(10px, 1.1vw, 12px)'
                    }}
                  >
                    التالي
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              marginBottom: 'clamp(10px, 1.5vh, 15px)',
              textAlign: 'center'
            }}>
              تأكيد الحذف
            </h2>
            <p style={{
              marginBottom: 'clamp(15px, 2vh, 20px)',
              textAlign: 'center',
              fontSize: 'clamp(12px, 1.4vw, 14px)'
            }}>
              {deleteMode === 'single' && 'هل أنت متأكد من حذف هذا المتسابق؟'}
              {deleteMode === 'selected' && `هل أنت متأكد من حذف ${selectedIds.size} متسابق؟`}
              {deleteMode === 'all' && 'هل أنت متأكد من حذف جميع المتسابقين؟'}
            </p>
            <input
              type="password"
              placeholder="أدخل كلمة المرور للتأكيد"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              style={{
                width: '100%',
                padding: 'clamp(8px, 1.2vh, 12px)',
                marginBottom: 'clamp(15px, 2vh, 20px)',
                border: '2px solid #e0e0e0',
                borderRadius: 'clamp(5px, 0.8vh, 8px)',
                fontSize: 'clamp(12px, 1.4vw, 14px)',
                fontFamily: 'Cairo, sans-serif',
                textAlign: 'right'
              }}
            />
            <div style={{ display: 'flex', gap: 'clamp(8px, 1.2vw, 10px)' }}>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: 'clamp(8px, 1.2vh, 12px)',
                  background: isDeleting ? '#95a5a6' : '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'clamp(5px, 0.8vh, 8px)',
                  fontSize: 'clamp(12px, 1.4vw, 14px)',
                  fontWeight: '700',
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: 'clamp(8px, 1.2vh, 12px)',
                  background: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'clamp(5px, 0.8vh, 8px)',
                  fontSize: 'clamp(12px, 1.4vw, 14px)',
                  fontWeight: '700',
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
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