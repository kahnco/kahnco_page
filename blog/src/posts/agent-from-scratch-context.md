---
title: 대화가 눈덩이처럼 불어난다 — 컨텍스트를 요약해 접기
date: 2026-04-02
description: 에이전트 루프는 한 바퀴 돌 때마다 대화(messages)에 모델의 말과 도구 결과를 이어 붙입니다. 그런데 매 스텝 그 전체를 다시 API로 보내죠. 그래서 대화는 눈덩이처럼 불어나 토큰이 O(n²)으로 커지고, 비싸지고 느려지다 결국 컨텍스트 윈도우를 넘겨 터집니다. 이번 편에 이걸 능동적으로 다스립니다. 대화 길이를 어림하고, 예산을 넘으면 앞부분을 모델에게 요약시켜 한 줄로 접는 compaction을 Go로 직접 짭니다. Claude Code가 실제로 하는 그 메커니즘이죠. 함정은 tool_use와 tool_result 쌍을 쪼개면 API가 400을 낸다는 것 — 경계를 안전하게 미는 로직까지 테스트로 못 박습니다. 'AI 에이전트 직접 짜기' 3편입니다.
tags: [AI, LLM, 에이전트, Go, 컨텍스트, compaction]
category: [dev, ai]
draft: false
---

[2편](/blog/agent-from-scratch-tools-budget)에서 에이전트가 여러 도구를 골라 쓰고, 예산으로 폭주를 막게 됐습니다. 그런데 그 루프를 다시 들여다보면, 조용히 커지는 게 하나 있어요.

```go
messages = append(messages, Message{Role: "assistant", Content: resp.Content}) // 모델의 말
// ...
messages = append(messages, Message{Role: "user", Content: results})           // 도구 결과
```

루프가 한 바퀴 돌 때마다 `messages`에 **모델의 말**과 **도구 결과**가 쌓입니다. 그리고 매 스텝, 우리는 그 **전체**를 다시 API로 보내죠([1편](/blog/agent-from-scratch-loop)에서 봤듯 모델은 상태가 없으니 매번 전 대화를 통째로 받아야 하니까요). 스텝이 늘수록 보내는 양이 커지고, 토큰은 대략 **스텝 수의 제곱**으로 붑니다 — 10스텝짜리 작업이 100스텝이 되면 비용은 10배가 아니라 그 이상이에요. 그러다 결국 **컨텍스트 윈도우를 넘겨 터집니다.**

> **규칙 — 에이전트 루프의 대화는 그냥 두면 눈덩이처럼 불어난다. 길이를 재고, 예산을 넘으면 앞부분을 요약해 접어라.**

이번 편에 이걸 능동적으로 다스립니다. Claude Code가 컨텍스트가 꽉 차면 대화를 요약하는 걸 본 적 있을 텐데, 그 **compaction**을 직접 짭니다.

