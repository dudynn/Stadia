import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>404</h1>
      <p>페이지를 찾을 수 없음</p>
      <Link to="/">홈으로</Link>
    </div>
  );
}
