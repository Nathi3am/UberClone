import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Drivers from './pages/Drivers'
import AdminPricing from './pages/AdminPricing'
import Commission from './pages/Commission'
import DriverDetails from './pages/DriverDetails'
import AdminDriverDetails from './pages/AdminDriverDetails'
import DeletedProfiles from './pages/DeletedProfiles'
import SpecialRequests from './pages/SpecialRequests'
import Settings from './pages/Settings'
import Rides from './pages/Rides'
import Earnings from './pages/Earnings'
import PayoutsRecords from './pages/PayoutsRecords'
// ...existing code...
import TripsDrivers from './pages/TripsDrivers'
import LetsEatLocal from './pages/LetsEatLocal'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'

export default function App(){
  return (
    <div>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="login" element={<Login/>} />
          <Route path="dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute><Users/></ProtectedRoute>} />
          <Route path="drivers" element={<ProtectedRoute><Drivers/></ProtectedRoute>} />
          <Route path="drivers/:driverId" element={<ProtectedRoute><AdminDriverDetails/></ProtectedRoute>} />
          <Route path="pricing" element={<ProtectedRoute><AdminPricing/></ProtectedRoute>} />
          <Route path="deleted-profiles" element={<ProtectedRoute><DeletedProfiles/></ProtectedRoute>} />
          <Route path="special-requests" element={<ProtectedRoute><SpecialRequests/></ProtectedRoute>} />
          <Route path="trips-drivers" element={<ProtectedRoute><TripsDrivers/></ProtectedRoute>} />
          <Route path="lets-eat-local" element={<ProtectedRoute><LetsEatLocal/></ProtectedRoute>} />
// ...existing code...
          <Route path="settings" element={<ProtectedRoute><Settings/></ProtectedRoute>} />
          <Route path="commission" element={<ProtectedRoute><Commission/></ProtectedRoute>} />
          <Route path="payouts-records" element={<ProtectedRoute><PayoutsRecords/></ProtectedRoute>} />
          <Route path="rides" element={<ProtectedRoute><Rides/></ProtectedRoute>} />
          <Route path="earnings" element={<ProtectedRoute><Earnings/></ProtectedRoute>} />
        </Route>
      </Routes>
    </div>
  )
}
