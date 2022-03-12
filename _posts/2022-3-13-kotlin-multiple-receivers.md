---
title: '다중 수신 객체(Multiple Receivers) 에 대하여'
categories: kotlin
tags: ['kotlin']
header:
    teaser: /assets/teasers/kotlin-multiple-receivers.jpg
---

> __모든 코드는 실제 작성하였으며, 직접 실행한 결과들을 글에 담았습니다.__   
> __코틀린 버전에 따라 변경사항이 생길 수 있습니다. (사용한 Kotlin 버전 1.6)__   
> __모든 의견은 언제나 환영합니다 😊__

# 개요

최근 코틀린을 공부하고 있다. 이전에도 가볍게 다뤄본 적은 있었지만 제대로 공부할 기회가 생겨서 재밌게 공부하고 있다.(새로운 언어를 배울 때가 가장 재밌다 ㅎㅎ)

코틀린 표준 라이브러리의 `with`, `apply` 에 대해 공부하던 중, 간단한 이슈를 겪게 되어서 이를 정리해 보았다.

# 수신 객체 

자바의 람다에는 없는 코틀린 람다의 독특한 기능이 있다. 그 기능은 수신 객체를 명시하지 않고 람다의 본문 안에서 다른 객체의 메서드를 호출할 수 있게 하는 것이다. 그런 람다를 __수신 객체 지정 람다(lambda with receiver)__ 라고 부른다.

`with`, `apply` 그리고 수신 객체 지정 람다에 대한 설명은 생략하고 간단히 정리해 보았다.

## filter 확장 메서드

- 코틀린의 filter() 메서드를 구현한 `String.myFilter` 확장 메서드

```kotlin
fun String.myFilter(predicate: (Char) -> Boolean): String { // 필터링할 조건을 파라미터로 받는다
    val sb = StringBuilder() // 결과를 리턴할 StringBuilder 객체 생성
    for (index in indices) { // 문자열의 문자들을 순환한다
        val element = get(index)
        if (predicate(element)) { // 문자가 필터링 술어 연산을 통과한 경우에만 결과에 포함한다
            sb.append(element)
        }
    }
    return sb.toString() // 필터링 결과 리턴
}

"FooAndBar".myFilter { it in 'A'..'Z' } // A ~ Z 까지의 문자만 필터링
// 실행 결과 : FAB
```

매우 간단한 코드이며 단순히 필터링 한 문자열만 리턴하는 메서드이다.   
하지만, 수신 객체에 대해 알지 못한 채 코드를 유심히 보면 궁금증이 생길 수 있다.

```kotlin
fun String.myFilter(predicate: (Char) -> Boolean): String {
    val sb = StringBuilder()
    for (index in indices) { // this.indices 에서 this 생략
        val element = get(index) // this.get(index) 에서 this 생략
        if (predicate(element)) {
            sb.append(element)
        }
    }
    return sb.toString()
}
```

바로 `indices` 와 `get()` 에 대한 참조(String 객체)가 없는데도 코드가 정상적으로 동작한다는 것이다.  
코틀린에서는 이런 것을 수신 객체(Receiver) 라고 정의하고 있다.

> __[참고] 수신 객체 지정 람다와 확장 메서드 비교__  
>    
> 위 코드에서는 확장 메서드를 통해 수신 객체에 접근하는 것을 예시로 들었다.  
> 확장 메서드는 with, apply 를 사용하지 않으며, 람다도 아니기 때문에 '수신 객체 지정 람다와 다른 건가?' 하는 궁금증이 생길 수 있다.   
>    
> 어떤 의미에서는 확장 메서드를 수신 객체 지정 람다라고 할 수도 있다. 두 가지 모두 동일하게 수신 객체가 내부 블럭으로 넘어오고, 동일하게 동작하기 때문이다.  
>    
> 정확하게 구분을 짓는다면, 다음과 같은 관계로 표현할 수 있다.  
>    
> __(1) 일반 메서드 <-> 일반 람다__  
> __(2) 확장 메서드 <-> 수신 객체 지정 람다__  
>    
> 일반 람다는 일반 메서드와 비슷한 동작을 정의하는 한 방법이다.  
> 수신 객체 지정 람다는 확장 메서드와 비슷한 동작을 정의하는 한 방법이다.

## filter 확장 메서드 개선


- `buildString` 을 사용해서 `String.myFilter()` 메서드를 개선

```kotlin
fun String.myFilter(predicate: (Char) -> Boolean) = buildString {
    for (index in indices) {
        val element = get(index)
        if (predicate(element)) {
            append(element)
        }
    }
}
```

