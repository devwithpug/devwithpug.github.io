---
title: '스프링 부트 - HotSwap? HotDeploy? HotReload? 에 대해'
categories: spring
tags: ['springboot', 'jvm', 'hotswap']
header:
    teaser: /assets/teasers/hotswap.jpg
---

스프링 부트에서 지원하는 Hot swap 과 관련된 내용을 정리해보았다.

- - -

# 개요

버그를 수정할 때마다 전체 프로젝트를 다시 배포해야 수정 사항을 테스트하고 또 다른 버그를 계속 디버깅할 수 있다면 개발자에게 디버깅이 더욱더 싫어지는 작업이 될 것이다.

하지만 JVM의 HotSwap 기능과 이를 지원하는 인텔리제이 IDEA 덕분에, 위와 같은 악몽은 일어나지 않는다! 

HotSwap 기능을 잘 알지 못해도 큰 문제 없이 사용이 가능하지만 내가 원하는 결과를 얻지 못했던 때가 많아서 관련된 내용을 찾아보았다.

HotSwap 기능의 사용법부터 관련된 용어(HotDeploy, HotReload) 들이 무슨 의미를 갖고 있는지 정리해보려고 한다.

- - -

# HotSwap

`HotSwap` 이란 JPDA(Java Platform Debugger Architecture)의 기능이며 JDK 1.4부터 JPDA Enhancements를 통해 지원 되는 기능으로 디버거가 동일한 클래스 ID에 대해 빌드로 생성되는 클래스 바이트 코드를 제자리에서 업데이트할 수 있는 기능이다.

즉, 모든 객체는 업데이트된 클래스를 참조하고 메소드가 호출될 때 변경된 코드를 실행할 수 있으므로 클래스(바이트 코드)가 변경될 때마다 IDE 컨테이너를 다시 로드할 필요가 없는 것이다.

- - - 

# HotReload

`HotReload` 는 변경 사항이 감지되면 애플리케이션을 자동으로 로드하는 기능이다. JVM을 통해 HotSwap된 프로그램을 재시작 없이 적용하는 데에 중점을 둔다.

## LiveReload

`LiveReload` 는 열려있는 브라우저에서 HTML, CSS와 같은 정적 리소스의 변경 사항을 즉시 반영하는 것이다. HotSwap과 목표는 동일하지만 JVM 과는 관련이 없는 기능이다.

- - -

# HotDeploy

`HotDeploy` 는 자동 배포와 관련된 기능으로 시작 시 애플리케이션을 자동으로 배포하는 애플리케이션 컨테이너의 기능이다. 따라서 HotDeploy를 통해 JVM 프로세스를 다시 시작하지 않고도 응용 프로그램을 다시 배포할 수 있는 것이다.

__하지만 HotDeploy는 IDE 또는 JVM의 기능이 아닌 것을 명심해야 한다.__ 따라서 이 기능은 전적으로 애플리케이션 서버에 달려있으며 HotSwap 과 HotSwap은 다르다!

- - - 

# 정리

모든 개념들이 변경사항을 빠르게 적용하는 것을 의미하지만 세부적으로 기능이 실행되는 주체와 기능의 작동 범위는 모두 다르다고 할 수 있다.

__대부분의 경우 이러한 개념을 통틀어서 `HotSwap` 이라고 부르고 있기 때문에 단어 사용에 대해 혼동하지 않는 것이 좋다.__

# 적용 방법

## spring-boot-devtools

HotSwap을 사용하기 위해 스프링 부트에서 권장하는 접근 방법은 스프링 부트에서 제공하는 `spring-boot-devtools` 모듈을 사용하는 것이다.

* `build.gradle` 의존성 추가

```gradle
developmentOnly 'org.springframework.boot:spring-boot-devtools'
```

스프링 부트는 기본적으로 프로그램이 실행 중일 때 새롭게 빌드가 되어 `./build` 리소스가 변경되는 경우 자동으로 변경사항을 감지하고 프로그램을 재시작한다. 하지만 이것이 HotSwap 기능은 아니며 한 가지 문제점이 있다. 만약 스프링 부트 서버의 포트를 랜덤 값으로 지정하여 실행한다고 가정할 때, 매 빌드마다 자동으로 서버가 재시작되어 디버깅을 하는 개발자는 의도치 않게 서버의 포트를 계속해서 수정해 주어야 한다.

