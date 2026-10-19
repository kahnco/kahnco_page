// mermaid 'base' 테마 변수를 현재 CSS 토큰에서 뽑는다 → 라이트/다크 모두 본문과 같은 색.
export function mermaidThemeVariables(read: (name: string) => string): Record<string, string> {
  const bg = read("--bg");
  const tile = read("--tile");
  const text = read("--text");
  const text3 = read("--text-3");
  const line = read("--line");
  return {
    fontFamily: read("--sans"),
    background: bg,
    mainBkg: tile,
    primaryColor: tile,
    secondaryColor: tile,
    tertiaryColor: bg,
    primaryTextColor: text,
    secondaryTextColor: text,
    tertiaryTextColor: text,
    textColor: text,
    primaryBorderColor: line,
    nodeBorder: line,
    clusterBkg: bg,
    clusterBorder: line,
    lineColor: text3,
    edgeLabelBackground: bg,
    noteBkgColor: tile,
    noteTextColor: text,
    noteBorderColor: line,
    actorBkg: tile,
    actorBorder: line,
    actorTextColor: text,
    signalColor: text3,
    signalTextColor: text,
  };
}
