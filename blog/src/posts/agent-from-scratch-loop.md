---
title: 에이전트는 결국 while 루프다 — 프레임워크 없이 직접 짜기
date: 2026-03-25
description: AI 에이전트가 요즘 화두지만, LangChain 같은 프레임워크가 그 실체를 두껍게 감싸고 있습니다. Flutter 시리즈에서 provider를 40줄로, flutter_bloc을 60줄로 직접 짜 봤듯, 에이전트도 프레임워크를 걷어내고 직접 짜 보면 정체가 드러납니다. 실은 while 루프 + 도구 호출 + JSON이죠. Go와 raw HTTP로 Claude Messages API 위에 tool-use 루프를 손으로 짜고, mock 서버로 API 키 없이 그 루프를 검증합니다. 새 'AI 에이전트 직접 짜기' 시리즈 1편입니다.
tags: [AI, LLM, 에이전트, Claude, Go, tool-use]
category: [dev, ai]
draft: false
---

Flutter 시리즈에서 제가 반복한 방식이 있습니다 — **프레임워크를 걷어내고 직접 짜서 정체를 드러내기.** [provider를 40줄로](/blog/flutter-mini-provider) 짜서 `watch`/`read`의 실체가 `InheritedWidget` 구독임을 봤고, [flutter_bloc을 60줄로](/blog/flutter-app-bloc-from-scratch) 짜서 BLoC이 스트림 두 개임을 봤죠. 이번엔 대상을 바꿉니다 — **AI 에이전트**입니다.

에이전트가 요즘 화두인데, LangChain 같은 프레임워크가 그 위에 두꺼운 추상을 얹어 "에이전트가 실은 무엇인지"를 감춥니다. 그래서 이번에도 걷어내 봅니다. 프레임워크도, SDK도 없이 **raw HTTP로 직접** 짜 보면, 그 정체가 아주 단순하게 드러나요. 이 편의 규칙입니다.

> **규칙 — 프레임워크가 '에이전트'라 부르는 건, 실은 `while` 루프 + 도구 호출이다.**

LLM API 하나 위에 도구 사용 루프를 손으로 짜서, 그게 정말 루프 하나임을 봅니다. 언어는 **Go**, LLM은 **Claude Messages API**를 씁니다.

