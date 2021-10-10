---
title: 'Redis를 통한 HTTP 세션 관리'
categories: devops
tags: ['devops', 'redis', 'spring', 'springsecurity', 'java']
header:
    teaser: /assets/teasers/spring-security-with-redis.jpg
---

스프링 시큐리티에 Redis 관련 종속성을 추가하여 Redis를 통한 세션관리를 구성해보았다.

- - -

# 개요

최근 들어 스프링 시큐리티를 공부할 때 어떤 개념이든 간에 실무에서는 어떤 로직, 어떤 라이브러리로 실제 구현을 할까? 라는 궁금증이 계속 생기고 있다.

`Redis`는 <K, V> 형식의 비정형 데이터를 저장하고 관리하기 위한 오픈소스 기반의 __비관계형 DBMS__ 이다. 모든 데이터를 메모리로 불러와서 처리하는 메모리 기반의 DBMS이기 때문에 __빠른 조회 성능을 위한 Cache나 각 WAS 서버에 분산 되어 있는 세션 정보를 중앙에 모아서 공유 및 관리하기 위한 용도__ 로 많이 사용한다고 한다. 

`Redis` 를 실제로 사용해본 적은 없었는데 `HttpSession` 클래스에 대해 공부하다보니 스프링 부트 환경에서 간단하게 `Redis` 를 사용해볼 수 있다는 것을 알게되었고 추후에 다중 WAS 서버를 다루게 되는 기회가 생길때를 대비해서 직접 사용해보았다.

# Redis 설치

설치 하는 방법은 공식 홈페이지를 통해 다운받거나 도커 이미지를 이용하는 방법도 있다.

나는 Apple Silicon 환경에서 brew 를 통해 설치하였다.

```console
$ brew install redis
```

```console
==> Downloading https://ghcr.io/v2/homebrew/core/redis/manifests/6.2.4
######################################################################## 100.0%
==> Downloading https://ghcr.io/v2/homebrew/core/redis/blobs/sha256:097941b5d4c9845b300682
==> Downloading from https://pkg-containers.githubusercontent.com/ghcr1/blobs/sha256:09794
######################################################################## 100.0%
==> Pouring redis--6.2.4.arm64_big_sur.bottle.tar.gz
==> Caveats
To have launchd start redis now and restart at login:
  brew services start redis
Or, if you don't want/need a background service you can just run:
  redis-server /opt/homebrew/etc/redis.conf
==> Summary
🍺  /opt/homebrew/Cellar/redis/6.2.4: 13 files, 2MB
```

설치가 완료되면 `brew services start redis` 를 통해 서비스로 등록하여 자동으로 redis-server가 실행되도록 할 수 있다.

redis-server를 실행한 후 `redis-cli` 에서 `SET (key)` 또는 `GET (key)` 명령어로 간단히 테스트 해볼 수 있다.

# 스프링 세션


`Spring Session` 은 서버에 저장된 HTTP 세션의 관리에서의 한계점들을 해소하는 목표를 가진다. 이를 통해서 __`Tomcat` 과 같은 단일 컨테이너에 연결하지 않고도 클라우드의 서비스간에 세션 정보를 쉽게 공유할 수 있다.__ 또한 동일한 브라우저에서 여러 세션을 지원하고 헤더로 세션을 전송해준다.

