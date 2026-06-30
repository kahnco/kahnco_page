---
title: GitOps를 ArgoCD로 시작하기 — 선언적 배포와 지속적 동기화
date: 2026-05-07
description: GitOps는 "Git을 인프라의 유일한 진실로 삼고, 클러스터가 그 상태로 스스로 수렴하게 만드는" 운영 모델입니다. ArgoCD의 Application 모델부터 sync wave, ApplicationSet을 통한 규모 확장, 시크릿 관리와 흔한 함정까지 정리합니다.
tags: [GitOps, ArgoCD, Kubernetes, DevOps]
draft: false
---

`kubectl apply`로 배포하던 시절을 떠올려보면, 한 가지 불편한 질문이 따라옵니다. "지금 클러스터에 떠 있는 게 정확히 어느 커밋의 상태인가요?" 누군가 급하게 핫픽스를 `apply` 했고, 또 누군가 콘솔에서 레플리카 수를 바꿨다면 — 그 답을 자신 있게 말하기 어렵습니다. 코드와 실제 인프라가 조용히 어긋나 있는 상태가 됩니다.

GitOps는 이 질문에 단순한 답을 줍니다. **"Git에 있는 그대로입니다."** Git을 인프라의 유일한 진실(single source of truth)로 삼고, 클러스터가 그 선언된 상태로 *스스로 계속 수렴*하게 만드는 운영 모델입니다. 그리고 ArgoCD는 이 모델을 쿠버네티스 위에서 구현하는 대표적인 도구입니다.

이 글에서는 GitOps의 핵심 개념부터 ArgoCD의 동작 모델, 규모를 키우는 패턴, 시크릿 관리, 그리고 도입할 때 자주 부딪히는 함정까지 차근히 살펴보려 합니다.

## GitOps가 기존 배포와 다른 점

기존 CI/CD 파이프라인 상당수는 **push 방식**입니다. 파이프라인이 빌드를 마치고 `kubectl`이나 `helm`으로 클러스터에 *밀어 넣습니다*. 이 방식엔 두 가지 아쉬움이 있습니다. 파이프라인이 클러스터의 강한 권한을 들고 있어야 하고, 한 번 밀어 넣은 뒤에는 그 상태가 유지되는지 아무도 지켜보지 않습니다.

GitOps는 **pull 방식**을 택합니다. 클러스터 안에 사는 에이전트(ArgoCD)가 Git 저장소를 계속 바라보다가, 선언된 상태와 실제 상태가 다르면 스스로 맞춰갑니다. 정리하면 GitOps는 네 가지 원칙 위에 서 있습니다.

- **선언적(Declarative)** — 시스템 전체가 명령이 아니라 선언으로 기술됩니다.
- **버전 관리되고 불변(Versioned & Immutable)** — Git이 진실이고, 모든 변경은 커밋으로 남습니다.
- **자동으로 끌어옴(Pulled automatically)** — 에이전트가 선언된 상태를 알아서 가져옵니다.
- **지속적으로 수렴(Continuously reconciled)** — 실제 상태가 선언과 어긋나면 계속 맞춰갑니다.

이 구조가 주는 이점은 분명합니다. 배포는 결국 **PR 머지 한 번**이 되고, 롤백은 **revert 한 번**이 됩니다. 누가 언제 무엇을 바꿨는지는 Git 히스토리가 그대로 감사 로그가 됩니다.

## ArgoCD의 핵심 — Application 모델

ArgoCD의 세계에서 배포 단위는 `Application`이라는 CRD입니다. "어느 저장소의 어느 경로를, 어느 클러스터의 어느 네임스페이스에 동기화할지"를 선언합니다.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: orders-api
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/k8s-config.git
    targetRevision: main          # 추적할 브랜치/태그
    path: apps/orders-api         # 매니페스트가 있는 경로
  destination:
    server: https://kubernetes.default.svc
    namespace: orders
  syncPolicy:
    automated:
      prune: true                 # Git에서 사라진 리소스는 클러스터에서도 삭제
      selfHeal: true              # 수동 변경(drift)을 자동으로 되돌림
    syncOptions:
      - CreateNamespace=true