> 💻 코드는 [github.com/kahnco/agent-from-scratch](https://github.com/kahnco/agent-from-scratch)에 함께 올라갑니다. SDK 없이 `net/http`로만 짜고, `httptest`로 mock 서버를 물려 API 키 없이도 루프를 검증합니다.

## 에이전트란 뭔가 — LLM은 한 번 부르면 한 번 답한다

먼저 오해를 풉니다. LLM API는 **상태가 없습니다(stateless).** `POST /v1/messages`에 메시지 목록을 보내면 답 하나가 오고, 끝이에요. 모델은 파일을 읽지도, 계산기를 두드리지도 못합니다 — 텍스트를 넣으면 텍스트가 나올 뿐이죠.

그럼 "도구를 쓰는 에이전트"는 뭘까요? 그건 **모델 바깥에서** 우리가 얹는 겁니다. 모델에게 "이런 도구들이 있다"고 알려 주고, 모델이 "그 도구를 이 입력으로 불러 줘"라고 하면, **우리가 대신 실행해서 결과를 다시 넣어** 주는 거예요. 이 주고받기를 모델이 "다 됐다"고 할 때까지 반복하는 것 — 그게 에이전트입니다.

요청의 뼈대는 이렇습니다. 우리가 쓰는 부분만 Go 구조체로 추렸어요.

```go
type request struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	System    string    `json:"system,omitempty"`
	Messages  []Message `json:"messages"`
	Tools     []Tool    `json:"tools,omitempty"`
}

type Response struct {
	Content    []ContentBlock `json:"content"`
	StopReason string         `json:"stop_reason"` // "tool_use" 면 도구를 부른 것
}
```

`Messages`가 지금까지의 대화, `Tools`가 "쓸 수 있는 도구 목록"입니다. 응답의 **`StopReason`이 `"tool_use"`면 모델이 도구를 불렀다**는 신호예요. 이 신호가 루프를 한 바퀴 더 돌립니다.

> **규칙 회수 —** LLM은 stateless라 한 번 부르면 한 번 답한다. "도구를 쓰는" 건 모델 바깥에서 우리가 얹는 주고받기다.

## 도구를 선언한다 — 이름·설명·스키마

도구를 쓰게 하려면, 모델에게 **어떤 도구가 있는지** 알려 줘야 합니다. 각 도구는 **이름·설명·입력 스키마** 셋으로 선언해요. 모델은 이 설명을 읽고 "언제 이 도구를 부를지"를 스스로 정합니다.

```go
type Tool struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"input_schema"` // JSON Schema
}
```

예제로 **계산기** 하나를 붙입니다. LLM은 큰 수 곱셈을 종종 틀리지만, 이 도구는 정확하거든요 — "모델이 못 하는 걸 도구가 한다"의 가장 깔끔한 예입니다.

```go
func CalculatorTool() LocalTool {
	return LocalTool{
		Description: "두 수를 정확히 계산한다. op 는 +, -, *, / 중 하나.",
		Schema: json.RawMessage(`{
			"type": "object",
			"properties": {
				"a":  {"type": "number"},
				"op": {"type": "string", "enum": ["+", "-", "*", "/"]},
				"b":  {"type": "number"}
			},
			"required": ["a", "op", "b"]
		}`),
		Run: func(input json.RawMessage) (string, error) { /* a op b 계산 */ },
	}
}
```

`Description`과 `Schema`는 **모델에게 보내는 문서**입니다. 모델은 이걸 보고 "정확한 계산이 필요하네, `calculator`를 `{a:123456, op:"*", b:789}`로 부르자"고 판단해요. `Run`은 그 판단이 왔을 때 **우리가 실제로 돌릴** 함수고요. 즉 하나의 도구엔 **모델용 선언(문서)**과 **우리용 구현(함수)**이 함께 삽니다.

> **규칙 회수 —** 도구는 이름·설명·스키마로 선언한다. 모델은 그 설명을 읽고 언제 부를지 스스로 정하고, 실행은 우리가 한다.

## 루프 — 에이전트의 심장

이제 핵심입니다. 에이전트의 전부는 이 `for` 루프예요.

```go
func (a *Agent) Run(ctx context.Context, userInput string) (string, error) {
	messages := []Message{{Role: "user", Content: []ContentBlock{{Type: "text", Text: userInput}}}}

	for {
		resp, err := a.Client.Create(ctx, a.System, messages, a.toolDecls())
		if err != nil {
			return "", err
		}
		// 모델이 방금 한 말(도구 호출 포함)을 대화에 이어 붙인다.
		messages = append(messages, Message{Role: "assistant", Content: resp.Content})

		// 도구를 부른 게 아니면 여기서 끝 — 텍스트를 모아 돌려준다.
		if resp.StopReason != "tool_use" {
			return collectText(resp.Content), nil
		}

		// tool_use 블록마다 도구를 실행해 tool_result 를 모은다.
		var results []ContentBlock
		for _, block := range resp.Content {
			if block.Type == "tool_use" {
				results = append(results, a.runTool(block))
			}
		}
		// 결과들을 한 user 메시지에 담아 되돌린다.
		messages = append(messages, Message{Role: "user", Content: results})
	}
}
```

이게 전부입니다. 말로 풀면 딱 세 줄이에요.

1. 모델을 부른다.
2. `stop_reason`이 `tool_use`가 **아니면** → 최종 답을 반환하고 끝.
3. `tool_use`면 → 도구를 실행하고 결과를 다시 넣어 **1로 돌아간다.**

LangChain이 `AgentExecutor`니 `Runnable`이니 하는 이름으로 감싸 두던 게, 걷어내 보면 **이 `for` 루프 하나**였던 겁니다. [3편에서 BLoC이 `await for` 하나였듯](/blog/flutter-app-bloc-from-scratch), 에이전트는 `for`(+HTTP 호출) 하나예요. "모델이 도구를 부르는 동안 계속 돈다" — 그게 에이전트의 심장입니다.

> **규칙 회수 —** 에이전트 = 이 `for` 루프다. tool_use면 도구를 실행해 결과를 되먹이고, 아니면 최종 답으로 끝낸다.

## 도구를 실제로 실행한다

루프 안에서 도구를 실행하는 `runTool`은, 모델이 준 `tool_use` 블록을 받아 그 이름의 도구를 찾아 돌리고, 결과를 **`tool_result` 블록**으로 되돌립니다.

```go
func (a *Agent) runTool(call ContentBlock) ContentBlock {
	tool, ok := a.Tools[call.Name]
	if !ok {
		return ContentBlock{Type: "tool_result", ToolUseID: call.ID,
			Content: "unknown tool: " + call.Name, IsError: true}
	}
	out, err := tool.Run(call.Input) // 모델이 준 input(JSON)을 그대로 넘긴다
	if err != nil {
		return ContentBlock{Type: "tool_result", ToolUseID: call.ID,
			Content: err.Error(), IsError: true}
	}
	return ContentBlock{Type: "tool_result", ToolUseID: call.ID, Content: out}
}
```

두 가지가 눈에 띕니다. 첫째, `tool_result`는 **`ToolUseID`로 원래 호출과 짝지어집니다** — 모델이 "내가 부른 그 도구의 답이 이거구나"를 알게요. 둘째, **실패도 결과로 되돌립니다**(`IsError: true`). 도구가 터졌다고 루프를 죽이지 않고, "이 도구는 이렇게 실패했어"라고 모델에게 알려 주면, 모델이 다른 방법을 시도하거나 사용자에게 사정을 설명할 수 있어요. 모르는 도구를 불러도 마찬가지로 에러 결과로 돌려, 루프는 계속 삽니다.

그래서 실제로 돌리면(`ANTHROPIC_API_KEY`를 주고 `cmd/agent`를 실행), 모델은 "123456 × 789"를 스스로 계산하려 들지 않고 `calculator`를 불러 **97406784**라는 정확한 답을 받아 옵니다. 모델의 약점(정확한 산술)을 도구가 메운 거죠.

> **규칙 회수 —** 도구 실행은 tool_use를 받아 실행하고 tool_result로 되돌리는 것. ToolUseID로 짝짓고, 실패도 결과로 돌려 루프를 살린다.

## 그래서, API 키 없이 루프를 검증한다

프레임워크 대신 raw HTTP로 짠 보상이 여기 있습니다. HTTP 호출을 **주입 가능**하게 뒀거든요 — `BaseURL`과 `*http.Client`를 밖에서 넣을 수 있게요. 그래서 테스트에서 **가짜 Claude 서버**(`httptest`)를 물려, 실제 API 키 없이 루프 전체를 결정적으로 검증합니다.

```go
srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	calls++
	if calls == 1 {
		// 1번째: 모델이 calculator 를 부른 척.
		io.WriteString(w, `{"stop_reason":"tool_use","content":[
			{"type":"tool_use","id":"t1","name":"calculator","input":{"a":123456,"op":"*","b":789}}
		]}`)
		return
	}
	// 2번째 요청엔 우리가 되돌린 tool_result 가 들어 있어야 한다.
	// ... req.Messages 에서 tool_result 를 꺼내 검증 ...
	io.WriteString(w, `{"stop_reason":"end_turn","content":[{"type":"text","text":"답은 97406784 입니다."}]}`)
}))

