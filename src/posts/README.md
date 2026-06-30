# 블로그 글 작성 가이드

이 폴더의 `.md` 파일 1개가 블로그 글 1편입니다. 파일을 추가하면 자동으로 목록에 노출됩니다.
(이 `README.md`는 `*.md` glob에 포함되지만 frontmatter가 없어 제목이 `readme`로만 잡히므로,
`draft: true`로 둘 글이 아니라면 신경 쓰지 않아도 됩니다. 정 거슬리면 파일명을 `_README.txt` 등으로 바꿔도 됩니다.)

## 새 글 추가하기

1. `src/posts/` 에 `my-post-slug.md` 파일을 만든다. **파일명이 URL slug**가 됩니다 → `/blog/my-post-slug`
2. 맨 위에 frontmatter를 작성한다:

```markdown
---
title: 글 제목 (검색 키워드를 자연스럽게 포함)
date: 2026-06-30
description: 검색 결과·SNS 공유에 노출되는 한 줄 요약. 120자 내외 권장.
tags: [DevOps, CI/CD, GitHub Actions]
thumbnail: /blog/cover.png   # 선택. public/ 기준 절대경로
draft: false                 # true면 목록·배포에서 제외 (개발 모드에서만 미리보기)
---

여기부터 마크다운 본문.
```

3. 본문을 마크다운으로 작성한다. 표·체크리스트(GFM), 코드 블록 구문 강조 모두 지원.

## SEO 체크리스트

- **title**: 사람들이 실제로 검색하는 표현을 넣는다. (예: "github actions ci/cd 구축")
- **description**: 글의 핵심을 한 문장으로. 검색 결과 스니펫에 그대로 쓰인다.
- **첫 문단**: 무슨 문제를 푸는 글인지 바로 명시한다.
- **헤딩(##)**: 키워드를 자연스럽게 배치. 자동으로 id가 붙어 앵커 링크가 된다.
- **내부 링크**: 관련 글끼리 `[다른 글](/blog/other-slug)` 로 연결한다.

> 참고: 이 사이트는 클라이언트 렌더링 SPA라 검색엔진 JS 실행에 의존한다.
> 더 강한 SEO가 필요해지면 빌드 타임 프리렌더링(react-snap 등) 도입을 검토할 것.
