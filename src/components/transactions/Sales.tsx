import React, { useState, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Sale, SaleItem } from '../../types';
import { Plus, Edit, Trash2, Search, Eye, X, Printer } from 'lucide-react';

const Sales: React.FC = () => {
  const { sales, setSales, customers, products, setProducts } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    customerId: '',
    items: [] as SaleItem[],
    discount: '',
    tax: '',
    paymentMethod: '',
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
  });

  const [newItem, setNewItem] = useState({
    productId: '',
    quantity: '',
  });

  const filteredSales = sales.filter(sale =>
    sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.id.includes(searchTerm)
  );

  const resetForm = () => {
    setFormData({
      customerId: '',
      items: [],
      discount: '',
      tax: '',
      paymentMethod: '',
      status: 'pending',
    });
    setNewItem({ productId: '', quantity: '' });
    setEditingSale(null);
    setShowForm(false);
  };

  const addItem = () => {
    if (!newItem.productId || !newItem.quantity) return;

    const product = products.find(p => p.id === newItem.productId);
    if (!product) return;

    const quantity = parseInt(newItem.quantity);
    const total = product.price * quantity;

    const item: SaleItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      price: product.price,
      total,
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item],
    }));

    setNewItem({ productId: '', quantity: '' });
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const discount = parseFloat(formData.discount) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const total = subtotal + tax - discount;
    return { subtotal, discount, tax, total };
  };

  const printInvoice = (sale: Sale) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${sale.id.slice(-6)}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #000;
            padding: 30px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
          }
          .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
          }
          .header p {
            font-size: 14px;
            color: #666;
          }
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .invoice-details div {
            flex: 1;
          }
          .invoice-details h3 {
            font-size: 16px;
            margin-bottom: 10px;
            color: #000;
          }
          .invoice-details p {
            font-size: 14px;
            margin-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          table th {
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
            font-weight: bold;
          }
          table td {
            border: 1px solid #ddd;
            padding: 10px;
          }
          .totals {
            float: right;
            width: 300px;
            margin-top: 20px;
          }
          .totals table {
            margin-bottom: 0;
          }
          .totals table td {
            border: none;
            padding: 8px;
          }
          .totals .total-row {
            font-weight: bold;
            font-size: 16px;
            border-top: 2px solid #000;
          }
          .footer {
            clear: both;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body {
              padding: 0;
            }
            .invoice-container {
              border: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <h1>SALES INVOICE</h1>
            <p>Billing Software</p>
          </div>

          <div class="invoice-details">
            <div>
              <h3>Invoice Details</h3>
              <p><strong>Invoice #:</strong> ${sale.id.slice(-6)}</p>
              <p><strong>Date:</strong> ${new Date(sale.createdAt).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${sale.status.toUpperCase()}</p>
            </div>
            <div style="text-align: right;">
              <h3>Customer Details</h3>
              <p><strong>${sale.customerName}</strong></p>
              <p>Payment: ${sale.paymentMethod.replace('_', ' ').toUpperCase()}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th>Product</th>
                <th style="width: 100px; text-align: center;">Quantity</th>
                <th style="width: 120px; text-align: right;">Price</th>
                <th style="width: 120px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.productName}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">₹${item.price.toLocaleString()}</td>
                  <td style="text-align: right;">₹${item.total.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">₹${sale.subtotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Discount:</td>
                <td style="text-align: right;">₹${sale.discount.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Tax:</td>
                <td style="text-align: right;">₹${sale.tax.toLocaleString()}</td>
              </tr>
              <tr class="total-row">
                <td>Total:</td>
                <td style="text-align: right;">₹${sale.total.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is a computer-generated invoice.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const customer = customers.find(c => c.id === formData.customerId);
    if (!customer) {
      alert('Please select a customer');
      return;
    }

    const { subtotal, discount, tax, total } = calculateTotals();

    if (editingSale) {
      // Update existing sale
      const updatedSale: Sale = {
        ...editingSale,
        customerId: formData.customerId,
        customerName: customer.name,
        items: formData.items,
        subtotal,
        tax,
        discount,
        total,
        paymentMethod: formData.paymentMethod,
        status: formData.status,
        updatedAt: new Date(),
      };

      setSales(prev => prev.map(sale =>
        sale.id === editingSale.id ? updatedSale : sale
      ));

      // Print invoice after update
      setTimeout(() => printInvoice(updatedSale), 100);
    } else {
      // Add new sale
      const newSale: Sale = {
        id: Date.now().toString(),
        customerId: formData.customerId,
        customerName: customer.name,
        items: formData.items,
        subtotal,
        tax,
        discount,
        total,
        paymentMethod: formData.paymentMethod,
        status: formData.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setSales(prev => [...prev, newSale]);

      // Update product stock
      formData.items.forEach(item => {
        setProducts(prev => prev.map(product =>
          product.id === item.productId
            ? { ...product, stock: product.stock - item.quantity }
            : product
        ));
      });

      // Print invoice after save
      setTimeout(() => printInvoice(newSale), 100);
    }

    resetForm();
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      customerId: sale.customerId,
      items: sale.items,
      discount: sale.discount.toString(),
      tax: sale.tax.toString(),
      paymentMethod: sale.paymentMethod,
      status: sale.status,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      setSales(prev => prev.filter(sale => sale.id !== id));
    }
  };

  const { subtotal, discount, tax, total } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Sale
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search sales..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sale ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{sale.id.slice(-6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sale.items.length} item{sale.items.length > 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    ₹{sale.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                      sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => printInvoice(sale)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Print Invoice"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewingSale(sale)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(sale)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredSales.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No sales found</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingSale ? 'Edit Sale' : 'New Sale'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Add Items */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>

                  {/* Add Item Form */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                      <select
                        value={newItem.productId}
                        onChange={(e) => setNewItem({ ...newItem, productId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Product</option>
                        {products.filter(p => p.stock > 0).map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} (₹{product.price}) - Stock: {product.stock}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={addItem}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  {formData.items.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {formData.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.productName}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">₹{item.price}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">₹{item.total}</td>
                              <td className="px-4 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Totals and Payment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                      <select
                        required
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Payment Method</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="credit">Credit</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tax (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.tax}
                        onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Subtotal:</span>
                        <span className="text-sm font-medium">₹{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Discount:</span>
                        <span className="text-sm font-medium">₹{discount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tax:</span>
                        <span className="text-sm font-medium">₹{tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total:</span>
                        <span>₹{total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingSale ? 'Update' : 'Create'} Sale & Print Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Sale Modal */}
      {viewingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Sale Details</h2>
                <button
                  onClick={() => setViewingSale(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Sale ID:</span>
                    <p className="font-medium">#{viewingSale.id.slice(-6)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Customer:</span>
                    <p className="font-medium">{viewingSale.customerName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Date:</span>
                    <p className="font-medium">{new Date(viewingSale.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      viewingSale.status === 'completed' ? 'bg-green-100 text-green-800' :
                      viewingSale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {viewingSale.status}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Items</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {viewingSale.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.productName}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">₹{item.price}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">₹{item.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <span className="text-sm font-medium">₹{viewingSale.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Discount:</span>
                    <span className="text-sm font-medium">₹{viewingSale.discount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tax:</span>
                    <span className="text-sm font-medium">₹{viewingSale.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>₹{viewingSale.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Payment Method:</span>
                    <span className="text-sm font-medium capitalize">{viewingSale.paymentMethod}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => printInvoice(viewingSale)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
