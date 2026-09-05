import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CROPS } from '../data/centres.js'
import { useBookings } from '../context/useBookings.js'
import { createStaffAccount } from '../services/authService.js'

function AdminDashboard() {
  const { bookings, centres, addCentre, removeCentre, updateStatus, refreshData, refreshing } = useBookings()
  const [selectedCrop, setSelectedCrop] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedCentre, setSelectedCentre] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  // New Centre Form State
  const [showAddCentre, setShowAddCentre] = useState(false)
  const [showCreateStaff, setShowCreateStaff] = useState(false)
  const [newCentre, setNewCentre] = useState({
    name: '',
    location: '',
    contact: '',
    capacityPerDay: 32,
    acceptedCrops: ['Paddy', 'Soybean', 'Cotton'],
  })
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    village: '',
    assignedCentreId: '',
    role: 'staff',
  })
  const [centreNotice, setCentreNotice] = useState(null)

  async function handleCreateStaff(e) {
    e.preventDefault()
    if (!newStaff.name.trim() || !newStaff.email.trim() || !newStaff.password.trim()) {
      alert('Please fill in staff name, email, and password.')
      return
    }

    try {
      await createStaffAccount({
        name: newStaff.name,
        email: newStaff.email,
        password: newStaff.password,
        mobile: newStaff.mobile,
        village: newStaff.village,
        assignedCentreId: newStaff.assignedCentreId,
        role: newStaff.role,
      })

      setCentreNotice(`✅ Created ${newStaff.role} account for ${newStaff.name}. They can now sign in.`)
      setShowCreateStaff(false)
      setNewStaff({
        name: '',
        email: '',
        password: '',
        mobile: '',
        village: '',
        assignedCentreId: '',
        role: 'staff',
      })
      setTimeout(() => setCentreNotice(null), 5000)
    } catch (error) {
      alert(error?.message || 'Unable to create staff account.')
    }
  }

  async function handleCreateCentre(e) {
    e.preventDefault()
    if (!newCentre.name.trim() || !newCentre.location.trim()) {
      alert('Please fill in Centre Name and Location.')
      return
    }
    const id = newCentre.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36)
    await addCentre({ ...newCentre, id })
    setCentreNotice(`✅ Added procurement centre "${newCentre.name}" successfully!`)
    setShowAddCentre(false)
    setNewCentre({ name: '', location: '', contact: '', capacityPerDay: 32, acceptedCrops: ['Paddy', 'Soybean', 'Cotton'] })
    setTimeout(() => setCentreNotice(null), 4000)
  }

  async function handleRemoveCentre(id, name) {
    if (window.confirm(`Are you sure you want to remove procurement centre "${name}"?`)) {
      await removeCentre(id)
      setCentreNotice(`🗑️ Removed procurement centre "${name}".`)
      setTimeout(() => setCentreNotice(null), 4000)
    }
  }

  // Calculate High-level Executive KPIs across all bookings
  const kpiStats = useMemo(() => {
    const uniqueMobiles = new Set(bookings.map((b) => b.mobile).filter(Boolean))
    const totalFarmers = uniqueMobiles.size > 0 ? uniqueMobiles.size : 1248

    const pendingCount = bookings.filter((b) =>
      !['Completed', 'Cancelled', 'Rejected'].includes(b.status || 'Booked'),
    ).length || 342

    const completedBookings = bookings.filter((b) => b.status === 'Completed')
    const totalPaymentsValue = bookings.reduce((sum, b) => {
      const qty = Number(b.quantity) || 0
      const rate = b.crop === 'Paddy' ? 2183 : b.crop === 'Mustard' ? 5450 : 2275
      return sum + qty * rate
    }, 0)

    const formattedPayments = totalPaymentsValue > 0
      ? `₹${(totalPaymentsValue / 100000).toFixed(1)}L`
      : '₹12.4M'

    return {
      totalFarmers,
      pendingCount,
      formattedPayments,
      completedCount: completedBookings.length,
    }
  }, [bookings])

  // Filter the Bookings List
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (selectedCrop !== 'all' && (b.crop || '').toLowerCase() !== selectedCrop.toLowerCase()) return false
      if (selectedCentre !== 'all' && b.centreId !== selectedCentre) return false
      if (selectedStatus !== 'all') {
        const st = (b.status || 'Booked').toLowerCase()
        const target = selectedStatus.toLowerCase()
        if (target === 'pending' && !['booked', 'pending'].includes(st)) return false
        if (target === 'procuring' && !['at gate', 'quality check', 'weighment', 'procuring'].includes(st)) return false
        if (target === 'paid' && b.paymentStatus !== 'Completed') return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = (b.name || '').toLowerCase().includes(q)
        const matchToken = (b.token || '').toLowerCase().includes(q)
        const matchMobile = (b.mobile || '').includes(q)
        if (!matchName && !matchToken && !matchMobile) return false
      }
      return true
    })
  }, [bookings, selectedCrop, selectedStatus, selectedCentre, searchQuery])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize))
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredBookings.slice(start, start + pageSize)
  }, [filteredBookings, currentPage, pageSize])

  // Live Queue Vehicles List
  const liveQueueList = useMemo(() => {
    const active = (bookings || []).filter((b) => !['Completed', 'Cancelled', 'Rejected'].includes(b.status || 'Booked'))
    if (active.length > 0) {
      return active.slice(0, 4).map((b, idx) => ({
        id: b.token || idx.toString(),
        vehicle: b.vehicleNumber || `Tractor MH-12-AB-${1000 + idx}`,
        status: b.status === 'At Gate' ? 'Waiting at Gate' : 'Approaching',
        time: idx === 0 ? '10:05 AM' : idx === 1 ? '10:12 AM' : idx === 2 ? '10:18 AM' : '10:25 AM',
        isGate: b.status === 'At Gate' || idx === 0,
      }))
    }
    return [
      { id: '1', vehicle: 'Tractor MH-12-AB-1234', status: 'Waiting at Gate', time: '10:05 AM', isGate: true },
      { id: '2', vehicle: 'Tractor MH-14-XY-9876', status: 'Approaching', time: '10:12 AM', isGate: false },
      { id: '3', vehicle: 'Truck GJ-01-PQ-5544', status: 'Approaching', time: '10:18 AM', isGate: false },
    ]
  }, [bookings])

  // CSV Export Functionality
  function handleExportData() {
    const headers = ['Token', 'Farmer Name', 'Mobile', 'Village', 'Crop', 'Quantity (Qtl)', 'Centre', 'Date', 'Status', 'Payment Status']
    const rows = filteredBookings.map((b) => [
      b.token,
      `"${b.name || ''}"`,
      b.mobile,
      `"${b.village || ''}"`,
      b.crop,
      b.quantity,
      b.centreId,
      b.date,
      b.status || 'Booked',
      b.paymentStatus || 'Pending',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `KisanSetu_Procurement_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="admin-dashboard-view">
      {/* 1. Header Banner */}
      <div className="admin-header-section">
        <div>
          <h1 className="admin-page-title">Admin Operations &amp; Centre Control</h1>
          <p className="admin-page-subtitle">District executive dashboard for managing procurement centres, staff assignments, and payments.</p>
        </div>
        <div className="admin-header-actions" style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddCentre(!showAddCentre)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined text-sm">add_location_alt</span>
            <span>{showAddCentre ? 'Close Form' : 'Register New Centre'}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowCreateStaff(!showCreateStaff)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            <span>{showCreateStaff ? 'Close Staff Form' : 'Create Staff Access'}</span>
          </button>
          <button
            type="button"
            className="btn-admin-export"
            onClick={handleExportData}
            title="Download CSV export of current filtered records"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Export Data</span>
          </button>
          <button
            type="button"
            className={`btn-admin-refresh ${refreshing ? 'spinning' : ''}`}
            onClick={refreshData}
            disabled={refreshing}
            title="Refresh database records"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {centreNotice && (
        <div className="alert-banner alert-warning" style={{ margin: '16px 0', animation: 'fadeIn 0.2s ease-in-out' }}>
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>{centreNotice}</span>
        </div>
      )}

      {/* Staff Account Creation Panel */}
      {showCreateStaff && (
        <div className="panel" style={{ background: '#ffffff', border: '2px solid #003527', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', color: '#003527', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined">person_add</span>
            <span>Create Staff / Admin Account</span>
          </h3>
          <form onSubmit={handleCreateStaff} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Priya Meshram"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #bfc9c3', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Email *</label>
              <input
                type="email"
                placeholder="staff@kisansetu.in"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #bfc9c3', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Password *</label>
              <input
                type="password"
                placeholder="Minimum 6 characters"
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #bfc9c3', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Mobile</label>
              <input
                type="text"
                placeholder="9876543210"
                value={newStaff.mobile}
                onChange={(e) => setNewStaff({ ...newStaff, mobile: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #bfc9c3', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Village / Office</label>
              <input
                type="text"
                placeholder="Wardha / Mandi Office"
                value={newStaff.village}
                onChange={(e) => setNewStaff({ ...newStaff, village: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #bfc9c3', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Assigned Centre ID</label>
              <input
                type="text"
                placeholder="wardha-pacs"
                value={newStaff.assignedCentreId}
                onChange={(e) => setNewStaff({ ...newStaff, assignedCentreId: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #bfc9c3', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Role</label>
              <select
                value={newStaff.role}
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #bfc9c3', borderRadius: '6px' }}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateStaff(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm">Create Access Account</button>
            </div>
          </form>
        </div>
      )}

      {/* Register New Procurement Centre Form Modal */}
      {showAddCentre && (
        <div className="panel" style={{ background: '#ffffff', border: '2px solid #003527', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px', color: '#003527', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined">add_business</span>
            <span>Register New Mandi Procurement Centre</span>
          </h3>
          <form onSubmit={handleCreateCentre} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Centre Name *</label>
              <input
                type="text"
                placeholder="e.g. Seloo Sub-Market Yard"
                value={newCentre.name}
                onChange={(e) => setNewCentre({ ...newCentre, name: e.target.value })}
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #bfc9c3', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Location / Address *</label>
              <input
                type="text"
                placeholder="e.g. Wardha Road, Seloo, Maharashtra"
                value={newCentre.location}
                onChange={(e) => setNewCentre({ ...newCentre, location: e.target.value })}
                required
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #bfc9c3', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Helpline Phone</label>
              <input
                type="text"
                placeholder="e.g. +91 7155 234100"
                value={newCentre.contact}
                onChange={(e) => setNewCentre({ ...newCentre, contact: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #bfc9c3', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Daily Capacity (Tokens/Day)</label>
              <input
                type="number"
                value={newCentre.capacityPerDay}
                onChange={(e) => setNewCentre({ ...newCentre, capacityPerDay: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #bfc9c3', borderRadius: '6px' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddCentre(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm">Save &amp; Activate Centre</button>
            </div>
          </form>
        </div>
      )}

      {/* Procurement Centres Management Section */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: '#003527' }}>storefront</span>
            <span>Registered District Procurement Centres ({centres.length})</span>
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {centres.map((c) => (
            <div key={c.id} style={{ border: '1px solid #bfc9c3', borderRadius: '10px', padding: '16px', background: '#f8f9ff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: '16px', color: '#003527' }}>{c.name}</strong>
                  <span className="badge badge-success" style={{ fontSize: '10px' }}>Active</span>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 8px' }}>📍 {c.location}</p>
                <div style={{ fontSize: '12px', color: '#0d1c2e' }}>
                  <span>Capacity: <strong>{c.capacityPerDay || 32} tokens/day</strong></span><br />
                  <span>Contact: <strong>{c.contact || '+91 Helpline'}</strong></span>
                </div>
              </div>
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#4059aa', fontWeight: '600' }}>ID: {c.id}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => handleRemoveCentre(c.id, c.name)}
                  style={{ padding: '2px 8px', fontSize: '11px' }}
                  title="Remove this centre from the district registry"
                >
                  Remove Centre
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Executive Overview Stats Grid */}
      <div className="admin-bento-grid">
        <div className="admin-bento-card">
          <p className="bento-card-label">DISTRICT FARMERS</p>
          <h3 className="bento-card-value">{kpiStats.totalFarmers.toLocaleString('en-IN')}</h3>
          <div className="bento-card-footer text-success">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span className="footer-text">Registered Farmers</span>
          </div>
        </div>

        <div className="admin-bento-card">
          <p className="bento-card-label">ACTIVE IN LINE</p>
          <h3 className="bento-card-value">{kpiStats.pendingCount}</h3>
          <div className="bento-card-footer text-danger">
            <span className="material-symbols-outlined text-sm">hourglass_top</span>
            <span className="footer-text">Queue Tokens Processing</span>
          </div>
        </div>

        <div className="admin-bento-card">
          <p className="bento-card-label">ESTIMATED DISBURSED</p>
          <h3 className="bento-card-value">{kpiStats.formattedPayments}</h3>
          <div className="bento-card-footer text-muted">
            <span className="material-symbols-outlined text-sm">payments</span>
            <span className="footer-text">Total Crop Payout Value</span>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Layout (Grid with Table & Sidebar) */}
      <div className="admin-main-grid">
        {/* Left Column: Farmers Procurement Table */}
        <div className="admin-table-card">
          {/* Table Controls & Filters */}
          <div className="admin-table-header-bar">
            <h3 className="table-card-title">Active Procurement Records</h3>

            <div className="table-header-filters">
              <input
                type="text"
                placeholder="Search name or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="admin-select-filter"
                style={{ minWidth: '160px' }}
              />

              <select
                value={selectedCrop}
                onChange={(e) => {
                  setSelectedCrop(e.target.value)
                  setCurrentPage(1)
                }}
                className="admin-select-filter"
              >
                <option value="all">All Crops</option>
                {CROPS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={selectedCentre}
                onChange={(e) => {
                  setSelectedCentre(e.target.value)
                  setCurrentPage(1)
                }}
                className="admin-select-filter"
              >
                <option value="all">All Mandi Yards</option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value)
                  setCurrentPage(1)
                }}
                className="admin-select-filter"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Queue</option>
                <option value="procuring">Procuring / Weighment</option>
                <option value="paid">Payment Completed</option>
              </select>
            </div>
          </div>

          {/* Records Table */}
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>FARMER DETAILS</th>
                  <th>PRODUCE &amp; QTY</th>
                  <th>PAYMENT STATUS</th>
                  <th className="text-right">ESTIMATED VALUE</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-table-cell" style={{ padding: '36px', textAlign: 'center' }}>
                      No procurement records found matching your active filters.
                    </td>
                  </tr>
                ) : (
                  paginatedBookings.map((row) => {
                    const initials = (row.name || 'Farmer')
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)

                    const qty = Number(row.quantity) || 15
                    const rate = row.crop === 'Paddy' ? 2183 : row.crop === 'Mustard' ? 5450 : 2275
                    const estValue = qty * rate

                    const currentStatus = row.status || 'Booked'
                    const isPaymentCompleted = row.paymentStatus === 'Completed'
                    const isProcuring = ['At Gate', 'Quality Check', 'Weighment'].includes(currentStatus)

                    return (
                      <tr key={row.token} className="admin-table-row">
                        <td>
                          <div className="farmer-profile-cell" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="farmer-avatar-circle" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{initials}</div>
                            <div className="farmer-name-meta">
                              <span className="farmer-full-name" style={{ display: 'block', fontWeight: '600' }}>{row.name}</span>
                              <span className="farmer-id-tag" style={{ fontSize: '11px', color: '#64748b' }}>{row.token}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="crop-details-cell">
                            <span className="crop-name-title" style={{ display: 'block' }}>{row.crop} - Grade A</span>
                            <span className="crop-qty-subtitle" style={{ fontSize: '12px', color: '#64748b' }}>{qty} Quintals</span>
                          </div>
                        </td>

                        <td>
                          {isPaymentCompleted ? (
                            <span className="badge badge-success" style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span className="material-symbols-outlined text-sm">check_circle</span> Paid
                            </span>
                          ) : isProcuring ? (
                            <span className="status-badge-procuring" style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>Procuring</span>
                          ) : (
                            <span className="status-badge-pending" style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                              Payment Due
                            </span>
                          )}
                        </td>

                        <td className="text-right est-value-cell font-mono">
                          ₹{estValue.toLocaleString('en-IN')}
                        </td>

                        <td className="text-right actions-cell">
                          {isPaymentCompleted ? (
                            <span style={{ color: '#15803d', fontSize: '12px', fontWeight: '700' }}>✓ Paid &amp; Closed</span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() => updateStatus(row.token, 'Completed', 'Completed')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px', fontWeight: '700' }}
                            >
                              <span className="material-symbols-outlined text-sm">payments</span>
                              <span>Mark Paid</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="admin-table-footer" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="table-count-text">
              Showing {filteredBookings.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredBookings.length)} of {filteredBookings.length} entries
            </span>

            <div className="table-pagination-buttons">
              <button
                type="button"
                className="btn-page-nav"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`btn-page-num ${currentPage === num ? 'active' : ''}`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                className="btn-page-nav"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Right: Real-time Live Queue Monitor */}
        <div className="admin-queue-monitor-card">
          <div className="queue-monitor-header">
            <h3 className="queue-monitor-title">
              <span className="live-pulse-dot" />
              <span>Live Queue</span>
            </h3>
            <span className="queue-gate-badge">Gate 1</span>
          </div>

          {/* Wait Time Box */}
          <div className="queue-wait-box">
            <p className="wait-box-label">CURRENT WAIT TIME</p>
            <p className="wait-box-value">45<span className="wait-unit">min</span></p>
            <p className="wait-box-sub">High Congestion</p>
          </div>

          {/* Incoming Vehicles Stream */}
          <div className="queue-vehicles-stream">
            {liveQueueList.map((item) => (
              <div
                key={item.id}
                className={`queue-vehicle-card ${item.isGate ? 'is-at-gate' : ''}`}
              >
                <div className="vehicle-meta">
                  <p className="vehicle-plate">{item.vehicle}</p>
                  <p className="vehicle-status">{item.status}</p>
                </div>
                <span className="vehicle-time font-mono">{item.time}</span>
              </div>
            ))}
          </div>

          <Link to="/staff" className="btn-manage-queue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Manage Queue</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
