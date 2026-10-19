import { LAYERS } from "../../data/home";

export default function Layers() {
  return (
    <section className="layers">
      <div className="wrap">
        <h2 className="reveal">한 사람이 네 겹을 다 맡습니다</h2>
        <ol className="stack">
          {LAYERS.map((l) => (
            <li className="ly reveal" key={l.name}>
              <b>{l.name}</b>
              <span>{l.stack}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
