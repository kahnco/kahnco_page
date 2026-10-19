import { careerYears } from "../../data/home";
import { PORTFOLIO_COUNT } from "../../data/portfolio";
import { LIVE_COUNT } from "../../data/services";
import { BLOG_POST_COUNT } from "../../data/posts";

export default function Numbers() {
  const items = [
    ["개발 경력", `${careerYears(new Date())}년`],
    ["제작 이력", `${PORTFOLIO_COUNT}건`],
    ["지금 운영 중", `${LIVE_COUNT}`],
    ["기술 블로그", `${BLOG_POST_COUNT}편`],
  ];
  return (
    <section className="nums" aria-label="숫자로 본 이력">
      <dl>
        {items.map(([k, v]) => (
          <div className="reveal" key={k}>
            <dt>{k}</dt>
            <dd className="tnum">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
