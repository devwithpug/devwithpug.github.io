---
title: '랜손챗 - 스프링 시큐리티 JWT 인증 방식 도입'
categories: project
tags: ['project', 'randhand-chat']
header:
    teaser: /assets/teasers/randhand.jpg
last_modified_at: 2021-07-26T00:00:00+09:00
---
__[<font size="50">👋랜손챗 프로젝트 깃허브 바로가기</font>](https://github.com/devwithpug/RandHand-Chat){:target="_blank"}{:size="50pt"}__

- - -

# 개요

진행 중인 프로젝트 `랜손챗` 애플리케이션의 백엔드 서버를 개발하면서 인증, 인가와 관련된 서버 보안 설계에 대해 정리해보려고 한다.

__기존 설계 방식의 제한점 -> 대안 적용 -> 결과 -> 얻은 점__

# 기존 설계 방식

[![image](https://user-images.githubusercontent.com/69145799/124782737-6b5c8c00-df7f-11eb-989a-2da9397948c8.jpg){:.align-center}](https://user-images.githubusercontent.com/69145799/124782737-6b5c8c00-df7f-11eb-989a-2da9397948c8.jpg)

> ⬆ 보여주기 부끄러운 초기 서버 구상도

채팅 애플리케이션의 유저들을 관리하기 위해 인증 방식을 고민하다가 스프링 시큐리티에서 아주 간단히 `OAuth2.0` 클라이언트 서버를 구축할 수 있어서 이를 백엔드 서버의 인증 방식으로 사용하고자 결정했었다.

서블릿 입장에서는 인증에 아무런 문제가 없었지만 시간이 지날수록 문제점들이 나타났다.

# 문제점

## 1. __Spring Security OAuth2.0의 한계__

> 안드로이드 애플리케이션과 서버의 인증 방식에 연동이 필요했기 때문에 오직 REST API에 의존하여 HTTP 요청만으로 OAuth2.0 인증을 시도했었다. 스프링 시큐리티에서 기본적으로 제공하는 OAuth2.0 인증 라이브러리를 들여다보니 인증과 별개로 인증 변조 시도를 잡기 위해 html 웹상에서 임의로 생성되는 값 ex) code 들이 있었고 이를 안드로이드와 연동하여 HTTP 요청만으로 정상적인 인증을 수행하기는 불가능해 보였다.(스프링 OAuth2 라이브러리를 그대로 쓴다는 전제하에)

## 2. __세션 관리의 모호함 & 세션 유지에 쿠키가 필요하지 않음__

> 안드로이드 애플리케이션과 백엔드 서버에 세션 상태 유지 방법을 생각하면서 초기에는 레디스를 통해 세션 전용 DB를 구성하여 안드로이드와, 백엔드 모두 세션에 접근하면 문제가 없을 것이라 생각했다.
> 
> 인증에 성공한 유저에 대해 레디스에 유저 엔티티 객체 값을 임의로 저장하도록 하여 안드로이드에서 백엔드 서버에 접근하지 않고 유저 엔티티에 접근이 가능하도록 구현했지만 인증에 성공하면서 자동으로 생성되는 session:Attr 값이 따로 존재했었고 이러한 세션 데이터들과 임의로 추가한 유저 객체 데이터를 유지 하는게 메모리 측면에서 좋지 않은 접근이라고 생각했다.
> 
> 또한 OAuth2.0 인증에서는 별도의 쿠키로 세션 유지가 진행되는데 이 또한 안드로이드 애플리케이션과는 전혀 상관 없는 기능이였다.

## 3. __OAuth2 Authentication 필터 커스터마이징과 관련된 지식 부족__

> 앞에서 말한 기본 스프링 시큐리티 OAuth2.0 라이브러리의 한계점을 극복하기 위해 해당 클래스를 상속받아 커스텀 클래스를 설계하려는 시도를 해보았지만 쉽지 않았고 `code`와 같이 html에서 임의로 생성되는 값의 규칙도 알 수 없어서 내 입맛대로 구현하기가 힘들었다.

# 대안

## JWT 도입

이러한 문제들을 피하기 위해 대안을 찾던 중 JWT 인증 방식을 이용하는 것으로 결정하게 되었다. JWT를 사용해본 적은 없지만 아래와 같은 특징으로 우리의 프로젝트에 알맞은 인증 프로토콜이라고 생각했다.

1. JSON을 암호화하여 문자열로 토큰을 표현하므로 안드로이드 애플리케이션과 백엔드 간의 REST 서비스로 제공이 가능하다.
2. 쿠키를 사용하지 않기 때문에 JWT 인증은 CORS 공격이 불가능하다.
3. 트래픽에 대한 부담이 낮고 세션 관리를 위한 별도의 DB(레디스) 구성이 필요하지 않다.
4. 안드로이드 애플리케이션, 백엔드 서버, 손 제스처 인식(파이썬)의 세 가지 구조로 이루어져 있어 마이크로 서비스 환경에서 쉽게 적용이 가능하다.
5. Stateless 하며 필요시 Claims 을 설정하거나, access & refresh token으로 분리하여 구성이 가능하다.

# 적용

## 0. `build.gradle` 의존성 추가

```gradle
implementation 'io.jsonwebtoken:jjwt:0.9.1'
```

## 1. JWT 토큰을 처리하는 커스텀 인증 필터 구현

```java
public class CustomAuthenticationFilter extends AbstractAuthenticationProcessingFilter {
    /* 생략 */

    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) throws AuthenticationException, IOException, ServletException {

        try {

            RequestLogin credentials = new ObjectMapper().readValue(request.getInputStream(), RequestLogin.class);
            return getAuthenticationManager().authenticate(
                new CustomAuthenticationToken(new ArrayList<>(), credentials.getEmail(), credentials.getUserId())
            );

        } catch (IOException e) {
            throw new RuntimeException(e);
        }

    }

    @Override
    protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, FilterChain chain, Authentication authResult) throws IOException, ServletException {

        String email = (String) authResult.getPrincipal();
        UserDto userDetails = userService.getUserByEmail(email);

        String token = Jwts.builder()
                .setSubject(userDetails.getUserId())
                .setExpiration(new Date(System.currentTimeMillis() +
                        Long.parseLong(env.getProperty("token.expiration_time"))))
                .signWith(SignatureAlgorithm.HS512, env.getProperty("token.secret"))
                .compact();

        response.addHeader("token", token);
        response.addHeader("userId", userDetails.getUserId());

    }
}
```

> 애플리케이션에서 OAUth2 인증을 성공한 유저의 정보로 JWT 인증을 진행하는 것으로 설정하였다.
> 따라서 principal = email, credentials = userId 값으로 초기화 하며
> 인증 성공시 헤더에 token, userId 값을 포함하여 전송

## 2. UserDetailsService 구현체 

```java
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    /* 생략 */

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {

        UserEntity userEntity = userRepository.findByUserId(username);

        if (userEntity == null) {
            throw new UsernameNotFoundException("userId : " + username + " not exists!");
        }
        return new User(userEntity.getEmail(), userEntity.getUserId(),
                true, true, true, true,
                new ArrayList<>());

    }
}
```

> 스프링 시큐리티에서 제공하는 인증 인가 추상 클래스들을 이용해야 하므로 loadUserByUsername 오버라이딩

## 3. Authentication Provider 커스터마이징

Authentication Manager에게서 실제 인증 처리를 위임받는 Provider 클래스 구현

```java
public class CustomAuthenticationProvider implements AuthenticationProvider {

    @Autowired
    private UserService userService;

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {

        String email = (String) authentication.getPrincipal();
        String userId = (String) authentication.getCredentials();

        UserDetails userDetails = userService.loadUserByUsername(userId);
        UserDto userDto = userService.getUserByUserId(userId);

        if (!userDto.getEmail().equals(email)) {
            throw new BadCredentialsException("BadCredentialsException");
        }

        return new CustomAuthenticationToken(userDetails.getAuthorities(), email, userId);
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return CustomAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
```

> 중복 예외 처리는 서비스 클래스에서 담당하며 AuthenticationProvider 는 JWT 토큰의 principal, credential 을 통해 인증 수행

## 4. 커스텀 JWT 토큰 구현

```java
public class CustomAuthenticationToken extends AbstractAuthenticationToken {

    private final Object principal;

    private Object credentials;

    public CustomAuthenticationToken(Collection<? extends GrantedAuthority> authorities, Object principal, Object credentials) {

        super(authorities);
        this.principal = principal;
        this.credentials = credentials;
        setAuthenticated(true); // 권한

    }

    @Override
    public Object getCredentials() {
        return this.credentials;
    }

    @Override
    public Object getPrincipal() {
        return this.principal;
    }

    @Override
    public void eraseCredentials() {
        super.eraseCredentials();
        this.credentials = null;
    }
}
```

> 초기 구현은 Authorization 데이터는 포함하지 않음

## 5. SecurityConfig 설정 클래스

```java

/* 생략 */

@Bean
public CustomAuthenticationFilter customAuthenticationFilter() throws Exception {
    return new CustomAuthenticationFilter(authenticationManager(), userService, env);
}

@Bean
public AuthenticationProvider customAuthenticationProvider() {
    return new CustomAuthenticationProvider();
}

@Override
protected void configure(AuthenticationManagerBuilder auth) throws Exception {
    auth.authenticationProvider(customAuthenticationProvider());
}
```

> 커스텀 필터, 프로바이더 빈 생성, 구현한 프로바이더 설정

## 6. gateway-service JWT 필터 구현

```java
@Slf4j
@Component
public class AuthorizationHeaderFilter extends AbstractGatewayFilterFactory<AuthorizationHeaderFilter.Config> {

    private Environment env;

    public AuthorizationHeaderFilter(Environment env) {
        super(Config.class);
        this.env = env;
    }

    @Override
    public GatewayFilter apply(Config config) {
        return ((exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                return onError(exchange, "No authorization in header", HttpStatus.UNAUTHORIZED);
            } else if (!request.getHeaders().containsKey("userId")) {
                return onError(exchange, "No userId in header", HttpStatus.UNAUTHORIZED);
            }

            String userId = request.getHeaders().get("userId").get(0);
            String token = request.getHeaders().get(HttpHeaders.AUTHORIZATION).get(0);

            String jwt = token.replace("Bearer ", "");

            if (!isJwtValid(jwt, userId)) {
                return onError(exchange, "JWT token is not valid", HttpStatus.UNAUTHORIZED);
            }

            return chain.filter(exchange);

        });
    }

    private boolean isJwtValid(String jwt, String userId) {
        boolean returnValue = true;

        String subject = null;

        try {
            subject = Jwts.parser().setSigningKey(env.getProperty("token.secret"))
                    .parseClaimsJws(jwt).getBody()
                    .getSubject();
        } catch (Exception e) {
            returnValue = false;
        }

        if (subject == null || subject.isEmpty() || !subject.equals(userId)) {
            returnValue = false;
        }

        return returnValue;
    }

    private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus httpStatus) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(httpStatus);
        log.error(err);
        return response.setComplete();
    }

    public static class Config {
    }
}
```

> 마이크로 서비스 접근 전, 게이트웨이에서 jwts 라이브러리 이용하여 토큰 생성, 검증 수행

## 7. gateway-service application.yml 라우터 정보 수정

```yaml
spring:
  application:
    name: gateway-service
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://USER-SERVICE
          predicates:
            - Path=/user-service/login
            - Method=POST
          filters:
            - RemoveRequestHeader=Cookie
            - RewritePath=/user-service/(?<segment>.*), /$\{segment}

        - id: user-service
          uri: lb://USER-SERVICE
          predicates:
            - Path=/user-service/users
            - Method=POST
          filters:
            - RemoveRequestHeader=Cookie
            - RewritePath=/user-service/(?<segment>.*), /$\{segment}

        - id: user-service
          uri: lb://USER-SERVICE
          predicates:
            - Path=/user-service/**
          filters:
            - RemoveRequestHeader=Cookie
            - RewritePath=/user-service/(?<segment>.*), /$\{segment}
            - AuthorizationHeaderFilter
```

> 로그인, 회원가입을 제외한 모든 엔드포인트에 JWT 인증 필터 설정

# 결과

## JWT Authentication testing via Postman

![image](https://user-images.githubusercontent.com/69145799/125286876-3e312480-e357-11eb-938d-35db65dfaa90.png){:.align-center}

> Login

![image](https://user-images.githubusercontent.com/69145799/125287157-8bad9180-e357-11eb-9795-9fa0d5d25e82.png){:.align-center}

> JWT 인증 정상 작동

# References

* [https://jwt.io](https://jwt.io){:target="_blank"}
* [https://www.toptal.com/java/rest-security-with-jwt-spring-security-and-java](https://www.toptal.com/java/rest-security-with-jwt-spring-security-and-java){:target="_blank"}
* [https://www.toptal.com/spring/spring-security-tutorial](https://www.toptal.com/spring/spring-security-tutorial){:target="_blank"}
* [https://www.javainuse.com/spring/boot-jwt](https://www.javainuse.com/spring/boot-jwt){:target="_blank"}