- `kotlin.text.StringBuilder.buildString()`
![image](https://user-images.githubusercontent.com/69145799/158021167-04f29da4-1421-4f79-9564-72cbe1aef723.png){:.align-center}

`buildString()` 메서드는 코틀린 표준 라이브러리에서 제공하는 `StringBuilder` 클래스 내부 메서드이다. `apply` 를 감싸고 있어 간단히 `apply` 를 적용하고 원하는 문자열을 리턴할 수 있다.

- 개선한 `String.myFilter()` 실행 결과

```kotlin
val result = "FooAndBar".myFilterTest { it in 'A'..'Z' }
println("result: $result")
// 실행 결과
// result:
```

하지만 예상과 다르게 __문자열이 전혀 출력되지 않았다!__

![image](https://user-images.githubusercontent.com/69145799/156915925-aa41702c-f242-4aeb-8ef7-8ba06e87bbe4.png){:.align-center}

> ⬆️ 파라미터로 넘어온 수신 객체를 사용하지 않고 있다는 IDEA 경고

## 문제 디버깅 하기

문제의 원인을 파악하기 위해 디버깅을 했다.

- `"FooAndBar"` 문자열을 수신 객체로 받았을 텐데 `indices`의 범위가 0..-1 이다.

![image](https://user-images.githubusercontent.com/69145799/158021598-7c11c737-5d02-4422-a0a7-fa84183a0afd.png){:.align-center}

- 수신 객체 `this` 를 확인해보니 StringBuilder의 객체로 나오고 있다.

![image](https://user-images.githubusercontent.com/69145799/158021639-f01549b0-de62-4eff-9911-a3ce31e48399.png){:.align-center}

# 다중 수신 객체

문제의 원인은 String의 확장 메서드인 `myFilter()` 의 내부 블록에서 String 뿐만이 아닌, 다중 수신 객체를 받고 있었기 때문이었다.

- `this` 에 대한 값이 두 가지로 나온다.(this, this@myFilter)

![image](https://user-images.githubusercontent.com/69145799/158021801-8a97293c-fd47-477b-a2f5-8361cb60d1d0.png){:.align-center}

- `this@myFilter.indices` 는 범위가 제대로 나온다 ("FooAndBar")

![image](https://user-images.githubusercontent.com/69145799/158021933-1d3aacd3-216e-4981-877b-262292df9048.png){:.align-center}

## 레이블을 명시하여 해결

위와 같이 블록 내부에서 다중 수신 객체가 넘어오는 경우 `this` 에 대한 객체가 우리가 예상한 값이 아닐 수 있기 때문에 조심해야 한다.

다양한 방법으로 문제를 해결할 수 있지만 모두 같은 개념을 이용한 것이라 간단히만 정리했다.

- (1) String 수신 객체를 레이블로 직접 명시하기

```kotlin
fun String.myFilter(predicate: (Char) -> Boolean) = buildString {
    for (index in this@myFilter.indices) {
        val element = this@myFilter[index]
        if (predicate(element)) {
            append(element)
        }
    }
}
```

레이블을 직접 명시해서 문제를 해결했다. 하지만 다른 사람이 이 메서드 코드를 처음 볼 때 혼동이 있을 것 같다.  
코드를 통해 다중 수신 객체가 넘어오는 것을 알 수는 있지만 수신 객체들에 대한 정보가 모두 코드에 표현되어 있지 않기 때문이다.

- (2) `with` 을 통해 수신 객체를 한번 더 감싸기

```kotlin
fun String.myFilter(predicate: (Char) -> Boolean) = buildString {
    with(this@myFilter) {
        for (index in indices) {
            val element = get(index)
            if (predicate(element)) {
                this@buildString.append(element)
            }
        }
    }
}
```

`this@myFilter` 를 생략하고 싶은 경우 위와 같이 `this@myFilter` 수신 객체를 `with` 으로 감싸서 사용하는 방법도 있다. 하지만 반대로 `buildString` 의 수신 객체를 사용할 때 레이블을 명시해야 하므로 좋은 구조가 아니고 이전 코드보다 복잡해졌다.

- (3) `buildString` 대신 `apply` 를 직접 사용하기

```kotlin
fun String.myFilter(predicate: (Char) -> Boolean) = apply {
    val sb = StringBuilder()
    for (index in indices) {
        val element = get(index)
        if (predicate(element)) {
            sb.append(element)
        }
    }
    return sb.toString()
}
```

`apply` 를 사용하면 String의 수신 객체만 넘어오기 때문에 레이블을 사용하지 않아도 되지만.. `StringBuilder` 객체를 생성하고 연산이 끝난 후 문자열을 리턴해야 하기 때문에 `apply` 를 제대로 사용한다고 할 수 없으며, 코드가 그렇게 깔끔하지도 않다.

개인적으로는 `(1) String 수신 객체를 레이블로 직접 명시하기` 가 가장 좋은 방법인 것 같다. `buildString` & `apply` 의 장점을 그대로 가져가면서 코드도 가장 짧게 표현할 수 있기 때문이다.

# References

- [A Look Into the Future by Roman Elizarov - Multiple receivers](https://www.youtube.com/watch?v=0FF19HJDqMo&t=795s){:target="_blank"}
- [Scope functions(with, apply)](https://kotlinlang.org/docs/scope-functions.html#with){:target="_blank"}
- [Function literals with receiver](https://kotlinlang.org/docs/lambdas.html#function-literals-with-receiver){:target="_blank"}