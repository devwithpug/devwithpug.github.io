---
title: 'Karabiner-Elements로 키보드 입력 딜레이 추가하기'
categories: blog
tags: ['blog', 'util']
header:
    teaser: /assets/teasers/karabiner-elements.png
---

![image](/assets/teasers/karabiner-elements.png){:.align-center}

# 개요

나는 요즘 애플의 매직 키보드를 사용하고 있다.   
예전부터 꼭 한번 써보고 싶었지만, 가성비를 따졌을 때는 사치라고 생각해서 차마 구매할 용기를 내지 못했었다ㅠ
그런데! 최근에 애플 매직 키보드를 받게 되어서 매직 키보드의 매력에 빠지고 있다. ㅎㅎ   

아무튼 기대한 것보다 더 만족하며 사용 중이고, 혹시나 나와 비슷하게 구매를 고민했던 사람이 있다면 추천하고 싶다(키감이 맥북과 매우 비슷하다)

하지만 한 가지 마음에 안 드는 점이 있는데, 그것은 바로 잠금(lock) 키다.

![image](https://user-images.githubusercontent.com/69145799/151392119-c7219b60-0021-4a0e-b5de-9e8000fbe0ff.jpeg){:.align-center}

> ⬆️ Apple Magic Keyboard

매직 키보드의 키 배열을 보면 백스페이스(delete) 키 상단에 잠금(lock) 키가 있다. 간단히 PC를 잠글 수 있어서 매우 간편하지만, 몰입해서 키보드를 두드리다 보면 나도 모르게 백스페이스 대신 잠금 키를 누르게 돼서 의도치 않게 PC를 잠근 적이 많았다..! (아직 완벽하게 적응을 못해서 그런가?)

한 번쯤이야 실수로 잠금이 걸려도 다시 로그인을 했었지만.. 하루에 3~4번 정도 반복해서 실수로 PC를 잠그게 되니 편의를 위해 만든 키가 나에게는 불편함으로 다가왔다.

그래서 문제를 해결할 방법을 찾아보았다. 하지만 MacOS에서 간단하게 잠금 키를 비활성화하는 기능은 제공하지 않았고, 기존에 사용하고 있던 `Karabiner-Elements` 를 통해 문제를 해결할 수 있었다! 글을 통해 관련 내용들을 정리해 보았다.

# Karabiner-Elements 설정

가장 먼저 `Karabiner-Elements` 를 실행해서 설정화면으로 들어간다.

## 1. 잠금 키를 비활성화

가장 간단한 방법은 잠금 키를 사용하지 않는 키로 바꿔버리는 것이다. 아래와 같이 간단하게 설정할 수 있다.

![image](https://user-images.githubusercontent.com/69145799/151488983-aeecf6e1-6463-4ed2-b1b8-3fb1de5cfce4.png){:.align-center}

> ⬆️ `Simple modifications` 탭의 `Add item` 을 클릭


![image](https://user-images.githubusercontent.com/69145799/151488635-fd365a6e-ba41-4575-91aa-f182274b8347.png){:.align-center}

> ⬆️ 새롭게 추가된 설정에서 `From key` 값에 `Lock key on Magic Keyboard without Touch ID` 를 선택

![image](https://user-images.githubusercontent.com/69145799/151488867-da478c78-2680-4bd8-8c5e-8e57c502ce05.png){:.align-center}

> ⬆️ `To key` 값에 사용하지 않는 키 (f13 ~ f20) 선택

이렇게만 설정해 주면 간단하게 잠금 키를 비활성화할 수 있다.

## 2. 잠금 키에 딜레이를 추가

잠금 키를 실수로 누를 때는 잠그지 않고, 실제 잠그고 싶을 때만 잠글 수 있도록 하는 방법이다.
잠금 키에 딜레이를 추가해서 키를 길게 누른 경우에만 잠금 키가 작동하도록 설정할 수 있다.

`Karabiner-Elements Preferences` 에서 간편하게 설정할 수는 없고, `Karabiner-Elements` 설정 파일을 직접 수정해 주어야 한다.

![image](https://user-images.githubusercontent.com/69145799/151489868-34c343dc-cd37-48dd-9b78-134b11ca41ce.png){:.align-center}

> ⬆️ `Misc` 탭의 `Open config folder` 를 클릭하면 설정 파일의 경로로 이동할 수 있다.

그 다음, `karabiner.json` 파일을 텍스트 편집기로 아래와 같이 수정하자.

```json
{
    "global": {
        "check_for_updates_on_startup": true,
        "show_in_menu_bar": false,
        "show_profile_name_in_menu_bar": false
    },
    "profiles": [
        {
            "complex_modifications": {
                "parameters": {
                    ..생략..
                },
                "rules": [
                    {
                        "description": "잠금 키에 1000ms 딜레이 추가",
                        "manipulators": [
                            {
                                "from": {
                                    "consumer_key_code": "al_terminal_lock_or_screensaver" // 잠금 키
                                },
                                "parameters": {
                                    "basic.to_if_held_down_threshold_milliseconds": 1000 // 1000ms 딜레이
                                },
                                "to_if_held_down": [ // 위 설정 값만큼 키를 누르고 있으면
                                    {
                                        "consumer_key_code": "al_terminal_lock_or_screensaver" // 잠금 키 입력
                                    }
                                ],
                                "type": "basic"
                            }
                        ]
                    }
                ]
            },
            ..생략..
        }
    ]
}
```

![image](https://user-images.githubusercontent.com/69145799/151490268-aba17e07-d48c-4239-b97b-282f36761bfe.png){:.align-center}

> ⬆️ `Complex modifications` 탭을 보면 설정값이 적용된 것을 확인할 수 있다.

이렇게 설정해 주면 잠금 키를 1초간 누른 경우에만 PC가 잠기게 된다.

## 3. 키 조합 추가하기

```json
{
    "description": "control + lock 입력 시 구글 크롬 실행",
    "manipulators": [
        {
            "from": {
                "key_code": "f2",
                "modifiers": {
                    "mandatory": ["control"]
                }
            },
            "to": [
                {
                    "shell_command": "open -a 'Google Chrome.app'"
                }
            ],
            "type": "basic"
        }
    ]
}
```

위와 같이 `from` 부분에 `modifiers`, `mandatory` 값을 추가해서 키 조합을 추가할 수 있다.
`mandatory`에 설정된 키가 반드시 눌러져야만 작동하게 된다.

하지만, mandatory에 모든 키 값을 설정할 수는 없고, 아래와 같은 키 들을 지원한다.[(출처)](https://karabiner-elements.pqrs.org/docs/json/complex-modifications-manipulator-definition/from/modifiers/){:target="_blank"}

| Name          | Description                                                        |
| :------------ | :----------------------------------------------------------------- |
| caps_lock     | —                                                                  |
| left_command  | —                                                                  |
| left_control  | —                                                                  |
| left_option   | —                                                                  |
| left_shift    | —                                                                  |
| right_command | —                                                                  |
| right_control | —                                                                  |
| right_option  | —                                                                  |
| right_shift   | —                                                                  |
| fn            | —                                                                  |
| command       | Either left command or right command is pressed                    |
| control       | Either left control or right control is pressed                    |
| option        | Either left option or right option is pressed                      |
| shift         | Either left shift or right shift is pressed                        |
| left_alt      | Alias of left_option (available since Karabiner-Elements 12.3.0)   |
| left_gui      | Alias of left_command (available since Karabiner-Elements 12.3.0)  |
| right_alt     | Alias of right_option (available since Karabiner-Elements 12.3.0)  |
| right_gui     | Alias of right_command (available since Karabiner-Elements 12.3.0) |
| any           | Any modifiers                                                      |

또한 위의 방법과 같이 `to` 옵션에 shell command가 실행되도록 설정해 줄 수 있는데, 이를 통해 원하는 작업을 무궁무진하게 커스터마이징 할 수 있다! 👍

이외에도 `Karabiner-Elements` 에서 지원하는 이벤트는 종류가 생각보다 많다.[(참고)](https://karabiner-elements.pqrs.org/docs/json/complex-modifications-manipulator-definition/to/){:target="_blank"}

> __모든 코드는 실제 작성하였으며, 직접 실행한 결과들을 글에 담았습니다.__   
> __유용하게 사용하고 계시는 설정 값이 있으면 코멘트로 공유해주세요!__   
> __모든 의견은 언제나 환영합니다 😊__

# References

- [Karabiner-Elements Docs: complex-modifications-manipulator-definition](https://karabiner-elements.pqrs.org/docs/json/complex-modifications-manipulator-definition/){:target="_blank"}
- [Karabiner-Elements Docs: to-if-held-down](https://karabiner-elements.pqrs.org/docs/json/complex-modifications-manipulator-definition/to-if-held-down/){:target="_blank"}
- [Karabiner-Elements Docs: from/modifiers](https://karabiner-elements.pqrs.org/docs/json/complex-modifications-manipulator-definition/from/modifiers/){:target="_blank"}