import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./app/AppShell.jsx";
import HomePage from "./pages/HomePage.jsx";
import WritePage from "./pages/WritePage.jsx";
import MyPage from "./pages/MyPage.jsx";
import FavoritePage from "./pages/FavoritePage.jsx";
import DiaryDetailPage from "./pages/DiaryDetailPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        {/* 하단 탭 바 포함 레이아웃 */}
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/write" element={<WritePage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/favorite" element={<FavoritePage />} />
          <Route path="/diary/:id" element={<DiaryDetailPage />} />
          <Route path="/write/:id" element={<WritePage />} />
        </Route>

        {/* +) /home 같은 경로로 왔을 때 /로 보내기 */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
