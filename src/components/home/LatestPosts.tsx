import { LATEST_POSTS } from "../../data/posts";

const SHOW = 4;

export default function LatestPosts() {
  return (
    <>
      <div className="sec">
        <h2 className="reveal">생각은 글로 남깁니다</h2>
        <p className="sub reveal">만들면서 배운 것을 블로그에 씁니다.</p>
      </div>
      <ul className="posts">
        {LATEST_POSTS.slice(0, SHOW).map((p) => (
          <li key={p.slug}>
            <a className="pl" href={`/blog/${p.slug}`}>
              <h3>{p.title}</h3>
              {p.excerpt && <p>{p.excerpt}</p>}
              <small className="tnum">{p.date}</small>
            </a>
          </li>
        ))}
        <li className="more-line">
          <a className="lk" href="/blog">
            블로그 전체 보기
          </a>
        </li>
      </ul>
    </>
  );
}
