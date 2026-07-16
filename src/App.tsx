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
import ChartOfAccounts from './components/accounting/ChartOfAccounts';
import JournalEntries from './components/accounting/JournalEntries';
import AccountingReports from './components/accounting/AccountingReports';
import GSTReports from './components/accounting/GSTReports';
import CompanySettingsPage from './components/settings/CompanySettings';
import ErrorBoundary from './components/ErrorBoundary';

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
              {/* Masters */}
              <Route path="products" element={<Products />} />
              <Route path="customers" element={<Customers />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="vat" element={<VAT />} />
              <Route path="gst" element={<Navigate to="/vat" replace />} />
              {/* Transactions */}
              <Route path="sales" element={<Sales />} />
              <Route path="purchases" element={<Purchases />} />
              <Route path="inventory" element={<Inventory />} />
              {/* Accounting — wrapped with ErrorBoundary to catch stale data crashes */}
              <Route path="accounting/accounts" element={
                <ErrorBoundary fallbackTitle="Chart of Accounts Error">
                  <ChartOfAccounts />
                </ErrorBoundary>
              } />
              <Route path="accounting/journals" element={
                <ErrorBoundary fallbackTitle="Journal Entries Error">
                  <JournalEntries />
                </ErrorBoundary>
              } />
              <Route path="accounting/reports" element={
                <ErrorBoundary fallbackTitle="Accounting Reports Error">
                  <AccountingReports />
                </ErrorBoundary>
              } />
              {/* Tax Returns */}
              <Route path="tax/returns" element={
                <ErrorBoundary fallbackTitle="Tax Returns Error">
                  <GSTReports />
                </ErrorBoundary>
              } />
              {/* Reports */}
              <Route path="reports" element={<Reports />} />
              {/* Settings */}
              <Route path="settings/company" element={
                <ErrorBoundary fallbackTitle="Company Settings Error">
                  <CompanySettingsPage />
                </ErrorBoundary>
              } />
            </Route>
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
