import { STORY } from "../../data/home";

export default function Story() {
  return (
    <section className="story" id="story">
      <h2 className="reveal">
        회사에서 배우고,
        <br />
        맡아서 만들고,
        <br />
        이제 제 것을 만듭니다
      </h2>
      <ol className="years">
        {STORY.map((s) => (
          <li className={`yr reveal${s.now ? " now" : ""}`} key={s.year}>
            <span className="y tnum">{s.year}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
