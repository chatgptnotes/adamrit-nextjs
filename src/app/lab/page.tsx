'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { 
  getLabTests,
  getLabOrders,
  getLabResults,
  createLabOrder,
  enterLabResult,
  getLabQueue,
  getLabStats,
  updateOrderStatus,
  LabTest,
  LabOrder,
  LabResult
} from '@/lib/lab-engine'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import StatCard from '@/components/StatCard'
import { 
  TestTube, 
  ClipboardList, 
  Beaker, 
  TrendingUp,
  Search,
  Plus,
  Clock,
  Check,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  Filter
} from 'lucide-react'

type TabType = 'orders' | 'results' | 'catalog' | 'reports'

export default function LabPage() {
  const [activeTab, setActiveTab] = useState<TabType>('orders')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({})

  // Orders state
  const [labQueue, setLabQueue] = useState<any[]>([])
  const [orders, setOrders] = useState<LabOrder[]>([])
  const [orderFilters, setOrderFilters] = useState({
    status: '',
    date: new Date().toISOString().split('T')[0]
  })

  // Results state
  const [results, setResults] = useState<LabResult[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [resultValues, setResultValues] = useState<{ [testId: string]: { value: string, status: string, notes: string } }>({})

  // Test catalog state
  const [allTests, setAllTests] = useState<LabTest[]>([])
  const [catalogSearch, setCatalogSearch] = useState('')

  // New order state
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  const [selectedTests, setSelectedTests] = useState<LabTest[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrdersData()
    }
  }, [activeTab, orderFilters])

  async function loadInitialData() {
    setLoading(true)
    try {
      const [statsData, testsData, queueData] = await Promise.all([
        getLabStats(),
        getLabTests(),
        getLabQueue()
      ])

      setStats(statsData)
      setAllTests(testsData)
      setLabQueue(queueData)

      // Load patients and doctors for new orders
      const [patientsData, doctorsData] = await Promise.all([
        supabase.from('patients').select('id, name, uhid, phone').order('name').limit(100),
        supabase.from('doctors').select('id, name, specialization, department').order('name')
      ])

      setPatients(patientsData.data || [])
      setDoctors(doctorsData.data || [])

    } catch (error) {
      console.error('Error loading lab data:', error)
    }
    setLoading(false)
  }

  async function loadOrdersData() {
    try {
      const ordersData = await getLabOrders(orderFilters)
      setOrders(ordersData)
    } catch (error) {
      console.error('Error loading orders:', error)
    }
  }

  async function handleCreateOrder() {
    if (!selectedPatient || !selectedDoctor || selectedTests.length === 0) {
      alert('Please select patient, doctor, and at least one test')
      return
    }

    try {
      await createLabOrder(
        selectedPatient.id,
        selectedDoctor.id,
        selectedTests.map((test: any) => ({
          id: test.id,
          name: test.name,
          price: test.price || 0
        }))
      )

      // Reset form
      setSelectedPatient(null)
      setSelectedDoctor(null)
      setSelectedTests([])
      setShowNewOrder(false)

      // Refresh data
      await loadInitialData()
      await loadOrdersData()

      alert('Lab order created successfully!')
    } catch (error) {
      console.error('Error creating lab order:', error)
      alert('Error creating lab order. Please try again.')
    }
  }

  async function handleEnterResults() {
    if (!selectedOrder) return

    try {
      for (const testId of selectedOrder.tests) {
        const resultData = resultValues[testId]
        if (resultData?.value) {
          await enterLabResult(
            selectedOrder.id,
            testId,
            resultData.value,
            resultData.status as 'normal' | 'abnormal' | 'critical',
            resultData.notes
          )
        }
      }

      // Reset form
      setSelectedOrder(null)
      setResultValues({})

      // Refresh data
      await loadInitialData()

      alert('Results entered successfully!')
    } catch (error) {
      console.error('Error entering results:', error)
      alert('Error entering results. Please try again.')
    }
  }

  async function handleUpdateOrderStatus(orderId: string, newStatus: LabOrder['status']) {
    try {
      await updateOrderStatus(orderId, newStatus)
      await loadInitialData()
      await loadOrdersData()
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  function addTestToOrder(test: LabTest) {
    if (!selectedTests.find(t => t.id === test.id)) {
      setSelectedTests([...selectedTests, test])
    }
  }

  function removeTestFromOrder(testId: string) {
    setSelectedTests(selectedTests.filter((test: any) => test.id !== testId))
  }

  const filteredTests = allTests.filter((test: any) =>
    test.name?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    test.code?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    test.department?.toLowerCase().includes(catalogSearch.toLowerCase())
  )

  const totalOrderValue = selectedTests.reduce((sum, test) => sum + (test.price || 0), 0)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
            <TestTube className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laboratory Management</h1>
            <p className="text-sm text-gray-500">Test orders, results, catalog & reports</p>
          </div>
        </div>

        <button
          onClick={() => setShowNewOrder(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
        >
          <Plus className="w-4 h-4" />
          New Order
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Today's Orders" 
          value={loading ? '...' : (stats.todayOrders || 0).toString()} 
          icon={ClipboardList} 
          color="purple" 
        />
        <StatCard 
          title="Pending Orders" 
          value={loading ? '...' : (stats.pendingOrders || 0).toString()} 
          icon={Clock} 
          color="orange" 
        />
        <StatCard 
          title="Completed Today" 
          value={loading ? '...' : (stats.completedToday || 0).toString()} 
          icon={Check} 
          color="green" 
        />
        <StatCard 
          title="Critical Results" 
          value={loading ? '...' : (stats.criticalResults || 0).toString()} 
          icon={AlertTriangle} 
          color="red" 
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'orders' as const, label: 'Orders', icon: ClipboardList },
          { key: 'results' as const, label: 'Results', icon: Beaker },
          { key: 'catalog' as const, label: 'Test Catalog', icon: TestTube },
          { key: 'reports' as const, label: 'Reports', icon: TrendingUp },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Lab Queue */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Today's Lab Queue ({labQueue.length})
              </h3>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {labQueue.map((order: any) => (
                <div
                  key={order.id}
                  className={`border rounded-lg p-4 ${
                    order.priority === 'stat' ? 'border-red-300 bg-red-50' :
                    order.priority === 'urgent' ? 'border-orange-300 bg-orange-50' :
                    'border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{order.patient_name}</p>
                      <p className="text-sm text-gray-500">UHID: {order.patient_uhid}</p>
                      <p className="text-sm text-gray-500">Dr. {order.doctor_name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      order.priority === 'stat' ? 'bg-red-100 text-red-800' :
                      order.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {order.priority.toUpperCase()}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-gray-700 mb-1">Tests:</p>
                    <div className="flex flex-wrap gap-1">
                      {order.test_names.map((test: string, idx: number) => (
                        <span key={idx} className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {test}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            order.progress === 100 ? 'bg-green-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${order.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{order.progress}%</span>
                    </div>
                    <div className="flex gap-1">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'collected')}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          Collect
                        </button>
                      )}
                      {order.status === 'collected' && (
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          Results
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Orders */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <div className="flex flex-col sm:flex-row gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={orderFilters.date}
                    onChange={(e: any) => setOrderFilters(prev => ({ ...prev, date: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={orderFilters.status}
                    onChange={(e: any) => setOrderFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="collected">Collected</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <DataTable
              data={orders}
              columns={[
                { 
                  key: 'id', 
                  label: 'Order ID',
                  render: (order: any) => (
                    <span className="font-mono text-sm">{order.id.slice(-8)}</span>
                  )
                },
                { 
                  key: 'patient_name', 
                  label: 'Patient',
                  render: (order: any) => (
                    <div>
                      <p className="font-medium text-gray-900">{order.patient_name}</p>
                      <p className="text-sm text-gray-500">Dr. {order.doctor_name}</p>
                    </div>
                  )
                },
                { 
                  key: 'test_names',
                  label: 'Tests',
                  render: (order: any) => (
                    <div className="max-w-xs">
                      <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {order.test_names?.length || 0} tests
                      </span>
                    </div>
                  )
                },
                { 
                  key: 'status', 
                  label: 'Status',
                  render: (order: any) => (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'collected' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status.toUpperCase()}
                    </span>
                  )
                },
                { 
                  key: 'priority', 
                  label: 'Priority',
                  render: (order: any) => (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      order.priority === 'stat' ? 'bg-red-100 text-red-800' :
                      order.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {order.priority.toUpperCase()}
                    </span>
                  )
                },
                { 
                  key: 'total_amount', 
                  label: 'Amount',
                  render: (order: any) => formatCurrency(order.total_amount || 0)
                },
                { 
                  key: 'ordered_at', 
                  label: 'Ordered',
                  render: (order: any) => (
                    <div>
                      <p className="text-sm">{new Date(order.ordered_at).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">{new Date(order.ordered_at).toLocaleTimeString()}</p>
                    </div>
                  )
                },
              ]}
              loading={loading}
              searchPlaceholder="Search orders..."
            />
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {selectedOrder ? (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Enter Results for {selectedOrder.patient_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Order ID: {selectedOrder.id} | Dr. {selectedOrder.doctor_name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {selectedOrder.test_names?.map((testName: string, idx: number) => {
                  const testId = selectedOrder.tests[idx]
                  return (
                    <div key={testId} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">{testName}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Result Value</label>
                          <input
                            type="text"
                            value={resultValues[testId]?.value || ''}
                            onChange={(e: any) => setResultValues(prev => ({
                              ...prev,
                              [testId]: { ...prev[testId], value: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter result value"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={resultValues[testId]?.status || 'normal'}
                            onChange={(e: any) => setResultValues(prev => ({
                              ...prev,
                              [testId]: { ...prev[testId], status: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="normal">Normal</option>
                            <option value="abnormal">Abnormal</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <input
                            type="text"
                            value={resultValues[testId]?.notes || ''}
                            onChange={(e: any) => setResultValues(prev => ({
                              ...prev,
                              [testId]: { ...prev[testId], notes: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Optional notes"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnterResults}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                >
                  Save Results
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border p-6 text-center">
              <TestTube className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Order</h3>
              <p className="text-gray-500">Choose an order from the queue to enter results</p>
            </div>
          )}
        </div>
      )}

      {/* Test Catalog Tab */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e: any) => setCatalogSearch(e.target.value)}
                placeholder="Search tests by name, code, or department..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <DataTable
            data={filteredTests}
            columns={[
              { 
                key: 'name', 
                label: 'Test Name',
                render: (test: any) => (
                  <div>
                    <p className="font-medium text-gray-900">{test.name}</p>
                    <p className="text-sm text-gray-500">Code: {test.code}</p>
                  </div>
                )
              },
              { key: 'department', label: 'Department' },
              { key: 'sample_type', label: 'Sample Type' },
              { key: 'normal_range', label: 'Normal Range' },
              { key: 'unit', label: 'Unit' },
              { 
                key: 'price', 
                label: 'Price',
                render: (test: any) => formatCurrency(test.price || 0)
              },
            ]}
            loading={loading}
            searchPlaceholder="Search test catalog..."
          />
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Today's Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Orders Received</span>
                  <span className="font-semibold">{stats.todayOrders || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tests Completed</span>
                  <span className="font-semibold">{stats.completedToday || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending Orders</span>
                  <span className="font-semibold text-orange-600">{stats.pendingOrders || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Critical Results</span>
                  <span className="font-semibold text-red-600">{stats.criticalResults || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue</span>
                  <span className="font-semibold text-green-600">{formatCurrency(stats.totalRevenue || 0)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Department-wise Tests</h3>
              <div className="text-center text-gray-500 py-8">
                Department breakdown chart would go here
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Monthly Trend</h3>
              <div className="text-center text-gray-500 py-8">
                Monthly test trend chart would go here
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showNewOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Create New Lab Order</h2>
                <button
                  onClick={() => setShowNewOrder(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Patient Selection */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Select Patient</h3>
                {selectedPatient ? (
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <p className="font-semibold text-indigo-900">{selectedPatient.name}</p>
                    <p className="text-sm text-indigo-700">UHID: {selectedPatient.uhid}</p>
                    <button
                      onClick={() => setSelectedPatient(null)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 mt-2"
                    >
                      Change Patient
                    </button>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {patients.slice(0, 10).map((patient: any) => (
                      <div
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer mb-2"
                      >
                        <p className="font-medium text-gray-900">{patient.name}</p>
                        <p className="text-sm text-gray-500">UHID: {patient.uhid}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Doctor Selection */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Select Doctor</h3>
                {selectedDoctor ? (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="font-semibold text-green-900">{selectedDoctor.name}</p>
                    <p className="text-sm text-green-700">{selectedDoctor.specialization}</p>
                    <button
                      onClick={() => setSelectedDoctor(null)}
                      className="text-xs text-green-600 hover:text-green-800 mt-2"
                    >
                      Change Doctor
                    </button>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {doctors.slice(0, 10).map((doctor: any) => (
                      <div
                        key={doctor.id}
                        onClick={() => setSelectedDoctor(doctor)}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer mb-2"
                      >
                        <p className="font-medium text-gray-900">{doctor.name}</p>
                        <p className="text-sm text-gray-500">{doctor.specialization}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Test Selection */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">
                  Selected Tests ({selectedTests.length})
                </h3>
                
                <div className="mb-4">
                  <div className="max-h-32 overflow-y-auto">
                    {selectedTests.map((test: any) => (
                      <div key={test.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg mb-2">
                        <div>
                          <p className="text-sm font-medium">{test.name}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(test.price || 0)}</p>
                        </div>
                        <button
                          onClick={() => removeTestFromOrder(test.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700">Total: {formatCurrency(totalOrderValue)}</p>
                </div>

                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {allTests.slice(0, 20).map((test: any) => (
                    <div
                      key={test.id}
                      className="p-3 border-b border-gray-100 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{test.name}</p>
                          <p className="text-xs text-gray-500">{test.department} | {formatCurrency(test.price || 0)}</p>
                        </div>
                        <button
                          onClick={() => addTestToOrder(test)}
                          disabled={selectedTests.find(t => t.id === test.id) !== undefined}
                          className="px-2 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600 disabled:bg-gray-300"
                        >
                          {selectedTests.find(t => t.id === test.id) ? '✓' : '+'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-4">
              <button
                onClick={() => setShowNewOrder(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={!selectedPatient || !selectedDoctor || selectedTests.length === 0}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-300"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}