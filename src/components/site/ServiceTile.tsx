import { Link } from "react-router-dom";
import type { Service } from "../../data/services";
import { BrowserFrame, PhoneFrame } from "./DeviceFrame";

function Go({ s }: { s: Service }) {
  if (!s.href) return null;
  const label = s.cta ?? "사용해 보기";
  return (
    <p className="go">
      {s.external ? (
        <a className="lk" href={s.href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      ) : (
        <Link className="lk" to={s.href}>
          {label}
        </Link>
      )}
    </p>
  );
}

// 서비스 하나 = 타일 하나. full 이면 한 화면을 다 차지한다.
export default function ServiceTile({ service: s, full = false }: { service: Service; full?: boolean }) {
  return (
    <section className={full ? "tile full" : "tile"} aria-label={s.name}>
      <h2 className="name">{s.name}</h2>
      <p className="tl">{s.tagline}</p>
      <p className="st">
        {s.status !== "live" && (
          <>
            <span className="soon">{s.statusLabel}</span> ·{" "}
          </>
        )}
        {s.kind}
      </p>
      <Go s={s} />
      <div className="vis">
        {s.shot?.frame === "browser" && <BrowserFrame src={s.shot.src} alt={s.shot.alt} url={s.shot.url} />}
        {s.shot?.frame === "phone" && <PhoneFrame src={s.shot.src} alt={s.shot.alt} />}
        {!s.shot && <div className="frame-empty">화면 공개 예정</div>}
      </div>
    </section>
  );
}
