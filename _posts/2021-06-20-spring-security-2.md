---
title: '스프링 시큐리티 - URL 한글 인코딩 깨짐 문제'
categories: spring
tags: ['spring', 'springsecurity', 'java', 'url', 'encode']
header:
    teaser: /assets/teasers/springsecurity.jpg
---

스프링 시큐리티를 사용하는 도중 한글 인코딩에 문제가 생겨 이를 해결한 방법에 대해 정리해보았다.

- - -

# 개요

![image](https://user-images.githubusercontent.com/69145799/122529917-edc8ee80-d058-11eb-8e22-8c70eba60de9.png)

> ⬆ 인증 실패 처리에 대한 예외 메세지를 클라이언트에게 제공하는 로그인 페이지

스프링 시큐리티에서 제공하는 `SimpleUrlAuthenticationFailureHandler` 를 오버라이딩 하여 커스텀 인증 실패 핸들러를 만든 후 위와 같이 에러메세지를 클라이언트에게 제공하려고 했다.

이때, 한글로 이루어진 예외 메세지를 전송하는 경우에 인코딩 문제가 발생했다.

구현한 코드는 아래와 같다.

## 로그인 컨트롤러

```java
@Controller
public class LoginController {

    @GetMapping("/login")
    public String login(@RequestParam(value = "error", required = false) String error,
                        @RequestParam(value = "exception", required = false) String exception,
                        Model model) {

        model.addAttribute("error", error);
        model.addAttribute("exception", exception);

        return "login";
    }
```

## 커스텀 인증 실패 핸들러

```java
@Component
public class CustomAuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException, ServletException {

        String errorMessage = exception.getMessage();

        if (exception instanceof BadCredentialsException) {
            errorMessage = "Invalid Username or Password!";
        } else if (exception instanceof InsufficientAuthenticationException) {
            errorMessage = "Invalid Secret key!";
        } else if (exception instanceof UsernameNotFoundException) {
            errorMessage = "존재하지 않는 아이디 입니다.";
        }

        setDefaultFailureUrl("/login?error=true&exception=" + errorMessage);

        super.onAuthenticationFailure(request, response, exception);

    }
}
```

## 로그인 페이지 예외 처리

```html
<div th:if="${param.error}" class="form-group">
    <span th:text="${exception}" class="alert alert-danger">error message</span>
</div>
```

## 문제 발생

* 인증 실패 디버깅

![image](https://user-images.githubusercontent.com/69145799/122529524-8b6fee00-d058-11eb-99c9-635bd5a797f8.png)

* 페이지 리다이렉트 결과

![image](https://user-images.githubusercontent.com/69145799/122529874-e4d81d00-d058-11eb-8fea-d7922ad59e82.png)

> ⬆ `/login?error=true&exception=` URL에서 인코딩 오류 발생

# 원인

URL 페이지에서 한글 인코딩을 처리할 때 문제가 발생했다.

* 영문 예외 메세지의 경우

`/login?error=true&exception=Invalid%20Username%20or%20Password!`

* 한글 예외 메시지의 경우

`/login?error=true&exception=????%20??%20???%20???.`

> 한글 문자 자체는 브라우저에서 URL에 맞도록 자동으로 인코딩(Percent-encoding)을 해주지 않기 때문에 문제가 발생했다.

## URL의 Percent-encoding

한글을 표현할 수 있는 인코딩을 생각해보면 `UTF-8`, `EUC-KR` 또는 `CP949` 이 있다.

하지만 이러한 인코딩을 그대로 URL에 사용할 수는 없다. 따라서 `Percent-encoding`을 이용하여 문자를 표현해야 한다. 아마 대부분의 URL에서 본 적이 있을 것이다.

* Percent-encoding 예시

```
변환 전 : /I have a dream. 
변환 후 : /I%20have%20a%20dream.
```

한글의 경우는 `한글 문자열` -> `UTF-8` -> `Percent-encoding` 과 같은 순서로 인코딩이 진행된다.

`Percent-encoding` 은 ASCII 문자로 표현할 수 없는 값들을 옥텟 값으로 묶어서 16진수 값으로 인코딩하는 방식이라고 한다. 따라서 `UTF-8` 과 같이 8-bit 코드페이지가 있는 문자들은 `Percent-encoding`이 가능하다고 한다.

```
변환 전 : /한글
변환 후 : /%ED%95%9C%EA%B8%80
```

# 해결

따라서 위처럼 한글 문자를 `UTF-8` 인코딩 문자열로 변환해주어야 했다.

## URLEncoder 클래스 사용

`URLEncoder` 클래스를 이용하여 간단히 인코딩이 가능하다.

```java
import java.net.URLEncoder;

@Component
public class CustomAuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException, ServletException {

        String errorMessage = exception.getMessage();

        if (exception instanceof BadCredentialsException) {
            errorMessage = "잘못된 아이디 혹은 패스워드입니다!";
        } else if (exception instanceof InsufficientAuthenticationException) {
            errorMessage = "암호키가 잘못되었습니다!";
        } else if (exception instanceof UsernameNotFoundException) {
            errorMessage = "존재하지 않는 아이디 입니다.";
        }

        // UTF-8 인코딩 처리
        errorMessage = URLEncoder.encode(errorMessage, "UTF-8");
        setDefaultFailureUrl("/login?error=true&exception=" + errorMessage);

        super.onAuthenticationFailure(request, response, exception);

    }
}
```

* 페이지 리다이렉트 결과

![image](https://user-images.githubusercontent.com/69145799/122534061-21a61300-d05d-11eb-91d0-02ac52cd0a7b.png)


# References

* [위키피디아 - 퍼센트 인코딩](https://ko.wikipedia.org/wiki/퍼센트_인코딩){:target="_blank"}
* [나무위키 - UTF-8](https://namu.wiki/w/UTF-8){:target="_blank"}