---
title: 'Spring Expression Language(SpEL) 에 대해'
categories: spring
tags: ['spring', 'SpEL', 'thymeleaf', 'springsecurity', 'java']
header:
    teaser: /assets/teasers/spring.jpg
---

스프링 프레임워크에서 사용되는 SpEL 표현법에 대해 알아보고 사용 예제에 대해 정리해보았다.

- - -

# SpEL : Spring Expression Language

## 개요

`SpEL (Spring Expression Language)` 는 런타임에서 객체에 대한 쿼리와 조작(querying and manipulating)을 지원하는 강력한 표현 언어이다. 

| 타입    | 연산자                                 |
| :--- | :---------------------------------------- | 
| 산술   |+, -, *, /, %, ^, div, mod | 
|관계|<, >, ==, !=, <=, >=, lt, gt, eq, ne, le, ge|
|논리|and, or, not, &&, \|\|, !|
|조건|?:|
|정규식|matches|

## 연산자

SpEL 표현식은 `#` 기호로 시작하며 중괄호로 묶어서 표현한다. `#{표현식}`

속성 값을 참조할 때는 `$` 기호와 중괄호로 묶어서 표현한다. `${property.name}`

아래와 같이 속성 값 참조는 표현식 안에서 사용이 가능하다.
```java
#{${someProperty} + 2}
```

## 산술 연산자

앞서 표에 나와있는 기본적인 산술 연산자들을 지원한다.

```java
@Value("#{19 + 1}") // 20
private double add;

@Value("#{2 ^ 10}") // 1024
private double powerOf;

@Value("#{(2 + 2) * 2 + 9}") // 17
private double brackets;
```

## 관계 및 논리 연산자

기본적인 관계, 논리 연산자 또한 지원한다.

```java
@Value("#{1 == 1}") // true
private boolean equal;

@Value("#{!true}") // false
private boolean notTrue;
```

## 조건부(삼항) 연산자

조건에 따라 값을 주입할 때 사용하는 조건부 연산자를 지원한다.

또한, 삼항 연산자 구문을 단축하는 Elvis 연산자와 동일한 방법을 사용할 수 있다.

```java
@Value("#{some.property != null ? some.perperty : 'default'}")
private String ternary;

@Value("#{some.property != null ?: 'default'}") // 위와 동일하게 null인 경우 default 주입
private String elvis;
```

## 정규식(Regex) 표현법

`matches` 를 이용하여 문자열에 정규식을 사용할 수 있다.

```java
@Value("#{'100' matches '\\d+'}") // true
private boolean validNumericStringResult;

@Value("#{'100asdf' matches '\\d+'}") // false
private boolean invalidNumericStringResult;
```

## List, Map 객체 참조

스프링 빈으로 생성된 객체의 List, Map 프로퍼티에 대해서도 표현식을 통해 참조가 가능하다.

```java
@Component("membersHolder")
public class MembersHolder {
    private List<String> members = new ArrayList<>();
    private Map<String, Integer> membersAge = new HashMap<>();

    public MembersHolder() {
        members.add("devwithpug");
        members.add("John");

        membersAge.put("devwithpug", 24);
        membersAge.put("John", 30);
    }

    // Getter & Setter 생략
}
```

위와 같이 임의의 스프링 빈 객체를 생성하면 간단하게 참조할 수 있다.

```java
@Value("#{membersHolder.members.size()}") // 2
private Integer numberOfMembers;

@Value("#{membersHolder.membersAge['devwithpug']}") // 24
private Integer age;
```

# 사용 예제

`SpEL` 이 강력한 표현 언어인 이유는 스프링과 호환되는 다양한 프레임워크에서 사용이 가능하기 때문이다. 

간단한 사용 예제들을 정리해보았다.

## SpEL in Thymeleaf

### 객체 프로퍼티 참조

```html
<p th:text="${member.name}">name</p>
```

### Enum 클래스 참조

아래와 같은 Enum 클래스를 Thymeleaf에서 참조해야 하는 경우

```java
package test.my.enumclass

public enum Role {
    USER, MANAGER, ADMIN
}
```

`SpEL`을 통해서 `Enum` 클래스의 경로(패키지 포함)를 명시하면 `Thymeleaf` 에서 `Enum` 타입 연산이 가능하다.

```html
<div th:if="${member.role == T(test.my.enumclass.Role).ADMIN}"></div>
```

### 변수, 텍스트 혼용


`<태그 속성값=|표현식|>`

속성 값을 주입할 때, 일반 텍스트와 서버에서 받아온 변수를 함께 사용하여 값을 정의할 수 있다.

```html
<button type="button" 
        th:onclick="|location.href='@{/somepage/{id}(id=${member.id})}'|">somepage</button>
```

## SpEL in Spring security

### @Pre, @Post 어노테이션

`@PreAuthorize`, `@PostAuthorize` 어노테이션을 사용하여 메소드에 인가 정책을 적용하는 경우 `SpEL` 표현식으로 인가 정책을 정의한다.

```java
@Controller
public class MyController {

    @GetMapping("/preAuthorize")
    @PreAuthorize("hasRole('ROLE_USER') AND principal.username == #account.username")
    public String preAuthorize(AccountDto account, Principal principal) {

        return "mypage";

    }

}
```


한가지 다른 점은 __html에서 클라이언트를 통해 받아오는 객체 값__ 은 `#` 기호를 통해 참조하며 __기존 스프링 빈 객체 프로퍼티에 참조__ 할 때는 기호를 사용하지 않는다.

# References

* [Baeldung - Spring Expression Language Guide](https://www.baeldung.com/spring-expression-language){:target="_blank"}
* [Thymeleaf Tutorial - Thymeleaf + Spring](https://www.thymeleaf.org/doc/tutorials/3.0/thymeleafspring.html){:target="_blank"}
* [Spring Security Docs - Authorization](https://docs.spring.io/spring-security/site/docs/3.0.x/reference/el-access.html){:target="_blank"}