a := &Agent{Client: &Client{APIKey: "test", BaseURL: srv.URL, HTTP: srv.Client()},
	Tools: map[string]LocalTool{"calculator": CalculatorTool()}}
out, _ := a.Run(context.Background(), "123456 * 789?")
```

mock 서버가 "모델이 도구를 부른 척" 첫 응답을 주면, 우리 루프가 **실제 계산기를 돌려** 97406784를 얻고, 그걸 `tool_result`로 되먹입니다. 테스트는 (1) 모델이 두 번 불렸는지, (2) 두 번째 요청에 계산 결과가 담겼는지, (3) 최종 답이 나왔는지를 단언하죠 — **루프의 한 바퀴가 온전히 돈다**는 걸 API 없이 못 박는 겁니다(`agent_test.go`, 도구 실행·미지 도구 에러·순수 계산기까지 3종). LLM을 부르는 코드는 테스트하기 어렵다고들 하는데, HTTP 경계 하나만 mock 하면 로직 전체가 결정적으로 검증돼요.

> **규칙 회수 —** HTTP를 주입 가능하게 두면, mock 서버로 에이전트 루프를 API 키 없이 결정적으로 검증할 수 있다.

## 정직하게 — 이건 최소 골격이다

이번 편은 에이전트의 **심장(루프)**만 드러냈습니다. 실무로 가려면 붙일 게 많아요.

- **실무에선 SDK를 쓰는 게 맞다.** 여기선 정체를 드러내려 raw HTTP로 짰지만, 실제 앱은 공식 Anthropic SDK(그리고 그 안의 tool runner)를 쓰는 게 낫습니다 — 재시도·타입·스트리밍·에러 분류를 다 챙겨 주니까요. flutter_bloc을 직접 짜 본 뒤 "실무는 패키지로"라고 했던 것과 같습니다. 원리를 알고 쓰는 것과 모르고 쓰는 건 다르죠.
- **무한 루프 방지.** 지금 `for`는 종료 조건이 "모델이 tool_use를 안 할 때"뿐입니다. 모델이 계속 도구를 부르면 안 끝나요. 실무에선 **최대 반복 횟수**나 예산(토큰/비용) 상한을 둬야 합니다.
- **병렬 도구 호출.** 한 응답에 `tool_use` 블록이 여러 개 올 수 있습니다(모델이 도구를 동시에 여러 개 부름). 지금 코드는 순서대로 실행해 결과를 **한 user 메시지에** 담는데(이건 맞음 — 나눠 보내면 안 됨), 진짜 병렬로 돌리려면 고루틴으로 동시에 실행하면 됩니다.
- **비용·모델.** 기본 모델을 최신 Opus로 뒀는데, 에이전트는 루프마다 API를 부르니 토큰이 쌓입니다. 프롬프트 캐싱(대화 앞부분 캐시)·저렴한 모델·스트리밍은 다음 편들의 몫이에요.
- **컨텍스트 누적.** 루프가 돌수록 `messages`가 길어집니다. 길어지면 요약·정리가 필요하고, 그게 "메모리·컨텍스트 관리" 편의 주제입니다.

이 다섯이 앞으로의 시리즈 지도입니다. 이번 편은 **"에이전트가 실은 루프 하나"**라는 뼈대만 세웠어요. 뼈대가 이렇게 작다는 걸 알고 나면, 프레임워크가 그 위에 뭘 얹어 주는지도, 언제 직접 짜고 언제 프레임워크를 쓸지도 또렷해집니다.

## 정리 — 에이전트의 뼈대

- **에이전트란**: stateless한 LLM 위에 "도구를 쓰는 주고받기"를 우리가 얹은 것.
- **도구 선언**: 이름·설명·스키마로 모델에 문서를 준다. 언제 부를지는 모델이, 실행은 우리가.
- **루프**: `stop_reason`이 tool_use인 동안 도구를 실행해 tool_result로 되먹이고, 아니면 최종 답으로 끝낸다. 이게 에이전트의 전부.
- **도구 실행**: ToolUseID로 짝짓고, 실패도 결과로 돌려 루프를 살린다.
- **검증**: HTTP를 주입 가능하게 두면 mock 서버로 API 없이 루프를 테스트한다.
- **다음 숙제**: SDK, 무한루프 방지, 병렬 도구, 비용·캐싱, 컨텍스트 관리.

Flutter 시리즈에서 그랬듯, 이 AI 시리즈도 **직접 짜서 원리를 드러내고, 정직하게 트레이드오프를 짚으며** 갑니다. 다음 편에서는 도구를 여럿 붙이고, 루프가 폭주하지 않게 종료 조건과 예산을 두겠습니다.

**핵심 한 줄 — LangChain이 'AgentExecutor'라 부르는 건 걷어내 보면 while 루프 하나다. 모델이 도구를 부르는 동안 실행하고 되먹이면, 그게 에이전트다.**