이러한 단점을 보완하기 위해 HotSwap을 적용할 수 있으며 아래와 같이 실행 환경설정에 Update 정책을 HotSwap으로 설정해 주면 된다.

* `Intellij IDEA : Run/Debug Configurations`

[![image](https://user-images.githubusercontent.com/69145799/124625248-9af49100-deb8-11eb-8662-a670ae02e5d2.png){:.align-center}](https://user-images.githubusercontent.com/69145799/124625248-9af49100-deb8-11eb-8662-a670ae02e5d2.png)

* 디버깅 중에 새롭게 빌드를 한 경우

![image](https://user-images.githubusercontent.com/69145799/124625040-684a9880-deb8-11eb-8470-7d0d8e188beb.png){:.align-center}

> ⬆ 변경사항이 reload 된 후 서버가 재시작되지 않았다. (기존의 포트를 그대로 사용 가능)

하지만 HotSwap이 만능은 아니며 아래와 같은 경우는 지원되지 않는다.

1. 클래스 또는 메소드 이름 변경 시
2. 메소드의 파라미터 변경 시
3. 새로운 메소드 추가 또는 기존 메소드 삭제 시
4. 새로운 클래스 추가 또는 기존 클래스 삭제 시

* HotSwap을 실패한 경우

![image](https://user-images.githubusercontent.com/69145799/124626417-9f6d7980-deb9-11eb-8203-0d7ed888f525.png){:.align-center}

> ⬆ 디버깅 중에 기존 메소드를 삭제하는 경우 - Hot Swap failed.

위와 같은 경우들을 지원하지 않는 이유는 간단하다.

현재 HotSwap은 정적 리소스 또는 메소드 내부의 수정만 지원하고 있기 때문이다. 이는 HotSwap 의 원리를 보면 알 수 있는데, 클래스 내부의 메소드가 변경된 경우 JVM에서 이를 인식하여 기존 `old-class` 에서 수정된 `new-class`로 교체할 때 두 클래스의 연관성이 요구되어 지는데 이러한 연관성은 클래스의 전체 이름(및 기타 정보)를 포함하기 때문이다.

새롭게 추가되는 클래스나 메소드의 경우 연관성을 가지는 `old-class` 가 존재하지 않으므로 이를 교체(HotSwap) 할 수 없는 것이다.

> 추가 (21.12.28)   
> DevTools를 사용하게 되면 스프링 애플리케이션은 JVM에서 두 개의 클래스 로더에 의해 로드된다.   
> 
> __1. 우리의 자바 코드, 속성 파일, 프로젝트의 src/main/** 와 함께 로드__   
> __2. 나머지 클래스들(자주 변경되지 않는 의존성 라이브러리 등)__   
>
> 따라서 변경이 감지되는 경우 우리 프로젝트 코드를 포함하는 1번 클래스 로더만 다시 로드하고 스프링 애플리케이션 컨텍스트를 다시 시작시키는 전략을 통해 HotSwap이 이루어진다.   
>
> 따라서 2번 클래스 로더에서 다루고 있는 의존성 라이브러리들은 자동으로 다시 로드되지 않기 때문에 의존성 변경에 영향을 주는 변경들은 적용이 되지 않는다.   
> @@Spring In Action 5th   

# References

* [StackOverFlow - Hot Swap, Hot Reload, Live Reload](https://stackoverflow.com/questions/50939153/hot-swap-hot-reload-live-reload){:target="_blank"}
  
* [blogspot - HotSwap vs hot deploy](http://arhipov.blogspot.com/2016/02/hotswap-vs-hot-deploy_12.html){:target="_blank"}

* [programmerah.com - Hot Swap failed:add method not implemented](https://programmerah.com/hot-swap-failedadd-method-not-implemented-2519/){:target="_blank"}

* [Spring Boot Docs - Hot Swapping](https://docs.spring.io/spring-boot/docs/current/reference/html/howto.html#howto.hotswapping){:target="_blank"}

* [Spring Boot Docs - Developer Tools](https://docs.spring.io/spring-boot/docs/current/reference/html/using.html#using.devtools){:target="_blank"}