```

여기서 GitOps의 진짜 가치가 `syncPolicy.automated`에 담겨 있습니다.

- **selfHeal: true** — 누군가 `kubectl edit`로 레플리카를 바꿔도, ArgoCD가 이를 drift로 감지해 Git에 선언된 값으로 되돌립니다. "콘솔에서 몰래 바꾼 변경"이 살아남지 못합니다.
- **prune: true** — Git에서 매니페스트를 지우면 클러스터에서도 해당 리소스가 사라집니다. Git이 진실이라는 원칙을 삭제 방향으로도 지켜줍니다.

참고로 ArgoCD는 매니페스트의 형식을 가리지 않습니다. 평범한 YAML, Kustomize, Helm 차트 모두 같은 `source` 안에서 다룰 수 있어서, 기존 자산을 그대로 가져오기 좋습니다.

## 순서가 중요할 때 — sync wave와 hook

리소스를 한꺼번에 적용하면 곤란한 경우가 있습니다. CRD가 만들어지기 전에 그 CRD를 쓰는 리소스가 먼저 뜨거나, DB 마이그레이션이 끝나기 전에 애플리케이션이 올라오는 상황입니다. 이럴 때는 **sync wave**로 적용 순서를 나눠주면 됩니다.

```yaml
metadata:
  annotations:
    # 숫자가 작을수록 먼저 적용됩니다 (음수도 가능)
    argocd.argoproj.io/sync-wave: "1"
```

한 발 더 나아가, 동기화 *전후*에 일회성 작업을 끼워 넣고 싶다면 **sync hook**을 씁니다. 예를 들어 배포 직전 DB 마이그레이션 Job을 돌리는 식입니다.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync          # 동기화 직전에 실행
    argocd.argoproj.io/hook-delete-policy: HookSucceeded  # 성공하면 Job 정리
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: org/orders-api:latest
          command: ["./migrate.sh"]
```

`PreSync` / `Sync` / `PostSync` 단계를 조합하면, 단순한 선언만으로는 표현하기 어려운 배포 절차도 깔끔하게 담아낼 수 있습니다.

## 규모를 키우기 — App of Apps와 ApplicationSet

Application을 하나하나 손으로 만드는 건 앱이 몇 개일 때나 가능합니다. 팀이 늘고 테넌트가 늘면 이 방식은 금세 한계에 부딪힙니다. ArgoCD는 두 가지 패턴으로 이를 풀어줍니다.

**App of Apps**는 "Application들을 만들어내는 Application"입니다. 부모 Application 하나가 자식 Application 매니페스트들을 가리키고, 자식들이 실제 워크로드를 배포합니다. 전체 클러스터의 배포 구성을 한 곳에서 부트스트랩할 수 있습니다.

