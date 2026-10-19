import { Link } from "react-router-dom";
import { SERVICES, type Service } from "../../data/services";
import { PORTFOLIO_COUNT } from "../../data/portfolio";

function Card({ s }: { s: Service }) {
  const shot = s.shot ? (
    <div className={`shot ${s.shot.frame}`}>
      <img src={s.shot.src} alt={s.shot.alt} loading="lazy" />
    </div>
  ) : (
    <div className="shot none">화면 공개 예정</div>
  );
  const meta = (
    <span className="meta">
      <span className={s.status === "live" ? undefined : "soon"}>{s.statusLabel}</span> · {s.kind}
    </span>
  );
  const body = (
    <>
      {shot}
      {meta}
      <h3>{s.name}</h3>
    </>
  );
  if (!s.href) return <div>{body}</div>;
  if (s.external)
    return (
      <a href={s.href} target="_blank" rel="noopener noreferrer">
        {body}
      </a>
    );
  return <Link to={s.href}>{body}</Link>;
}

export default function ProductRail() {
  return (
    <>
      <div className="sec">
        <h2 className="reveal">만든 것</h2>
        <p className="sub reveal">지금 직접 운영하는 서비스와, 곧 나올 것들.</p>
      </div>
      <ul className="rail">
        {SERVICES.map((s) => (
          <li className="pc" key={s.id}>
            <Card s={s} />
          </li>
        ))}
      </ul>
      <p className="more-line">
        <Link className="lk" to="/portfolio">
          제작 이력 {PORTFOLIO_COUNT}건 전체 보기
        </Link>
      </p>
    </>
  );
}
