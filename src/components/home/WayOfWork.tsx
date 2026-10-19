import { WAYS } from "../../data/home";

// <details name> 로 하나만 열리는 펼침 목록 — JS 없이도 동작한다.
export default function WayOfWork() {
  return (
    <section className="way">
      <h2 className="reveal">이렇게 일합니다</h2>
      <div className="acc reveal">
        {WAYS.map((w, i) => (
          <details key={w.title} open={i === 0} {...{ name: "way" }}>
            <summary>{w.title}</summary>
            <p>{w.body}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