> 💻 코드는 [github.com/kahnco/agent-from-scratch](https://github.com/kahnco/agent-from-scratch)에 이어집니다. 도구 쌍을 쪼개지 않고 접는지까지 테스트로 검증합니다.

## 먼저, 길이를 잰다 — 싼 어림수

접으려면 "지금 얼마나 길어졌나"를 알아야 합니다. 정확한 토큰 수는 응답의 `usage`에 오지만, 그건 이미 보내고 난 **뒤**의 값이에요. 보내기 **전에** "접을까 말까"를 정하려면 싼 어림수가 필요합니다. 대략 4글자에 1토큰이라는 거친 근사로 충분해요.

```go
// 대략 4글자 ≈ 1토큰이라는 거친 근사다. 정확한 값은 응답의 usage 에 있다.
// 여기서는 "언제 접을지" 판단에만 쓰는 싼 어림수다.
func estimateTokens(messages []Message) int {
	chars := 0
	for _, m := range messages {
		for _, b := range m.Content {
			chars += len(b.Text) + len(b.Content) + len(b.Input)
		}
	}
	return chars / 4
}
```

이 값이 `MaxContextTokens`를 넘으면 접습니다. 넘지 않으면 아무것도 안 하고요 — 대부분의 짧은 작업은 여기 안 걸립니다. **압축은 공짜가 아니라서**(뒤에서 보듯 요약 자체가 또 하나의 API 호출입니다) 필요할 때만 발동하는 게 중요해요.

> **규칙 회수 —** 보내기 전에 대화 길이를 어림하고, 예산을 넘을 때만 접는다. 어림은 거칠어도 된다 — "언제"를 정하는 데만 쓰니까.

## 접는다 — 앞은 요약, 뒤는 원문

핵심 발상은 단순합니다. **최근 몇 메시지는 원문 그대로** 두고(방금 무슨 일이 있었는지가 제일 중요하니까), **그 앞의 오래된 대화는 모델에게 요약시켜 한 덩어리로** 줄입니다.

```go
func (a *Agent) compactIfNeeded(ctx context.Context, messages []Message) ([]Message, error) {
	if a.MaxContextTokens <= 0 || estimateTokens(messages) <= a.MaxContextTokens {
		return messages, nil // 예산 안이면 그대로 둔다
	}

	boundary := len(messages) - a.keepRecent() // 최근 keepRecent 개는 원문 유지
	if boundary < 1 {
		return messages, nil
	}
	// (아래: 도구 쌍이 안 쪼개지게 경계를 민다)

	summary, err := a.summarize(ctx, messages[:boundary]) // 앞부분을 요약
	if err != nil {
		return nil, err
	}
	compacted := []Message{{
		Role:    "user",
		Content: []ContentBlock{{Type: "text", Text: "[이전 대화 요약]\n" + summary}},
	}}
	return append(compacted, messages[boundary:]...), nil // 요약 + 최근 원문
}
```

요약을 만드는 `summarize`는 **도구를 주지 않은** 별도의 모델 호출입니다. 그리고 오래된 메시지들을 그대로 넘기지 않고 **평문 전사(transcript)로 펴서** 넘겨요 — 뒤에 나올 도구 쌍 문제를 요약 호출에서까지 겪지 않으려고요.

```go
func (a *Agent) summarize(ctx context.Context, old []Message) (string, error) {
	transcript := renderTranscript(old) // 대화를 "role: 내용" 평문으로 편다
	resp, err := a.Client.Create(ctx,
		"너는 대화 요약기다. 이후 작업에 필요한 사실·결정·맥락만 간결히 남긴다.",
		[]Message{{Role: "user", Content: []ContentBlock{{Type: "text",
			Text: transcript + "\n\n위 대화를 이후 작업에 필요한 핵심만 남겨 요약해라."}}}},
		nil, // 요약엔 도구를 주지 않는다
	)
	if err != nil {
		return "", err
	}
	return collectText(resp.Content), nil
}
```

이렇게 접으면 다음 스텝부터는 긴 원문 대신 `[이전 대화 요약]` 한 덩어리 + 최근 몇 메시지만 보내게 됩니다. 눈덩이가 다시 작아지는 거죠. "요약이 실제로 이후 호출에 실려 나가는지"를 테스트로 못 박았습니다(대화를 일부러 부풀려 예산을 넘긴 뒤, 이후 요청의 첫 메시지에 `[이전 대화 요약]`이 들어오는지).

> **규칙 회수 —** 최근은 원문으로 남기고 오래된 앞부분만 요약해 접는다. 요약은 도구 없는 별도 호출이고, 평문 전사로 넘겨 안전하게 만든다.

## 함정 — 도구 쌍을 쪼개면 400이 난다

여기 이번 편에서 제일 물리기 쉬운 함정이 있습니다. 대화는 이렇게 생겼어요.

```
user(입력) · assistant(tool_use) · user(tool_result) · assistant(tool_use) · user(tool_result) · ...
```

`tool_use`(모델이 "이 도구 불러줘")와 바로 뒤 `tool_result`(그 결과)는 **한 쌍**입니다. 그런데 접는 경계(`boundary`)가 하필 `tool_result` 위에 떨어지면 — `tool_use`는 요약돼 사라지고 `tool_result`만 최근 쪽에 덩그러니 남아요. 이걸 보내면 API가 **"짝 없는 tool_result"라며 400**을 냅니다. 무심코 "그냥 뒤에서 N개 자르기"로 짜면 이 경계에서 터지죠.

그래서 경계를 **안전하게 밀어야** 합니다. 경계가 `tool_result`로 시작하면, 그 짝인 `tool_use`까지 최근 쪽에 남도록 한 칸 앞으로 당깁니다.

```go
// tool_use ↔ tool_result 쌍을 쪼개면 API 가 400 을 낸다.
// 경계가 tool_result 로 시작하면, 짝인 tool_use 까지 최근 쪽에 남도록 앞으로 민다.
for boundary > 1 && hasToolResult(messages[boundary]) {
	boundary--
}
```

한 칸 앞으로 밀면 경계는 `tool_result` 대신 그 앞의 `assistant(tool_use)`에 떨어지고, 쌍이 통째로 최근 쪽에 남습니다. 이 한 줄이 있고 없고가 "가끔 400으로 죽는 에이전트"와 "안 죽는 에이전트"를 가릅니다. 그래서 이것도 테스트로 못 박았어요 — `tool_use → tool_result`로 끝나는 대화를 경계가 하필 그 사이에 떨어지게 만들어 놓고, 압축 후에도 그 쌍이 **붙어서** 남는지 확인합니다.

> **규칙 회수 —** 접을 때 tool_use/tool_result 쌍을 절대 쪼개지 마라. 경계가 결과 위에 떨어지면 짝까지 최근 쪽에 남도록 민다.

## 정직하게 — 요약은 손실이고, 공짜가 아니다

컨텍스트를 접는 건 강력하지만, 공짜 점심이 아닙니다.

- **요약은 손실 압축이다.** 오래된 대화를 한 문단으로 줄이면 **디테일이 날아갑니다.** 요약이 빠뜨린 사실을 나중 스텝에서 다시 필요로 하면, 에이전트는 "그걸 모르는" 상태가 돼요. 그래서 요약 프롬프트("이후 작업에 필요한 핵심만")가 중요하고, 정말 잃으면 안 되는 것(원본 파일 경로, 확정된 결정)은 요약에 안 맡기고 **따로 구조화된 메모리**로 빼는 게 낫습니다. 이건 다음 편감이에요.
- **압축도 API 호출이다.** `summarize`는 또 한 번의 모델 호출이라, 접는 것 자체가 토큰을 씁니다. 그러니 **매 스텝 접으면 손해**예요 — 예산을 넘을 때만 발동하고, 한 번 접으면 한동안 안 걸리게 임계치를 넉넉히 잡아야 합니다. 너무 자주 접으면 절약한 것보다 요약 비용이 더 나올 수 있어요.
- **어림 토큰은 어림일 뿐이다.** `len/4`는 영어에 맞춘 거친 값이고, 한국어·코드·이모지에선 실제와 꽤 어긋납니다. 임계치에 **여유(마진)**를 두어야 실제 토큰이 어림보다 커도 윈도우를 안 넘겨요. 제대로 하려면 매 응답의 `usage.input_tokens`로 어림을 보정하는 게 정석입니다.
- **더 싼 대안도 있다.** 요약까지 안 가고 **오래된 메시지를 그냥 버리는**(슬라이딩 윈도우) 방법도 있어요. 요약 호출이 없어 싸지만, 버린 건 완전히 사라지죠. 또 **프롬프트 캐싱**을 쓰면 안 변하는 앞부분을 캐시해 재전송 비용을 크게 줄일 수 있는데(반복되는 접두부에 특히), 이건 접기와 결이 다른 최적화라 따로 다룰 만합니다.

이 넷을 알고 쓰면, compaction은 "긴 작업을 끝까지 버티게 하는" 든든한 장치가 됩니다. 이번 편으로 에이전트가 **오래 돌아도 터지지 않는** 수준이 됐어요.

## 정리 — 불어나는 대화를 접다

- **문제**: 매 스텝 전 대화를 재전송하니 토큰이 스텝 수의 제곱으로 분다 → 비싸지고 느려지다 윈도우 초과.
- **측정**: `len/4` 같은 싼 어림수로 보내기 전에 길이를 잰다.
- **압축**: 예산을 넘으면 최근은 원문으로 남기고 앞부분만 도구 없는 호출로 요약해 한 덩어리로 접는다.
- **함정**: tool_use/tool_result 쌍을 쪼개면 400. 경계가 결과 위에 떨어지면 짝까지 최근 쪽으로 민다.
- **정직하게**: 요약은 손실 압축이고 그 자체가 API 호출이다. 예산 넘을 때만, 마진을 두고, 정말 중요한 건 따로 메모리로.

다음 편에서는 이 "정말 잃으면 안 되는 것"을 다룹니다 — 요약에 녹여 없애는 대신, 에이전트에게 **구조화된 메모리**를 주어 스스로 적고 읽게 하는 이야기입니다.

**핵심 한 줄 — 에이전트의 대화는 그냥 두면 눈덩이처럼 불어난다. 길이를 재서 예산을 넘으면 앞부분을 요약해 접되, 도구 쌍은 절대 쪼개지 마라. 요약은 손실이자 비용이니 필요할 때만.**
