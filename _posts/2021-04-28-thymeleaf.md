---
layout: post
title: 'Thymeleaf - 유용한 문법 정리'
comments: true
categories:
    - spring
---

# 개요

thymeleaf 템플릿 엔진을 사용하면서 발생하였던 문제들에 대해 해결 방법과 이를 통해 __알게된 유용한 문법들을 정리하고 있습니다.__ 새로운 것을 알게 될 때 마다 하나씩 내용을 추가하려고 합니다!

# 1. for-each 역방향 루틴

## th:each

![image](https://user-images.githubusercontent.com/69145799/115148631-73511200-a09b-11eb-9c3f-f63a5ebdcb21.png)

```html
<tbody>
    <tr th:each="order : ${orders}" class="align-text-top">
        <form th:action="@{/basic/orders/cancel}" method="post">
            <td>
            <a 
                th:href="@{/basic/stores/{storeId}(storeId=${order.store.id})}"
                th:text="${order.store.storeName}">이름
            </a>
            </td>
            ... 생략 ...
        </form>
    </tr>
</tbody>
```
기존 thymeleaf에서는 for-each 루틴을 지원하여 컬렉션 변수에 대한 반복을 쉽게 수행할 수 있다. 그런데 위와 같은 주문 테이블에서 생성되는 주문 리스트의 순서를 역순으로 놓고 싶었고, 방법을 찾아보게 되었다.

## #numbers.sequence(start, end, step)

기본적으로 thymeleaf에서는 `#numbers` 라는 숫자 포맷 메소드를 지원한다. `#numbers`에 다양한 메소드들이 존재하는데 이번에 알아볼 것은 `#numbers.sequence()`이다.

아마 형태를 보고 유추할 수 있겠지만 이는 python의 built-in 메소드인 `range(start, end, step)` 와 같이 원하는 범위에 대해 시퀀스를 생성해준다.

아래와 같이 적용이 가능하다.

```html
<tbody>
    <tr th:each="i : ${#numbers.sequence(orders.size()-1, 0, -1)}" class="align-text-top">
        <form action="cancel" th:action="@{/basic/orders/cancel}" method="post">
            <td>
            <a 
                th:href="@{/basic/stores/{storeId}(storeId=${orders[i].store.id})}" 
                th:text="${orders[i].store.storeName}">이름
            </a>
            </td>
            ... 생략 ...
        </form>
    </tr>
</tbody>
```

## th:with

문제는 해결했지만 내부 <td> 태그에서도 `i`를 계속 사용해야 한다는 점이 마음에 들지 않는다. 다른 방법을 찾아보았다.

`th:with`을 통해 thymeleaf 템플릿 엔진 내부에서 새로운 변수 값을 생성해줄 수 있다.

ex) `th:with="newVariable=${someModelAttribute}"`

응용하여 기존 코드를 변경해보았다.

```html
<tbody>
    <tr th:each="i : ${#numbers.sequence(orders.size()-1, 0, -1)}" class="align-text-top"
        th:with="order=${orders[i]}">
        <form action="cancel" th:action="@{/basic/orders/cancel}" method="post">
            <td>
            <a 
                th:href="@{/basic/stores/{storeId}(storeId=${order.store.id})}" 
                th:text="${order.store.storeName}">이름
            </a>
            </td>
            ... 생략 ...
        </form>
    </tr>
</tbody>
```

![image](https://user-images.githubusercontent.com/69145799/115149260-3aff0300-a09e-11eb-8872-d140eb119160.png)

`#numbers`와 `th:with` 모두 유용하게 사용이 가능하다!

# 2. 삼항 연산자 & Enum

## Enum type 비교

위에서 작성하던 주문 목록 View 처럼 여러 주문들 중에서 현재 상태가 `ORDER` 인 주문들만 주문 취소가 가능하게끔 만들고 싶었다.

먼저 주문의 상태를 나타내는 `OrderStatus`는 Enum 클래스로 구성되었다.

```java
public enum OrderStatus {
    ORDER, CANCEL
}
```

따라서, thymeleaf에서 Enum 값을 비교해야 해서 방법을 찾아보았다.

thymeleaf 문법에는 그런 내용이 없었지만 스프링에서 제공하는 SpEL(Spring Expression Language)를 이용하여 타입을 파싱하는 방법이 있었다.

예약어 `T`를 이용하여 `T(class.path.EnumClass).VALUE` 와 같이 표현이 가능하다. 실제 코드에 적용해보았다.

```html
<td>
<button name=orderId 
        th:if="${order.status == T(hello.itemservice.domain.order.OrderStatus).ORDER}" 
        th:value="${order.id}" type="submit" class="btn btn-danger">취소
</button>
</td>
```

![image](https://user-images.githubusercontent.com/69145799/115149849-e315cb80-a0a0-11eb-8d79-4a42f14160aa.png)

## if condition 삼항 연산자

원하는 결과를 얻었지만 `CANCEL` 상태의 주문에는 버튼이 아예 생성되지 않아서 버튼이 있는 부분에 비해 높이 값이 감소하게 되었다. 이를 해결하기 위해 HTMl 태그 스타일 중에서 `visibility: hidden`을 이용해야겠다고 생각했다.

인상 깊었던 점은 if condition을 사용할 때 반드시 `th:if`를 사용하지 않아도 된다는 점이었다. __thymeleaf 에서도 삼항 연산자를 지원하고 있었다.__

```java
if (condition) ? A : B; // 삼항 연산자
```


```html
<td>
<button name=orderId 
        th:style="${order.status == T(hello.itemservice.domain.order.OrderStatus).ORDER ? '' : 'visibility:hidden'}" 
        th:value="${order.id}" type="submit" class="btn btn-danger">취소
</button>
</td>
```

위와 같이 `th:style` 값에서 삼항 연산자를 추가하여 if condition에 만족하지 않으면 visibility 값을 hidden으로 설정하도록 하였다.

![image](https://user-images.githubusercontent.com/69145799/115149260-3aff0300-a09e-11eb-8872-d140eb119160.png)

원했던 결과를 얻을 수 있었다!