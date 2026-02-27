'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { 
  getPharmacyInventory, 
  getPharmacySales, 
  createSale, 
  getStockAlerts, 
  getPharmacyStats, 
  PharmacyItem, 
  PharmacySale,
  StockAlert 
} from '@/lib/pharmacy-engine'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import StatCard from '@/components/StatCard'
import { 
  Pill, 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  Search, 
  Plus,
  Minus,
  Calendar,
  Filter,
  Printer,
  User,
  Clock
} from 'lucide-react'

type TabType = 'dispensing' | 'inventory' | 'sales' | 'alerts'

export default function PharmacyPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dispensing')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({})
  
  // Dispensing state
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState<any[]>([])
  const [cartItems, setCartItems] = useState<any[]>([])
  const [dispensingItems, setDispensingItems] = useState<PharmacyItem[]>([])
  const [itemSearch, setItemSearch] = useState('')

  // Inventory state
  const [inventory, setInventory] = useState<PharmacyItem[]>([])
  const [inventorySearch, setInventorySearch] = useState('')

  // Sales state
  const [sales, setSales] = useState<PharmacySale[]>([])
  const [salesDateRange, setSalesDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })

  // Alerts state
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (activeTab === 'sales') {
      loadSalesData()
    }
  }, [activeTab, salesDateRange])

  async function loadInitialData() {
    setLoading(true)
    try {
      const [statsData, inventoryData, alertsData] = await Promise.all([
        getPharmacyStats(),
        getPharmacyInventory(),
        getStockAlerts()
      ])
      
      setStats(statsData)
      setInventory(inventoryData)
      setDispensingItems(inventoryData)
      setStockAlerts(alertsData)
      
      // Load patients for dispensing
      const { data: patientsData } = await supabase
        .from('patients')
        .select('id, name, phone, uhid')
        .order('name')
        .limit(100)
      setPatients(patientsData || [])
      
    } catch (error) {
      console.error('Error loading pharmacy data:', error)
    }
    setLoading(false)
  }

  async function loadSalesData() {
    try {
      const salesData = await getPharmacySales(salesDateRange)
      setSales(salesData)
    } catch (error) {
      console.error('Error loading sales data:', error)
    }
  }

  function addToCart(item: PharmacyItem) {
    const existingItem = cartItems.find(cartItem => cartItem.id === item.id)
    if (existingItem) {
      setCartItems(cartItems.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ))
    } else {
      setCartItems([...cartItems, {
        ...item,
        quantity: 1,
        rate: item.current_rate || item.mrp || 0
      }])
    }
  }

  function removeFromCart(itemId: string) {
    setCartItems(cartItems.filter((item: any) => item.id !== itemId))
  }

  function updateCartQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }
    setCartItems(cartItems.map((item: any) => 
      item.id === itemId ? { ...item, quantity } : item
    ))
  }

  async function dispenseMedicines() {
    if (!selectedPatient || cartItems.length === 0) {
      alert('Please select patient and add medicines to cart')
      return
    }

    try {
      const saleItems = cartItems.map((item: any) => ({
        item_id: item.id,
        item_name: item.name,
        quantity: item.quantity,
        rate: item.rate
      }))

      await createSale(selectedPatient.id, saleItems)
      
      // Reset dispensing form
      setCartItems([])
      setSelectedPatient(null)
      setPatientSearch('')
      
      // Refresh stats
      const newStats = await getPharmacyStats()
      setStats(newStats)
      
      alert('Medicines dispensed successfully!')
    } catch (error) {
      console.error('Error dispensing medicines:', error)
      alert('Error dispensing medicines. Please try again.')
    }
  }

  const filteredPatients = patients.filter(patient =>
    patient.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    patient.uhid?.toLowerCase().includes(patientSearch.toLowerCase()) ||
    patient.phone?.includes(patientSearch)
  )

  const filteredDispensingItems = dispensingItems.filter((item: any) =>
    item.name?.toLowerCase().includes(itemSearch.toLowerCase()) &&
    (item.stock_quantity || 0) > 0
  )

  const filteredInventory = inventory.filter((item: any) =>
    item.name?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    item.generic_name?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    item.manufacturer?.toLowerCase().includes(inventorySearch.toLowerCase())
  )

  const cartTotal = cartItems.reduce((sum: any, item: any) => sum + (item.quantity * item.rate), 0)

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
          <Pill className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy Management</h1>
          <p className="text-sm text-gray-500">Dispensing, inventory, sales & stock alerts</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Today's Revenue" 
          value={loading ? '...' : formatCurrency(stats.todayRevenue || 0)} 
          icon={ShoppingCart} 
          color="green" 
        />
        <StatCard 
          title="Total Items" 
          value={loading ? '...' : (stats.totalItems || 0).toLocaleString()} 
          icon={Package} 
          color="blue" 
        />
        <StatCard 
          title="Low Stock" 
          value={loading ? '...' : (stats.lowStockItems || 0).toString()} 
          icon={AlertTriangle} 
          color="orange" 
        />
        <StatCard 
          title="Out of Stock" 
          value={loading ? '...' : (stats.outOfStockItems || 0).toString()} 
          icon={AlertTriangle} 
          color="red" 
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'dispensing' as const, label: 'Dispensing', icon: ShoppingCart },
          { key: 'inventory' as const, label: 'Inventory', icon: Package },
          { key: 'sales' as const, label: 'Sales History', icon: Calendar },
          { key: 'alerts' as const, label: 'Stock Alerts', icon: AlertTriangle },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dispensing Tab */}
      {activeTab === 'dispensing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Selection */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Select Patient
            </h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e: any) => setPatientSearch(e.target.value)}
                placeholder="Search patient by name, UHID, or phone..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {selectedPatient ? (
              <div className="bg-emerald-50 p-3 rounded-lg">
                <p className="font-semibold text-emerald-900">{selectedPatient.name}</p>
                <p className="text-sm text-emerald-700">UHID: {selectedPatient.uhid}</p>
                <p className="text-sm text-emerald-700">Phone: {selectedPatient.phone}</p>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs text-emerald-600 hover:text-emerald-800 mt-2"
                >
                  Change Patient
                </button>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {filteredPatients.map((patient: any) => (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer mb-2"
                  >
                    <p className="font-medium text-gray-900">{patient.name}</p>
                    <p className="text-sm text-gray-500">UHID: {patient.uhid}</p>
                    <p className="text-sm text-gray-500">Phone: {patient.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medicine Selection */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Select Medicines
            </h3>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e: any) => setItemSearch(e.target.value)}
                placeholder="Search medicines..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="max-h-80 overflow-y-auto">
              {filteredDispensingItems.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 mb-2"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.generic_name}</p>
                      <p className="text-sm text-emerald-600">
                        Stock: {item.stock_quantity} | {formatCurrency(item.current_rate || item.mrp || 0)}
                      </p>
                    </div>
                    <button
                      onClick={() => addToCart(item)}
                      className="px-3 py-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Cart ({cartItems.length})
            </h3>

            <div className="max-h-80 overflow-y-auto mb-4">
              {cartItems.map((item: any) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-3 mb-2">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.rate)} each</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-semibold text-emerald-600 text-sm">
                      {formatCurrency(item.quantity * item.rate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-gray-900">Total:</span>
                <span className="font-bold text-emerald-600 text-lg">
                  {formatCurrency(cartTotal)}
                </span>
              </div>

              <button
                onClick={dispenseMedicines}
                disabled={!selectedPatient || cartItems.length === 0}
                className="w-full py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Dispense Medicines
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={inventorySearch}
                  onChange={(e: any) => setInventorySearch(e.target.value)}
                  placeholder="Search medicines by name, generic, manufacturer..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>
          </div>

          <DataTable
            data={filteredInventory}
            columns={[
              { 
                key: 'name', 
                label: 'Medicine Name',
                render: (item: any) => (
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.generic_name}</p>
                  </div>
                )
              },
              { key: 'manufacturer', label: 'Manufacturer' },
              { key: 'batch_number', label: 'Batch' },
              { 
                key: 'stock_quantity', 
                label: 'Stock',
                render: (item: any) => {
                  const stock = item.stock_quantity || 0
                  const reorderLevel = item.reorder_level || 5
                  return (
                    <span className={`font-medium ${
                      stock <= 0 ? 'text-red-600' : 
                      stock <= reorderLevel ? 'text-orange-600' : 
                      'text-green-600'
                    }`}>
                      {stock}
                    </span>
                  )
                }
              },
              { 
                key: 'mrp', 
                label: 'MRP',
                render: (item: any) => formatCurrency(item.mrp || 0)
              },
              { 
                key: 'current_rate', 
                label: 'Current Rate',
                render: (item: any) => formatCurrency(item.current_rate || item.purchase_rate || 0)
              },
              { key: 'expiry_date', label: 'Expiry Date' },
              { key: 'rack_location', label: 'Location' },
            ]}
            loading={loading}
            searchPlaceholder="Search inventory..."
          />
        </div>
      )}

      {/* Sales History Tab */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <input
                    type="date"
                    value={salesDateRange.from}
                    onChange={(e: any) => setSalesDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <input
                    type="date"
                    value={salesDateRange.to}
                    onChange={(e: any) => setSalesDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex-1"></div>
              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                <Printer className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          <DataTable
            data={sales}
            columns={[
              { key: 'id', label: 'Bill ID' },
              { 
                key: 'patient_name', 
                label: 'Patient',
                render: (sale: any) => (
                  <div>
                    <p className="font-medium text-gray-900">{sale.patient_name || 'Walk-in'}</p>
                    <p className="text-sm text-gray-500">{sale.patient_id}</p>
                  </div>
                )
              },
              { 
                key: 'items',
                label: 'Items',
                render: (sale: any) => (
                  <span className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {sale.items?.length || 0} items
                  </span>
                )
              },
              { 
                key: 'total_amount', 
                label: 'Total',
                render: (sale: any) => (
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(sale.total_amount || 0)}
                  </span>
                )
              },
              { 
                key: 'discount', 
                label: 'Discount',
                render: (sale: any) => formatCurrency(sale.discount || 0)
              },
              { 
                key: 'net_amount', 
                label: 'Net Amount',
                render: (sale: any) => (
                  <span className="font-semibold">
                    {formatCurrency(sale.net_amount || 0)}
                  </span>
                )
              },
              { 
                key: 'created_at', 
                label: 'Date & Time',
                render: (sale: any) => (
                  <div>
                    <p className="text-sm">{new Date(sale.created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500">{new Date(sale.created_at).toLocaleTimeString()}</p>
                  </div>
                )
              },
            ]}
            loading={loading}
            searchPlaceholder="Search sales..."
          />
        </div>
      )}

      {/* Stock Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-lg font-semibold text-red-900">
                    {stockAlerts.filter(alert => alert.status === 'out_of_stock').length}
                  </p>
                  <p className="text-sm text-red-700">Out of Stock</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-lg font-semibold text-orange-900">
                    {stockAlerts.filter(alert => alert.status === 'low_stock').length}
                  </p>
                  <p className="text-sm text-orange-700">Low Stock</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-lg font-semibold text-yellow-900">
                    {stockAlerts.filter(alert => alert.status === 'expiring_soon').length}
                  </p>
                  <p className="text-sm text-yellow-700">Expiring Soon</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border">
            <DataTable
              data={stockAlerts}
              columns={[
                { 
                  key: 'item_name', 
                  label: 'Medicine Name',
                  render: (alert: any) => (
                    <span className="font-medium text-gray-900">{alert.item_name}</span>
                  )
                },
                { 
                  key: 'current_stock', 
                  label: 'Current Stock',
                  render: (alert: any) => (
                    <span className={`font-medium ${
                      alert.current_stock <= 0 ? 'text-red-600' : 'text-orange-600'
                    }`}>
                      {alert.current_stock}
                    </span>
                  )
                },
                { key: 'reorder_level', label: 'Reorder Level' },
                { 
                  key: 'status', 
                  label: 'Status',
                  render: (alert: any) => (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      alert.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                      alert.status === 'low_stock' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {alert.status.replace('_', ' ').toUpperCase()}
                    </span>
                  )
                },
                { 
                  key: 'expiry_date', 
                  label: 'Expiry Date',
                  render: (alert: any) => alert.expiry_date || '—'
                },
              ]}
              loading={loading}
              searchPlaceholder="Search alerts..."
            />
          </div>
        </div>
      )}
    </div>
  )
}