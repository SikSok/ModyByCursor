import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/Login';
import DriverReviewPage from './pages/DriverReview';
import StatsPage from './pages/Stats';
import UserListPage from './pages/UserList';
import BasicLayout from './layouts/BasicLayout';

function isAuthed() {
  return Boolean(localStorage.getItem('admin_token'));
}

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={isAuthed() ? <BasicLayout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to="/stats" replace />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="users" element={<UserListPage />} />
        <Route path="drivers/pending" element={<DriverReviewPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

