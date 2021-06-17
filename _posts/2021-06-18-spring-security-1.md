---
title: '스프링 시큐리티 - 아키텍처 정리'
categories: spring
tags: ['spring', 'springsecurity', 'java']
header:
    teaser: /assets/teasers/springsecurity.jpg
---

공부중인 스프링 시큐리티의 로직 케이스 및 아키텍처에 대해 정리해보았다.

- - -

# 스프링 시큐리티 아키텍처

![image](https://user-images.githubusercontent.com/69145799/122363501-f3103580-cf93-11eb-9867-d096db605779.png)

## 개요

* 스프링 시큐리티는 주요한 기능들이 파이프라인과 같은 필터 패턴으로 구현되어 있다.

* 이러한 필터들은 체인으로 묶여있다. 

* 서블릿 필터는 스프링에서 정의된 빈을 주입해서 사용할 수 없다. 따라서 특정 이름의 빈을 찾아 해당 빈에게 요청을 위임
    - `DelegatingFilterProxy`가 `springSecurityFilterChain`에게 요청을 위임
    - `DelegatingFilterProxy`는 실제 보안처리를 하지 않음

* 각각의 필터들을 거치며 자신이 작업가능한 케이스인 경우 로직을 수행한다.

![image](https://user-images.githubusercontent.com/69145799/122351186-de7a7000-cf88-11eb-9434-ca2723808374.png)

> 생성된 스프링 시큐리티 필터 목록

## 보안 설정 커스터마이징

* `WebSecurityConfigurerAdapter` 클래스의 `configure()` 메소드를 오버라이딩 하여 보안 설정 커스터마이징이 가능하다.

```java
@Configuration
@EnableWebSecurity
class MySecurityConfig extends WebSecurityConfigurerAdapter {

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
                .authorizeRequests()
                .anyRequest().authenticated()
                .and()
                .formLogin()
        ;
    }
}
```

## 각 필터 설명

[![image](https://user-images.githubusercontent.com/69145799/122347233-c99bdd80-cf84-11eb-8da4-4b61fa75432f.png)](https://user-images.githubusercontent.com/69145799/122347233-c99bdd80-cf84-11eb-8da4-4b61fa75432f.png)

> 이미지 출처 : [Inflearn - 정수원님 스프링 시큐리티 강의](https://www.inflearn.com/course/코어-스프링-시큐리티/){:target="_blank"}

* __SecurityContextPersistenceFilter__

사용자의 인증 요청을 받게되면 `loadContext`를 통해 해당 사용자의 이전 인증 정보가 있는지 검사, 없는 경우 `SecurityContext` 생성하여 `SecurityContextHolder`에 저장

이때 `SecurityContext`는 사용자의 인증 정보 `Authentication` 객체를 담고있다.

* __LogoutFilter__

로그아웃을 처리하는 필터

`LogoutHandler`에서 로그아웃 로직 수행

* __UsernamePasswordAuthenticationFilter__

Form 인증 방식의 인증 요청을 담당하는 필터

`SecurityContext`에 있는 `Authentication`의 username, password 값을 확인하여 인증을 수행

실제 로직 수행은 `AuthenticationManager`에게 인증 수행 요청을 하면 해당 클래스는 `AuthenticationProvider`에게 실제 인증 처리를 위임한다.

* __ConcurrentSessionFilter__

사용자가 가지고 있는 session에 대해 `session.isExpired()` 판별하여 세션이 만료된 경우 로그아웃 처리

* __RememberMeAuthenticationFilter__

사용자의 이전 인증에서 `RememberMe`를 체크한 경우 새로운 인증 수행 필요 X

* __AnonymousAuthenticationFilter__

인증 정보를 가지고 있지 않은 익명 사용자에게 인증 토큰 `AnonymousAuthenticationToken` 발급

* __SessionManagementFilter__

session 설정에 따라 새롭게 생성된 세션의 등록 여부를 처리하는 필터

인증 시도 차단 또는 이전 세션 만료 설정 처리

* __ExceptionTranslationFilter__

인증, 인가 처리에서 발생된 예외들을 처리해주는 필터

* __FilterSecurityInterceptor__

인가 처리를 해주는 필터

인증 객체 존재 여부, 해당 권한 포함 여부

# 로직 케이스 예시

* 웹 서비스 접속 루트

```java
@RestController
public class SecurityController {

    @GetMapping("/")
    public String rootPage() {
        return "root";
    }

    @GetMapping("/admin")
    public String adminPage() {
        return "admin";
    }
```

* security 설정

```java
@Configuration
@EnableWebSecurity
class SecurityConfig extends WebSecurityConfigurerAdapter {

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
                .authorizeRequests()
                .antMatchers("/admin").hasRole("ADMIN")
                .anyRequest().authenticated()
                .and()
                .formLogin()
        ;
    }
}
```

## 인증 예시

* __처음 Form 인증 시도하는 경우__

0. 사용자가 서버에 접근 (localhost:8080/)
1. `DelegatingFilterProxy` -> `springSecurityFilterChain`에게 요청 위임
2. `SecurityContextPersistenceFilter` -> `SecurityContext` 생성, 사용자의 `Authentication` 객체 담아서 `SecurityContextHolder`로 시큐리티 컨텍스트를 감싼뒤 저장
3. `UsernamePasswordAuthenticationFilter` -> `SecurityContextHolder.getContext().getAuthentication()` 통해 사용자의 인증 객체를 얻어서 `AuthenticationManager`에게 인증 요청
4. `AuthenticationManager`는 `AuthenticationProvider`에게 실제 인증 처리 위임
5. `AuthenticationProvider`로 부터 리턴 받은 인증 성공 여부 반환
6. `SessionManagementFilter` -> 인증 성공한 사용자의 Session 등록

* __이미 인증이 수행된 동일한 계정으로 인증 시도하는 경우__

0. 사용자가 서버에 접근 (localhost:8080/)
1. 위와 같이 Form 인증을 동일한 계정으로 수행
2. `SessionManagementFilter` -> `ConcurrentSession` 존재하는 경우 두가지 전략으로 처리
    (1) `SessionAuthenticationException` : 새로운 인증 시도 차단
    (2) `session.expireNow()` : 이전 사용자 세션 만료

* __session.expireNow() 를 통해 이전 사용자 세션이 만료된 경우__

0. 사용자가 서버에 접근 (localhost:8080/)
1. `ConcurrentSessionFilter` -> `session.isExpired`를 통해 사용자의 세션이 만료된 것을 확인
2. 해당 사용자 로그아웃 처리
3. response 예외 발생

## 인가 예시

* __인증 객체 존재하지 않는 경우__

0. 사용자가 서버에 접근 (localhost:8080/)
1. 앞선 필터들에서 인증 처리 실패 -> `Authentication == null`
2. `FilterSecurityInterceptor` -> 인증 여부 확인 -> `AuthenticationException` 발생

* __요구되는 권한을 가지고 있지 않은 경우__

0. 사용자가 어드민 리소스에 접근 (localhost:8080/admin)
1. 앞선 필터들에서 인증 처리 성공
2. `FilterSecurityInterceptor` -> `AccessDecisionManager`에게 인가 처리 위임
3. `AccessDecisionManager` -> `AccessDecisionVoter` 객체들에게 인가 여부 판단 요청
4. Voter 들에게서 리턴 받은 값을 통해 설정된 전략으로 인가 여부를 판단
    (1) AffirmativeBased: 하나의 Voter라도 허가 한 경우 인가 승인
    (2) ConsensusBased: 다수표로 판단
    (3) UnanimousBased: 모든 Voter가 허가해야 인가 승인
5. Admin 권한이 없으므로 `AccessDeniedException` 발생

# References

* [Inflearn - 정수원님 스프링 시큐리티 강의](https://www.inflearn.com/course/코어-스프링-시큐리티/){:target="_blank"}
* [docs.spring.io - servlet-architecture](https://docs.spring.io/spring-security/site/docs/current/reference/html5/#servlet-architecture){:target="_blank"}