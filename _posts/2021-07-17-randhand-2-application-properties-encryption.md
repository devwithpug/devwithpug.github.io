---
title: '랜손챗 - application.yml 설정 파일 암호화 및 외부 관리'
categories: project
tags: ['project', 'randhand-chat']
header:
    teaser: /assets/teasers/randhand.jpg
last_modified_at: 2021-07-27T00:00:00+09:00
---

__[<font size="50">👋랜손챗 프로젝트 깃허브 바로가기</font>](https://github.com/devwithpug/RandHand-Chat){:target="_blank"}{:size="50pt"}__

- - -

# 개요

스프링 부트 프로젝트의 애플리케이션 설정 파일의 관리 방법을 변경했다.

먼저 랜손챗 백엔드 서버의 경우 마이크로 서비스 패턴을 통해 구현함을 목표로 하고 있다. 따라서 프로젝트의 마이크로 서비스들은 다음과 같다.

- eureka-server
- gateway-service
- user-service
- chat-service
- gesture-service

# 문제점

## 1. __마이크로 서비스 설정 파일들의 중복성__

각각의 마이크로 서비스들은 공통적인 설정들을 가지므로 파일이 중복되어 관리되며 한 가지 변경점이 생기면 각각의 마이크로 서비스의 설정 파일들을 모두 변경해 주어야 하는 문제가 있다.

## 2. __설정 파일 변경 시 서버를 재기동 해야 하는 문제__

변경된 설정 파일을 적용하려면 서버를 재기동해야한다. 하나의 WAS에서, 또는 개발 환경에서 충분히 수용할 수 있는 점이지만 프로젝트가 완성되며 배포가 완료된 후의 관리를 생각해 보면 임의로 서버를 재기동하는 것은 옳지 않다.

## 3. __설정 파일 암호화 필요__

설정 파일마다 외부에 공개되어 서는 안되는 값들이 존재한다. (IP, PORT, ID, PWD, etc..) 따라서 설정 파일을 외부 환경에서 관리함과 동시에 설정 파일들의 암호화, 복호화 기능 또한 필요된다.

# 대안

## `build.gradle` 의존성 추가

```gradle
implementation 'org.springframework.cloud:spring-cloud-starter-bus-amqp'
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'org.springframework.cloud:spring-cloud-starter-config'
implementation 'org.springframework.cloud:spring-cloud-starter-bootstrap'
```

## 설정 파일 분리 & config github repository 생성

* [https://github.com/devwithpug/RandHand-config](https://github.com/devwithpug/RandHand-config){:target="_blank"}

## keytool 을 통하여 암호화 키 생성(RSA)

```bash
keytool -genkeypair -alias [ALIAS] -keyalg RSA \
    -dname “CN=[COMMON NAME], OU=[ORGANIZATION UNIT], O=[ORGANIZATION], L=[LOCALITY], C=[COUNTRY]” \
    -keypass “[PWD]” -keystore KEY.jks -storepass “[PWD]”
```

keypair 를 생성했으므로 `-export`, `-import` 를 통해 인증서와 공개키를 생성할 수 있다.

## config-service 생성

* Config Server 설정

```java
@SpringBootApplication
@EnableConfigServer
public class ConfigServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ConfigServiceApplication.class, args);
    }

}
```

* config-service `application.yml`

```yml
encrypt:
  key-store:
    password: PWD
    alias: apiEncryptionKey
    location: file:apiEncryptionKey.jks
```

생성한 암호화 키를 통하여 즉석에서 암호화 복호화가 가능하다. 서버를 기동한 후 `POST : localhost:8888/encrypt`, `POST : localhost:8888/decrypt` 요청을 통해 plain text 를 전송하면 된다.

![image](https://user-images.githubusercontent.com/69145799/125932372-51845eeb-d536-4741-a673-6c07a7760c87.png){:.align-center}

```yml
spring:
  datasource:
    driver-class-name: org.mariadb.jdbc.Driver
    url: "{cipher}AQBEBc4+UYBaxE4msjjZoP9On3PHqe4xbxcYRsOA69FGvXSzFyLNdn8zbAmvjDA4Mjc58M/847CkxuxbImQx0SJUkBLb/8gCCnefayWWp8jDmk2eD46wDngApGY/XPvs/jmJi0VYui+9PXna8x2q8yyC/JeCPYWCK2iwrsKWrJoYroFWdCYJFrDD7BYcyxXlAa6R4wlsxo/j3EIbSWSac+r9ZZWfgJkNJiZ+jRV+cQTt+yJrn8eT8VuLGlpcVmKSSRhNhgqmZeoroSmZGjJaDL6I/lYww+ozH1+xQ25ynw872I5oIkYKaL1NiLyNJ56YLn25GWVlEExhJfD40kyRiH4GNW3AYZTzZ+GJPhf/DBtn77SOmMnB72ghAthI3TCL4f6/Z0DzMMpFQMg/ZveWLD0GYfQlDp2BZVEWCs4rBSmQVA=="
    username: "{cipher}AQBgbJQdI7dlmpwhEeFcFpNHg2AjtrAboXWzKswP1oEKB8e5LCHWF98MiZBWqvExtFj0RJG5EPicZzv2FztD0xo74dcpI1nYTBqMQoGciyb7JI5ms/WqMhHcYd0U1GbtKuezKrFceWuvzQwZLiK0LZ01Ti0J9k/3hKgN5kpUMYXT0m5GMWkZbvlFbFssBkifqv5vmOJlXN1DZD75tjAIMzMJZsxAhZK49gFyChzHrXbxlxNmisx85NnfrLvBqXsZVf/rNj3fgLVCL3hdy4VAYqaOpvtiVwOcc+fvykQWIObYLJ8poKm36o8JgZVvxpQXZEKFEGJ7Ra+eoryneQb8KTjPJvsgB80UJ8Nd44T/4Q3Quzj0fqa8ajfCFADr1fl6X0Y="
    password: "{cipher}AQAVJnTwVqx9/CN3yuhsSeMCgMHD9ho1r2uF5anNltOI3bXz/Whi+UkCeQG4bdC1RG9mSONwms1Uovq096PHXOtz2Ur53Irso8tLVJOs6WwhVekxQLDtR8qub5oX6STXSd8bOTaeSsXb+mOEjJ21NeY+JhYrvNkeCRO54XnAL+sw31uDYGPTG0FUf8dTaY86TPD/5CGR9ld6wfTcpml44ygQvrucKbbGbXQE77MpbwjqM5nr8QLZ/oIJxG7aARQfU++Didni4gNhTS+Qa+1bxRlKGtKVr3Ou4zRRo5c+NHcAViGAxnF09Fn8bQjBuZm+3kq0GLEtDBvp9DbnCZjiSRt7wWyxvj93wJbNX0JXhmR6JSsmccKc8qllU781lc019l4="
```

암호화된 값들은 설정파일에 입력할 때 `{cipher}CIPHER_TEXT` 와 같이 입력하면 spring cloud config에서 알아서 복호화를 해준다.



## RabbitMQ 의 메시징 큐 서비스 이용

![image](https://user-images.githubusercontent.com/69145799/125928374-31bcac9a-ace7-4539-8082-e3cd9319fadf.png){:.align-center}

![image](https://user-images.githubusercontent.com/69145799/125930672-f911dddc-0a5f-40f7-85d4-99361013270c.png){:.align-center}

`application.yml` 설정 파일에 rabbitmq 관련 설정들을 해주지 않으면 기본 값으로 localhost:5672, guest 계정으로 스프링 부트와 연동이 된다.
(배포 시에는 host, port 값 설정이 필요하다!)

## Spring Cloud Bus

![image](https://user-images.githubusercontent.com/69145799/125930345-a1b0cbc4-3d44-43af-9382-5ca95386308c.png){:.align-center}


`GET : localhost:8888/bus/refresh` 또는 `GET : localhost:8888/actuator/busrefresh` 를 통하여 실시간 설정 파일 수정이 가능하다.

## Spring Cloud Config

![image](https://user-images.githubusercontent.com/69145799/127014523-9b795e1d-6998-49d8-b89a-dcdcd709425a.png){:.align-center}

> ⬆ config-service 접속 결과(모든 설정 파일들을 GET 할 수 있으며 암호문이 복호화 된 상태로 출력된다.)

# 마이크로 서비스에 설정 파일 적용

* config-service와 동일한 의존성 추가 `build.gradle`

```gradle
implementation 'org.springframework.cloud:spring-cloud-starter-bus-amqp'
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'org.springframework.cloud:spring-cloud-starter-config'
implementation 'org.springframework.cloud:spring-cloud-starter-bootstrap'
```

* `resources/bootstrap.yml` 생성 

```yml
spring:
  cloud:
    config:
      uri: http://127.0.0.1:8888
      name: randhand
  profiles:
    active: default, datasource, token
```

> ⬆ 서비스 시작 시 설정된 uri에서 여러 프로파일들을 가져오게 된다.

# References

* [https://cloud.spring.io/spring-cloud-bus/reference/html/](https://cloud.spring.io/spring-cloud-bus/reference/html/){:target="_blank"}

* [https://madplay.github.io/post/spring-cloud-bus-example](https://madplay.github.io/post/spring-cloud-bus-example){:target="_blank"}

* [https://yaboong.github.io/spring-cloud/2018/11/25/spring-cloud-config/](https://yaboong.github.io/spring-cloud/2018/11/25/spring-cloud-config/){:target="_blank"}