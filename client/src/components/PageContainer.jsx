export default function PageContainer({ children }) {
  return (
    <div style={outer}>
      <div style={inner}>{children}</div>
    </div>
  );
}

const outer = {
  display: "flex",
  justifyContent: "center",
  width: "100%",
};

const inner = {
  width: "100%",
  maxWidth: 420,
  padding: "0 16px 80px",
  boxSizing: "border-box",
};