[Baeldung - Guide to Spring Session](https://www.baeldung.com/spring-session){:target="_blank"} 을 참고해서 스프링 부트 프로젝트에 Redis를 추가해보았다.


## build.grade 의존성 추가

스프링 부트에서는 아래의 종속성만 추가해주면 추가 설정없이 로컬 호스트로 Redis 서버와 연결이 된다..!

```gradle
implementation 'org.springframework.boot:spring-boot-starter-data-redis'
implementation 'org.springframework.session:spring-session-data-redis'
```

# 스프링 설정

로컬 환경이 아닌 외부 서버에 접속해야 한다면 아래와 같이 설정 클래스를 구성해주면 된다.

```java
@Configuration
@EnableRedisHttpSession
public class SessionConfig extends AbstractHttpSessionApplicationInitializer {

    @Bean
    public LettuceConnectionFactory connectionFactory() {
        return new LettuceConnectionFactory("127.0.0.1", 6379); // ip, port
    }

}
```

더 간단한 방법은 `application.yml` 또는 `application.properties` 설정 파일에 연결 주소를 설정해주면 된다.

```yml
spring:
  redis:
    host: "127.0.0.1"
    port: 6379
```

서버를 실행하여 디버깅해보면 위의 스프링 설정이 없어도 기본적으로 `RedisHttpSessionConfiguration` 클래스 내에서 `LettuceConnectionFactory` 를 Redis 서버 연결을 위한 `RedisConnectionFactory` 인터페이스의 구현체로 사용되는 것을 확인할 수 있다.

[![image](https://user-images.githubusercontent.com/69145799/123420511-9695c180-d5f6-11eb-9ea6-16970c1483be.png){:.align-center}](https://user-images.githubusercontent.com/69145799/123420511-9695c180-d5f6-11eb-9ea6-16970c1483be.png)

> ⬆ RedisHttpSessionConfiguration 초기화 과정

## Lettuce?, Jedis?

[Baeldung - Guide to Spring Session](https://www.baeldung.com/spring-session){:target="_blank"} 에서는 스프링 부트를 사용하지 않는 경우 `Lettuce` 가 아닌 `Jedis` 를 이용하여 설정하는 방법을 제공하고 있다. 

두가지 라이브러리 모두 `RedisConnectionFactory` 인터페이스의 구현체라는 것은 알겠지만 무슨 차이가 있는지 궁금했다. 대부분 현재는 Lettuce를 사용하는 것 같았다. 

이러한 이유는 [이동욱님의 기술블로그(Jedis 보다 Lettuce 를 쓰자)](https://jojoldu.tistory.com/418){:target="_blank"} 에 자세하게 설명되어있다.

글을 참고하자면 두가지 모두 유명한 Java의 Redis Client 오픈소스이다. 하지만 압도적인 성능차이로 Lettuce를 사용하는 것이었다!

|                           | TPS     | Redis CPU | Redis Connection | 응답 속도 |
| :------------------------ | :------ | :-------- | :--------------- | :-------- |
| Jedis no connection pool  | 31,000  | 20%       | 35               | 100ms     |
| Jedis use connection pool | 55,000  | 69.5%     | 515              | 50ms      |
| Lettuce                   | 100,000 | 7%        | 6                | 7.5ms     |

추가적으로 성능뿐만 아니라 잘 만들어진 __공식 문서, 깔끔하게 디자인된 코드, 빠른 피드백__ 등의 장점을 가지고 있어서 오픈소스로써 많이 사용되는 것 같았다.

# 테스트

## 간단한 컨트롤러

스프링 부트에서 설정을 완료했으므로 `Redis`에서 HTTP 세션을 어떻게 관리하고 있는지 확인해보았다.

먼저, 간단한 로그인과 HTTP 세션 ID 값을 리턴하는 컨트롤러를 만들었다.

인증 방식의 경우 구글의 OAuth2 서비스를 통해 로그인하도록 했다.(생략)

```java
/**
 * Account : OAuth2User 인터페이스 구현체
 * CustomOAuth2AccountService : OAuth2UserService 인터페이스 구현체
 */
@RestController
@RequiredArgsConstructor
public class HomeController {

    private final CustomOAuth2AccountService oAuth2UserService;
    private final HttpSession httpSession;

    @GetMapping
    public String home() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // DB 로부터 Account 엔티티를 가져옴(영속성 객체)
        Account account1 = oAuth2UserService.getAccount(authentication.getPrincipal());
        // HTTP 세션에 저장된 Account 객체를 가져옴
        Account account2 = (Account) httpSession.getAttribute("user");
        // 세션에 임의의 데이터 설정
        httpSession.setAttribute("someAttribute", "someValue");

        return httpSession.getId();
    }

}
```

## 실행 결과

![image](https://user-images.githubusercontent.com/69145799/123432650-8f29e480-d605-11eb-8edd-cb44691362c4.png){:.align-center}

정상적으로 로그인되어 세션이 생성된 것을 확인할 수 있었다.

다음으로 `keys *` 명령어를 통해 redis-server에 저장된 세션값이 일치하는지 확인해보았다.

```console
$ redis-cli

127.0.0.1:6379> keys *
1) "spring:session:expirations:1624625820000"
2) "spring:session:sessions:expires:16afafae-66b8-49e9-9651-3bbb9794f223"
3) "spring:session:index:org.springframework.session.FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME:100011660713558149631"
4) "spring:session:sessions:16afafae-66b8-49e9-9651-3bbb9794f223"
5) "spring:session:expirations:1624626360000"
```

별다른 설정없이 `Spring Session` 에서 세션과 관련된 값을 Redis에 저장한 것을 확인할 수 있다. 

Key와 매치되는 Value를 확인하려면 `hgetall` 명령어를 사용하면 된다.

```console
127.0.0.1:6379> hgetall spring:session:sessions:16afafae-66b8-49e9-9651-3bbb9794f223
 1) "sessionAttr:SPRING_SECURITY_LAST_EXCEPTION"
 2) ""
 7) "sessionAttr:user"
 8) "\xac\xed\x00\x05sr\x006dev.with.pug.springsecurityoauth.domain.entity.Account\xbd\xe0p!^g!;\x02\x00\aL\x00\tcreatedAtt\x00\x10Ljava/util/Date;L\x00\x05emailt\x00\x12Ljava/lang/String;L\x00\x02idt\x00\x10Ljava/lang/Long;L\x00\x0elastModifiedAtq\x00~\x00\x01L\x00\apictureq\x00~\x00\x02L\x00\x04rolet\x005Ldev/with/pug/springsecurityoauth/domain/entity/Role;L\x00\busernameq\x00~\x00\x02xpsr\x00\x12java.sql.Timestamp&\x18\xd5\xc8\x01S\xbfe\x02\x00\x01I\x00\x05nanosxr\x00\x0ejava.util.Datehj\x81\x01KYt\x19\x03\x00\x00xpw\b\x00\x00\x01z>c\x93\x18x4\xc0\a@t\x00\x14zmfjscl789@gmail.comsr\x00\x0ejava.lang.Long;\x8b\xe4\x90\xcc\x8f#\xdf\x02\x00\x01J\x00\x05valuexr\x00\x10java.lang.Number\x86\xac\x95\x1d\x0b\x94\xe0\x8b\x02\x00\x00xp\x00\x00\x00\x00\x00\x00\x00\x05sq\x00~\x00\x06w\b\x00\x00\x01zBc\xae\xf8x\x11\xd2`\xc0t\x00Yhttps://lh3.googleusercontent.com/a-/AOh14GhhVPPgvZ6b1CEonMNDs6g-I21hoiLZB9sPEI7-8Q=s96-c~r\x003dev.with.pug.springsecurityoauth.domain.entity.Role\x00\x00\x00\x00\x00\x00\x00\x00\x12\x00\x00xr\x00\x0ejava.lang.Enum\x00\x00\x00\x00\x00\x00\x00\x00\x12\x00\x00xpt\x00\x05GUESTt\x00\x0bJungyu Choi"
 9) "lastAccessedTime"
10) "\xac\xed\x00\x05sr\x00\x0ejava.lang.Long;\x8b\xe4\x90\xcc\x8f#\xdf\x02\x00\x01J\x00\x05valuexr\x00\x10java.lang.Number\x86\xac\x95\x1d\x0b\x94\xe0\x8b\x02\x00\x00xp\x00\x00\x01zCc\n\x80"
11) "creationTime"
12) "\xac\xed\x00\x05sr\x00\x0ejava.lang.Long;\x8b\xe4\x90\xcc\x8f#\xdf\x02\x00\x01J\x00\x05valuexr\x00\x10java.lang.Number\x86\xac\x95\x1d\x0b\x94\xe0\x8b\x02\x00\x00xp\x00\x00\x01zC_\xc6\xd3"
13) "sessionAttr:someAttribute"
14) "\xac\xed\x00\x05t\x00\tsomeValue"
15) "sessionAttr:org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizationRequestRepository.AUTHORIZATION_REQUEST"
16) ""

```

자세히 보면 `9)lastAccessedTime`, `11)creationTime`, `13)sessionAttr` 과 같이 HTTP 세션이 가지는 데이터들과 컨트롤러에서 임의로 추가한 `13)someAttribute` 도 확인할 수 있다!

## 객체의 영속성

![image](https://user-images.githubusercontent.com/69145799/123427726-f5ac0400-d5ff-11eb-8c17-93dab26d4879.png){:.align-center}

> ⬆ account1: DB에서 가져온 Account 엔티티 / account2: 세션에서 가져온 Account 객체

위와 같이 DB와 세션에서 각각 `Account` 객체를 가져오면 객체 고유 번호가 다른 것을 확인할 수 있다.

이는 세션에서 가져온 `Account` 객체는 영속성 컨텍스트에서 관리되고 있지 않기 때문인데, 이를 혼동하지 않기 위해선 세션에 저장할 `Attribute`를 위한 별도의 클래스를 생성하여 관리해야 할 것 같다.

# References

* [Baeldung - Guide to Spring Session](https://www.baeldung.com/spring-session){:target="_blank"}
* [이동욱님의 기술블로그(Jedis 보다 Lettuce 를 쓰자)](https://jojoldu.tistory.com/418){:target="_blank"}