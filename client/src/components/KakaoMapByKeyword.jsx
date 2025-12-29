import { useEffect, useRef, useState } from "react";

const KAKAO_KEY = import.meta.env.VITE_KAKAO_JS_KEY;

function loadKakaoSdk() {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps) return resolve(window.kakao);

    if (!KAKAO_KEY) {
      return reject(new Error("VITE_KAKAO_JS_KEY is missing"));
    }

    const existing = document.querySelector('script[data-kakao-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.kakao));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.dataset.kakaoSdk = "true";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`;
    script.onload = () => resolve(window.kakao);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function KakaoMapByKeyword({ keyword, height = 240 }) {
  const mapRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | noresult | error

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!keyword?.trim()) {
        setStatus("idle");
        return;
      }

      setStatus("loading");
      try {
        const kakao = await loadKakaoSdk();
        kakao.maps.load(() => {
          if (!alive) return;

          const container = mapRef.current;
          if (!container) return;

          const map = new kakao.maps.Map(container, {
            center: new kakao.maps.LatLng(37.5665, 126.978), // 임시(서울)
            level: 4,
          });

          const places = new kakao.maps.services.Places();

          places.keywordSearch(keyword, (data, status) => {
            if (!alive) return;

            if (status === kakao.maps.services.Status.OK && data?.length) {
              const first = data[0];
              const lat = Number(first.y);
              const lng = Number(first.x);
              const pos = new kakao.maps.LatLng(lat, lng);

              map.setCenter(pos);

              const marker = new kakao.maps.Marker({ position: pos });
              marker.setMap(map);

              const info = new kakao.maps.InfoWindow({
                content: `<div style="padding:6px 8px;font-size:12px;">${first.place_name}</div>`,
              });
              info.open(map, marker);

              setStatus("ok");
            } else {
              setStatus("noresult");
            }
          });
        });
      } catch (e) {
        console.error(e);
        if (alive) setStatus("error");
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [keyword]);

  return (
    <div>
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height,
          borderRadius: 14,
          border: "1px solid #eee",
          overflow: "hidden",
          background: "#fafafa",
        }}
      />
      {status === "loading" && (
        <div style={{ marginTop: 8, color: "#666", fontSize: 13 }}>
          지도에서 장소 검색 중...
        </div>
      )}
      {status === "noresult" && (
        <div style={{ marginTop: 8, color: "#b45309", fontSize: 13 }}>
          검색 결과가 없습니다. 장소 이름을 다시 확인해주세요.
        </div>
      )}
      {status === "error" && (
        <div style={{ marginTop: 8, color: "crimson", fontSize: 13 }}>
          지도를 불러오지 못했습니다. 키 설정을 확인해주세요.
        </div>
      )}
    </div>
  );
}
