import { Outlet, NavLink, useLocation } from "react-router-dom";
import RequireGuest from "./RequireGuest";

const linkStyle = ({ isActive }) => ({
  flex: 1,
  textAlign: "center",
  padding: "10px 8px",
  textDecoration: "none",
  color: isActive ? "#111" : "#777",
  fontWeight: isActive ? 700 : 500,
});

export default function AppShell() {
  const location = useLocation();
  const isWrite = location.pathname === "/write";

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <RequireGuest />

      {/* 본문 */}
      <div style={{ paddingBottom: 78 }}>
        <Outlet />
      </div>

      {/* 하단 탭바 */}
      <nav
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: 64,
          display: "flex",
          alignItems: "center",
          borderTop: "1px solid #eee",
          background: "#fff",
        }}
      >
        <NavLink to="/" style={linkStyle}>
          HOME
        </NavLink>

        <NavLink
          to="/write"
          style={({ isActive }) => ({
            ...linkStyle({ isActive }),
            position: "relative",
          })}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 999,
              border: "1px solid #ddd",
              background: isWrite ? "#111" : "#f4f4f4",
              color: isWrite ? "#fff" : "#111",
              fontSize: 20,
              fontWeight: 800,
              transform: "translateY(-10px)",
            }}
          >
            +
          </span>
          <div style={{ marginTop: -6, fontSize: 12 }}>기록</div>
        </NavLink>

        <NavLink to="/mypage" style={linkStyle}>
          MY
        </NavLink>
      </nav>
    </div>
  );
}
