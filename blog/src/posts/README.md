# 블로그 글 작성 가이드

이 폴더(`blog/src/posts/`)의 `.md` 파일 1개가 블로그 글 1편입니다. 파일을 추가하면 자동으로 목록에 노출됩니다.
(이 `README.md`는 로더에서 자동 제외됩니다.)

## 새 글 추가하기

1. `blog/src/posts/` 에 `my-post-slug.md` 파일을 만든다. **파일명이 URL slug**가 됩니다 → `https://blog.kahnco.me/my-post-slug`
2. 맨 위에 frontmatter를 작성한다:

```markdown
---
title: 글 제목 (검색 키워드를 자연스럽게 포함)
date: 2026-07-01
description: 검색 결과·SNS 공유에 노출되는 한 줄 요약. 120자 내외 권장.
tags: [DevOps, CI/CD, GitHub Actions]
thumbnail: /cover.png        # 선택. public/ 기준 절대경로
draft: false                 # true면 목록·배포에서 제외 (개발 모드에서만 미리보기)
---

여기부터 마크다운 본문.
```

3. 본문을 마크다운으로 작성한다. 표·체크리스트(GFM), 코드 블록 구문 강조 모두 지원.

## 어투

블로그 전체 글은 **정중한 합니다체**로 작성합니다. 단정 평어체("~다")나 명령형("~해라")은 쓰지 않고,
의견 있는 내용은 유지하되 전달 어투만 부드럽게 합니다.

## SEO 체크리스트

- **title**: 사람들이 실제로 검색하는 표현을 넣는다.
- **description**: 글의 핵심을 한 문장으로. 검색 결과 스니펫에 그대로 쓰인다.
- **첫 문단**: 무슨 문제를 푸는 글인지 바로 명시한다.
- **헤딩(##)**: 키워드를 자연스럽게 배치. 자동으로 id가 붙어 앵커 링크가 된다.
- **내부 링크**: 관련 글끼리 `[다른 글](/other-slug)` 로 연결한다.

## 빌드 & 배포

```bash
cd blog
yarn build                            # sitemap 생성 + 타입체크 + 번들
firebase deploy --only hosting:blog   # 레포 루트에서 실행
```

> 참고: 이 사이트는 클라이언트 렌더링 SPA라 검색엔진 JS 실행에 의존한다.
> 더 강한 SEO가 필요해지면 빌드 타임 프리렌더링(react-snap 등) 도입을 검토할 것.
