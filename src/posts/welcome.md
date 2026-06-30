---
title: 블로그를 시작하며 — 인프라·DevOps 기록을 남깁니다
date: 2026-06-30
description: 칸코테크 개발 블로그를 엽니다. 앞으로 인프라와 DevOps를 중심으로, 중급 개발자가 실무에서 부딪히는 문제와 해결 과정을 기록합니다.
tags: [잡담, DevOps]
draft: false
---

## 왜 블로그를 시작하나

실무에서 한 번쯤 검색해 본 문제들 — `GitHub Actions로 배포 자동화하기`, `Docker 다음에 왜 Kubernetes인가`, `AWS CDK로 인프라를 코드로 관리하기` — 막상 한글 자료를 찾으면 입문 글은 넘치지만 **실제 판단과 트레이드오프**가 담긴 글은 드뭅니다.

이 블로그는 그 빈자리를 메우려고 합니다. 중급 개발자 눈높이에서, 개념과 따라하기, 그리고 직접 부딪힌 함정까지 함께 정리합니다.

## 앞으로 다룰 주제

- **CI/CD** — GitHub Actions로 빌드·테스트·배포 파이프라인 구축
- **컨테이너 / 오케스트레이션** — Docker에서 Kubernetes로 넘어가는 개념의 벽
- **IaC** — AWS CDK로 인프라를 코드로 관리하기
- **GitOps** — ArgoCD로 쿠버네티스 배포 자동화

## 코드도 이렇게 보입니다

```yaml
# .github/workflows/deploy.yml
name: deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: yarn install --frozen-lockfile
      - run: yarn build
```

> 첫 정식 글은 **"GitHub Actions로 CI/CD 파이프라인 처음부터 구축하기"** 입니다. 곧 올라옵니다.

읽어주셔서 감사합니다. 🙇