더 강력한 건 **ApplicationSet**입니다. generator로 Application을 *템플릿에서 동적으로 생성*합니다. 특히 [쿠버네티스 멀티테넌시 글](/kubernetes-multitenancy-isolation)에서 이야기한 테넌트 온보딩 자동화와 잘 맞물립니다. Git 저장소의 `tenants/` 아래 디렉터리 하나가 곧 테넌트 하나가 되도록 만들 수 있습니다.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: tenants
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/org/tenants.git
        revision: main
        directories:
          - path: tenants/*          # 디렉터리 하나 = 테넌트 하나
  template:
    metadata:
      name: 'tenant-{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/tenants.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      syncPolicy:
        automated: { prune: true, selfHeal: true }
        syncOptions:
          - CreateNamespace=true
```

이렇게 해두면 새 테넌트의 온보딩은 **디렉터리 추가 PR 하나**, 아웃보딩은 **디렉터리 삭제 하나**로 끝납니다. 멀티테넌시 글에서 강조한 "온보딩과 아웃보딩의 대칭"이 자연스럽게 만들어집니다.

## 시크릿은 어떻게 다루나

GitOps를 처음 도입할 때 거의 모두가 막히는 지점이 시크릿입니다. 모든 것이 Git에 있어야 한다면, 비밀번호와 토큰도 Git에 둬야 할까요? **평문 그대로 두는 것은 권하지 않습니다.** 공개·비공개를 떠나 Git 히스토리에 비밀이 영구히 남는 건 위험합니다.

흔히 쓰는 접근은 세 가지입니다.

- **Sealed Secrets** — 시크릿을 클러스터의 공개키로 암호화해 `SealedSecret`으로 Git에 올립니다. 복호화 키는 클러스터 안에만 있어서, 암호문이 유출돼도 안전합니다.
- **External Secrets Operator** — 진짜 비밀은 AWS Secrets Manager·Vault 같은 외부 저장소에 두고, Git에는 "어디서 가져올지"만 선언합니다. 비밀 자체는 Git에 들어오지 않습니다.
- **SOPS** — 파일 단위로 암호화하고 KMS 등으로 키를 관리합니다. 부분 암호화가 가능해 diff 친화적입니다.

정답이 하나인 건 아니지만, 핵심 원칙은 같습니다. **Git에는 암호문이나 참조만 두고, 평문 비밀은 절대 두지 않는다**는 것입니다.

## 도입할 때 살펴볼 함정들

마지막으로, ArgoCD를 운영하며 자주 마주치는 지점들을 정리해보겠습니다.

- **auto-sync와 prune은 신중하게 켭니다.** `selfHeal`과 `prune`은 강력하지만, 잘못된 매니페스트가 머지되면 그 즉시 클러스터에 반영됩니다. 중요한 환경에서는 처음엔 수동 sync로 시작하고, 신뢰가 쌓인 뒤 자동화를 넓혀가는 편이 안전합니다.
- **소스 코드와 배포 구성을 분리하는 편이 좋습니다.** 애플리케이션 코드 저장소와 매니페스트 저장소를 나누면, 이미지 빌드(push)와 배포(pull)의 책임이 깨끗이 갈립니다. CI가 이미지 태그만 매니페스트 저장소에 커밋하고, 배포는 ArgoCD가 맡는 흐름이 깔끔합니다.
- **"누가 배포하는가"가 바뀝니다.** GitOps는 기술 변화이자 문화 변화이기도 합니다. 배포 권한이 사람에서 Git으로 옮겨가면서, 모든 변경이 PR 리뷰를 거치게 됩니다. 처음엔 번거롭게 느껴질 수 있지만, 이 마찰이 곧 안전장치가 됩니다.
- **drift를 알림으로 연결합니다.** ArgoCD가 drift를 되돌리는 것에 더해, "왜 drift가 생겼는지"를 Slack 등으로 알려주면 운영이 한결 투명해집니다.

## 정리

GitOps와 ArgoCD를 한 문장으로 압축하면 이렇게 말할 수 있습니다. **인프라의 진실을 클러스터가 아니라 Git에 두고, 그 진실로 시스템이 스스로 수렴하게 만드는 일**입니다.

- 배포는 **PR 머지**, 롤백은 **revert**가 됩니다.
- `selfHeal`과 `prune`으로 **Git = 인프라**라는 등식이 양방향으로 지켜집니다.
- **ApplicationSet**으로 테넌트·환경을 선언 하나에서 파생시켜 규모를 키울 수 있습니다.
- 시크릿은 **암호문이나 참조만** Git에 두는 게 원칙입니다.

이전 글들에서 다룬 [AWS CDK](/taming-aws-cdk-in-production)가 클라우드 인프라를 코드로 다스리는 이야기였다면, GitOps는 그렇게 정의한 상태를 *지속적으로 유지*하는 이야기입니다. 둘을 함께 갖추면, 인프라는 비로소 "한 번 만들고 끝"이 아니라 "코드와 늘 일치하는" 살아있는 시스템이 됩니다.
