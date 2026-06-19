import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Products from './components/masters/Products';
import Customers from './components/masters/Customers';
import Suppliers from './components/masters/Suppliers';
import VAT from './components/masters/VAT';
import Sales from './components/transactions/Sales';
import Purchases from './components/transactions/Purchases';
import Inventory from './components/transactions/Inventory';
import Reports from './components/Reports';
import Login from './components/Login';
import RequireAuth from './components/RequireAuth';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="customers" element={<Customers />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="vat" element={<VAT />} />
              {/* Redirect old /gst route to /vat */}
              <Route path="gst" element={<Navigate to="/vat" replace />} />
              <Route path="sales" element={<Sales />} />
              <Route path="purchases" element={<Purchases />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="reports" element={<Reports />} />
            </Route>
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
