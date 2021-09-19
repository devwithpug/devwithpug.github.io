---
title: 'Querydsl로 안전한 쿼리 작성하기 + DataJPA'
categories: java
tags: ['java', 'jpa', 'querydsl']
header:
    teaser: /assets/teasers/querydsl.jpg
---

# 개요

__[Querydsl 홈페이지 바로가기](https://querydsl.com/){:target="_blank"}__

나는 평소 `DataJPA` 에만 의존하여 코드를 작성하고 있었다. `Querydsl` 이라는 라이브러리가 있다는 것만 알았고 사용해 보지는 않았는데 궁금증이 생겼고 `Querydsl` 을 사용해 보면서 느낀 여러 유즈케이스들을 공유해 보고 싶어서 글을 쓰게 되었다.

## 엔티티 구성

예제 코드에 사용될 엔티티들은 다음과 같다.

`Room`, `User` 엔티티가 각각 1:N 으로 결합되어 있으며 매우 간단한 구조를 가지고 있다.

```java
@Data
@Entity
@NoArgsConstructor
public class Room {

    @Id @GeneratedValue
    @Column(name = "room_id")
    private Long id;

    @Column
    private String roomName;

    @OneToMany(mappedBy = "room")
    private List<User> users = new ArrayList<>();

    // 생성자 생략
}
```

```java
@Data
@Entity
@NoArgsConstructor
public class User {

    @Id @GeneratedValue
    @Column(name = "user_id")
    private Long id;

    @Column
    private String username;

    @Column
    private int age;

    @Column
    private String type;

    @Column
    private int score;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    // 생성자 생략
}
```

# JPQL의 문제점 

`Querydsl` 에 대해 알아보기 전에 기존 `JPQL` 의 문제점들을 말해보자면 다음과 같다.

__문자열로 쿼리를 하나하나 작성해야 한다는 점!__

`JPQL` 에 익숙해지다 보면 큰 문제가 되지는 않지만 문자열의 최대 단점은 안정성이 매우 떨어진다는 것이다. 

오타 또는 공백 하나의 프로퍼티를 잘못 참조하여 잘못된 결과를 가져오거나 올바르지 않은 쿼리문으로 바뀔 수 있다. 하지만 이런 __오류가 생겨도 자바 프로젝트는 정상적으로 빌드가 된다는 점.__ 컴파일 단계에서 에러를 잡지 못하고 __테스트 단계에서 에러를 잡아야 한다는 점.__ __최악의 경우 테스트 코드가 작성되지 않았거나 테스트를 통과하게 되어 잘못된 JPQL 쿼리가 서비스에 배포된다면 크리티컬한 문제들이 생길 수 있다.__

아래의 코드는 공백 하나의 부재로 인해 런타임 에러가 발생하는 케이스이다. `DataJPA` 또한 동일한 문제가 발생한다.

```java
/* JPA Repository */
@Repository
@Transactional
@RequiredArgsConstructor
public class UserJpaRepository {

    private final EntityManager em;

    public List<User> findAllWithJoinByAgeBetween(int goe, int loe) {
        return em.createQuery(
                        "select u " +
                        "from User u " +
                        "left join u.room r" + // <- 공백이 없지만 빌드는 정상적으로 수행되며 런타임 에러가 발생
                        "where u.age between :goe and :loe", User.class)
                .setParameter("goe", goe)
                .setParameter("loe", loe)
                .getResultList();
    }
}

/* DataJPA Repository */
public interface UserDataJpaRepository extends JpaRepository<User, Long> {

    // DataJpa의 경우 동일한 문제가 발생할 수 있다.
    @Query("select u from User u left join u.room r where u.age between ?1 and ?2")
    List<User> findAllWithJoinByAgeBetween(int goe, int loe);

}
```

# Querydsl

`Querydsl` 이란 `Querydsl` 을 통하여 생성되는 정적 `Q-type` 클래스를 이용하여 `SQL` 과 같은 쿼리를 생성하도록 도와주는 프레임워크이다. `JPA` 뿐만 아니라 `MongoDB`, `JDO`, `Lucene` 과 같은 라이브러리도 제공하고 있다.

앞에서 말했던 `JPQL`의 단점을 완벽하게 커버할 수 있는 `Querydsl` 은 타입에 안전한 방식으로 쿼리를 실행할 수 있다. 타입을 통하여 쿼리를 작성하므로 도메인 모델의 프로퍼티 변경에 유연하게 대처가 가능하며 강력한 코드 자동완성 기능의 이점을 얻을 수 있고 무엇보다 쿼리를 빠르고 안전하게 만들 수 있다.

## 의존성 추가

Gradle 프로젝트에서 의존성을 추가하는 방법은 다음과 같다. 현재 5.0.0 버전이 최신 버전이며 다음과 같은 라이브러리들이 필요하다.

* `querydsl-jpa` : `Querydsl` 사용을 위한 라이브러리
* `querydsl-core` : 코어 라이브러리. `querydsl-jpa`을 통해 함께 가져올 수 있지만 4.4.0 버전의 core를 가져오는 문제가 있어서 현재는 추가적으로 버전 명시가 필요함.
* `annotationProcessor` : `Querydsl` 에서는 기존에 작성된 JPA 엔티티 클래스들을 어노테이션을 통해 인식하여 `Querydsl` 에서 사용 가능한 전용 `Q-type` 클래스들을 자동으로 생성 해준다. 이때 `JPA` 엔티티 클래스들을 인식하기 위해 다음과 같은 라이브러리 의존성이 요구된다.

그리고 `Q-type` 클래스들을 생성할 디렉터리를 명시해 주어야 한다. 이는 개발자마다 프로젝트의 구조가 다르기 때문에 자신이 원하는 디렉터리를 커스터마이징할 수 있다. 그리고 `compileJava` task에서 `Q-type` 클래스를 생성하도록 지정해 주었다.

* `build.gradle`

```groovy
dependencies {
	implementation 'com.querydsl:querydsl-jpa:5.0.0'
	implementation 'com.querydsl:querydsl-core:5.0.0'
	annotationProcessor(
			'javax.persistence:javax.persistence-api:2.2',
			'javax.annotation:javax.annotation-api:1.3.2',
			'com.querydsl:querydsl-apt:5.0.0:jpa'
	)
	testImplementation 'com.querydsl:querydsl-jpa:5.0.0'
	testAnnotationProcessor 'com.querydsl:querydsl-apt:5.0.0'
}

def queryDslOutput = file(new File(projectDir, '/src/main/generated/'))
sourceSets {
	main {
		java {
			srcDir queryDslOutput
		}
	}
}

compileJava {
	options.compilerArgs << '-s'
	options.compilerArgs << "$projectDir/src/main/generated/"

	doFirst {
		delete(files("${projectDir}/src/main/generated/"))
		file(new File(projectDir, '/src/main/generated/')).mkdirs();
	}
}

```

## compileJava task 실행

```bash
./gradlew compileJava 
```

`compileJava` Gradle task를 실행하면 `build.gradle`에서 지정한 디렉터리에 `Q-type` 클래스들이 생성된 것을 확인할 수 있다.

* `QUser.java`

![image](https://user-images.githubusercontent.com/69145799/133917090-26f6ff1d-546d-4a4c-9b54-b9999a9d8453.png){:.align-center}

## Bean 등록

다음으로는 `Querydsl` 의 쿼리를 작성할 `JPAQueryFactory` 클래스를 빈으로 등록해 주었다.

```java
@Configuration
@RequiredArgsConstructor
public class AppConfig {
    
    private final EntityManager em;

    @Bean
    public JPAQueryFactory queryFactory() {
        return new JPAQueryFactory(em);
    }
    
}
```

## Querydsl 사용 사례

`Querydsl` 을 통해 생성한 예제 쿼리들을 몇 가지 작성해 보았다.

### join 쿼리

`.join()`, `.leftJoin()` 과같이 사용 가능하며 `.on()` 절을 통하여 동적인 조건을 통해 연관관계없이 조인도 가능하다.

또한 쿼리 성능 최적화를 위한 fetch join도 아래와 같이 사용할 수 있다.

```java
import static com.example.querydslexample.entity.QRoom.room;
import static com.example.querydslexample.entity.QUser.user;

/* with JPQL */
List<User> resultList = em.createQuery(
                        "select u " +
                        "from User u " +
                        "join u.room r", User.class)
        .getResultList();

/* with Querydsl */
List<User> resultQuerydsl = queryFactory
                .selectFrom(user)
                .join(user.room, room).fetchJoin() // fetch join 또한 가능하다
                .fetch();
```

### 페이징 쿼리

페이징 쿼리 또한 `JPQL` 과 매우 유사하다.

`Querydsl` 의 이전 버전에서는 `fetchResults()`, `fetchCount()` 메소드를 이용하여 페이징 쿼리를 작성했지만 __5.0.0 버전에서 deprecated 되었다.__ 이유는 다음과 같다.

> fetchResults() : Get the projection in QueryResults form. Make sure to use fetch() instead if you do not rely on the QueryResults.getOffset() or QueryResults.getLimit(), because it will be more performant. Also, count queries cannot be properly generated for all dialects. For example: in JPA count queries can't be generated for queries that have multiple group by expressions or a having clause. Get the projection in QueryResults form. Use fetch() instead if you do not need the total count of rows in the query result.


>  fetchCount() : An implementation is allowed to fall back to fetch().size().

count 쿼리가 모든 dialect에서 또는 다중 그룹 쿼리에서 완벽하게 지원되지 않기 때문에 count 정도는 자바에서 처리하도록 권고하고 있다. 서비스의 크기에 따라 다르겠지만 최대한 애플리케이션의 부하를 DB로 넘기고 싶은 경우에는 count 쿼리를 어떻게 날릴지 한 번쯤 고민해 보아야 할 것 같다.

따라서 아래와 같이 페이징 쿼리문을 작성하면 된다.

```java
import static com.example.querydslexample.entity.QUser.user;

public Page<User> findUserWithPaging(Pageable pageable) {

	List<User> content = queryFactory
			.selectFrom(user)
			.where(user.username.like("user_"))
			.offset(pageable.getOffset()) // offset
			.limit(pageable.getPageSize()) // limit
			.fetch();

	return new PageImpl<>(content, pageable, content.size()); // 쿼리 결과로 페이징 객체 리턴
}

```

### 서브 쿼리

서브 쿼리의 경우는 `Querydsl` 에서 제공하는 `JPAExpressions` 클래스를 사용하여 가독성 있는 코드 구현이 가능하다.

서브 쿼리에서 주의할 점은 __메인 쿼리와 서브 쿼리의 Q-type 객체를 분리하여 사용해야 한다는 점이다.__

```java
import com.querydsl.jpa.JPAExpressions;
import static com.example.querydslexample.entity.QUser.user;

/* with JPQL */
List<User> result = em.createQuery(
                "select u " +
                "from User u " +
                "where u.score in (" +
                        "select max(u.score) " +
                        "from User u " +
                        "group by u.type) " +
                "group by u.type", User.class)
        .getResultList();

/* with Querydsl */
// 1. where절 서브쿼리(중첩 서브쿼리)
QUser userSub = new QUser("userSub"); // 서브 쿼리를 위한 Q타입 객체가 하나 더 필요함

List<User> resultNestedSubQuery = queryFactory
        .selectFrom(user)
        .where(user.score.in(JPAExpressions
                .select(userSub.score.max())
                .from(userSub)
                .groupBy(userSub.type)))
        .groupBy(user.type).fetch();

// 2. select절 서브쿼리(스칼라 서브쿼리)
List<Double> resultScalarSubQuery = queryFactory
        .select(JPAExpressions
                .select(userSub.score.avg())
                .from(userSub)
                .groupBy(userSub.type)
        )
        .from(user)
        .fetch();
```

### Projection

쿼리의 결과로 `Dto` 를 사용하지 않고 간단히 몇 가지 프로퍼티들만 조회하고 싶은 경우 아래와 같이 `Projection` 쿼리를 사용하면 된다. 이때 조회 결과가 `Tuple` 로 넘어오며 값을 꺼낼 때 `Q-type` 객체의 프로퍼티를 넘겨주면 된다.

```java
import static com.example.querydslexample.entity.QRoom.room;
import static com.example.querydslexample.entity.QUser.user;

/* with JPQL */
List<Object[]> resultJPQL = em.createQuery(
                "select r.roomName, u.username, u.age, u.score " +
                "from User u " +
                "left join u.room r"
        ).getResultList();

for (Object[] row : resultJPQL) {
    String roomName = (String) row[0];
    String username = (String) row[1];
    Integer age = (Integer) row[2];
    Integer score = (Integer) row[3];
}

/* with Querydsl */

List<Tuple> resultQuerydsl = queryFactory
        .select(room.roomName, user.username, user.age, user.score)
        .from(user)
        .leftJoin(user.room, room)
        .fetch();

for (Tuple tuple : resultQuerydsl) {
    String roomName = tuple.get(room.roomName);
    String username = tuple.get(user.username);
    Integer age = tuple.get(user.age);
    Integer score = tuple.get(user.score);
}
```

### Dto로 Projection 하기

자주 사용되는 특정 쿼리의 결과는 `Dto` 로 따로 분리하여 가져올 때가 많은데 이때는 다양한 방법으로 조회가 가능하다.

먼저 예제를 위한 `Dto` 클래스를 생성해 주었다.

* `UserDto.java`

```java
@Data
@NoArgsConstructor
public class UserDto {

    private String roomName;
    private String username;
    private Integer age;
    private Integer score;

    public UserDto(String roomName, String username, int age, int score) {
        this.roomName = roomName;
        this.username = username;
        this.age = age;
        this.score = score;
    }
}
```

* Dto 쿼리 예제

```java
import com.querydsl.core.Tuple;
import com.querydsl.core.types.Projections;
import static com.example.querydslexample.entity.QRoom.room;
import static com.example.querydslexample.entity.QUser.user;

/* with JPQL */
List<UserDto> resultJPQL = em.createQuery(
                        "select new com.example.querydslexample.dto.UserDto(r.roomName, u.username, u.age, u.score) " +
                        "from User u " +
                        "left join u.room r", UserDto.class
        ).getResultList();

/* with Querydsl */

// 1. setter 메소드를 이용한 방법
List<UserDto> resultBySetter = queryFactory
        .select(Projections.bean(UserDto.class,
                room.roomName, user.username, user.age, user.score))
        .from(user)
        .fetch();

// 2-(1). class fields 참조를 이용한 방법
List<UserDto> resultByFields = queryFactory
        .select(Projections.fields(UserDto.class,
                room.roomName, user.username, user.age, user.score))
        .from(user)
        .fetch();

// 2-(2). class field의 변수 명이 다른 경우
// ex) score(X) userScore(O)
List<UserDto> resultByFields2 = queryFactory
        .select(Projections.fields(UserDto.class,
                room.roomName, user.username, user.age, user.score.as("userScore"))
        )
        .from(user)
        .fetch();

// 2-(3). 스칼라 서브쿼리와 연계하여 사용
// ex) roomName(X) rName(O) & 대문자로 가져와야 하는 경우
List<UserDto> result = queryFactory
        .select(Projections.fields(UserDto.class,
                ExpressionUtils.as(JPAExpressions
                        .select(subUser.room.roomName.upper())
                        .from(subUser)
                        .where(subUser.username.eq(user.username)), "rName"),
                user.username, user.age, user.score
        ))
        .from(user)
        .fetch();

// 3. 생성자를 이용한 방법
List<UserDto> resultByConstructor = queryFactory
        .select(Projections.constructor(UserDto.class,
                room.roomName, user.username, user.age, user.score))
        .from(user)
        .fetch();
```

* `Dto Q-type` 클래스 생성하여 사용하기

또 다른 방법은 `Dto` 클래스에 `@QueryProjection` 어노테이션을 추가하여 `Dto` 전용 `Q-type` 객체를 생성하는 방법도 있다. 더욱더 간편하게 쿼리를 작성할 수는 있지만 `Dto` 클래스 내부에도 `Querydsl` 라이브러리 의존성이 생기기 때문에 확장성과 유지보수성에서 단점이 될 수도 있다.

가장 먼저 `Dto` 클래스의 생성자에 `@QueryProjection` 어노테이션을 추가해 주었다.

```java
import com.querydsl.core.annotations.QueryProjection;

@Data
@NoArgsConstructor
public class UserDto {

    private String roomName;
    private String username;
    private Integer age;
    private Integer score;

    @QueryProjection
    public UserDto(String roomName, String username, int age, int score) {
        this.roomName = roomName;
        this.username = username;
        this.age = age;
        this.score = score;
    }
}
```

그다음 기존 `Q-type` 클래스를 생성했던 것과 마찬가지로 `compileJava` task를 실행하면 자동으로 `Dto` 전용 `Q-type` 클래스가 생성된다.

* 자동으로 생성된 `QUserDto.java`

```java
package com.example.querydslexample.dto;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.ConstructorExpression;
import javax.annotation.processing.Generated;

/**
 * com.example.querydslexample.dto.QUserDto is a Querydsl Projection type for UserDto
 */
@Generated("com.querydsl.codegen.DefaultProjectionSerializer")
public class QUserDto extends ConstructorExpression<UserDto> {

    private static final long serialVersionUID = -1133442085L;

    public QUserDto(com.querydsl.core.types.Expression<String> roomName, com.querydsl.core.types.Expression<String> username, com.querydsl.core.types.Expression<Integer> age, com.querydsl.core.types.Expression<Integer> score) {
        super(UserDto.class, new Class<?>[]{String.class, String.class, int.class, int.class}, roomName, username, age, score);
    }

}
```

* `Q-type Dto` 클래스를 이용한 쿼리

생성된 `Q-type Dto` 클래스를 사용하여 다음과 같이 조회가 가능하다.

```java
List<UserDto> resultByProjectionAnnotation = queryFactory
        .select(new QUserDto(room.roomName, user.username, user.age, user.score))
        .from(user)
        .fetch();
```

### 동적 쿼리

`Querydsl` 를 통해서 동적 쿼리를 작성하는 방법은 다음과 같다.

`BooleanBuilder`를 이용하면 아래와 같이 동적 조건들을 추가할 수 있다.

* `BooleanBuilder`

```java
public List<User> dynamicQueryWithBooleanBuilder(
	String rName, String uName, Integer ageGoe, Integer ageLoe) {

	BooleanBuilder builder = new BooleanBuilder();

	if (rName != null) builder.and(room.roomName.eq(rName));
	if (uName != null) builder.and(user.username.eq(uName));
	if (ageGoe != null) builder.and(user.age.goe(ageGoe));
	if (ageLoe != null) builder.and(user.age.loe(ageLoe));

	return queryFactory
			.selectFrom(user)
			.where(builder)
			.fetch();
}
```

* `BooleanExpression`

또 다른 방법은 `BooleanExpression` 을 리턴하도록 메소드를 뽑아서 사용하는 것인데 이렇게 하면 생성한 조건 메소드들을 다른 쿼리에서도 재활용이 가능하다는 장점이 있다.

```java
public List<User> dynamicQueryWithBooleanExpressions(String rName, String uName, Integer ageGoe, Integer ageLoe) {
	JPAQueryFactory queryFactory = new JPAQueryFactory(em);

	return queryFactory
			.selectFrom(user)
			.where(roomNameEq(rName), usernameEq(uName), ageBetween(ageGoe, ageLoe))
			.fetch();
}

private BooleanExpression roomNameEq(String roomName) {
	return roomName != null ? room.roomName.eq(roomName) : null;
}

private BooleanExpression usernameEq(String username) {
	return username != null ? user.username.eq(username) : null;
}

private BooleanExpression ageBetween(Integer goe, Integer loe) {
	if (goe == null && loe == null) return null;
	if (goe != null && loe == null) return user.age.goe(goe);
	if (goe == null && loe != null) return user.age.loe(loe);
	return user.age.goe(goe).and(user.age.loe(loe));
}
```

### SQL 함수 사용하기

`concat`, `coalesce`, `upper` 와 같은 간단한 함수들은 `Querydsl` 에서 메소드로 지원하고 있다.

하지만 `Oracle`, `SQL Server` 에 문법 차이가 있는 것처럼 자신이 사용하고 싶은 함수가 `Querydsl` 에 없는 경우는 `stringTemplate()`을 이용하여 쿼리를 작성할 수 있다.

```java
import com.querydsl.core.types.dsl.Expressions;

// MariaDB102Dialect
List<String> result = queryFactory
		.select(Expressions.stringTemplate(
				"function('regexp_replace', {0}, {1}, {2})",
				user.username, "user", "User_"))
		.from(user)
		.fetch();
```

# DataJPA와 함께 사용하기

`DataJPA` 의 경우에도 `@Query` 를 통한 조회에 한계성이 있기 때문에.. 이러한 단점들을 `Querydsl` 과 연계하여 해결할 수 있다.

`DataJPA` 에 커스텀 쿼리 메소드를 작성할 수 있도록 커스텀 인터페이스를 만들어 직접 구현해 주면 된다.

## Custom 인터페이스

```java
/* UserRepository.java */
public interface UserRepository extends
        JpaRepository<User, Long>,
        UserRepositoryCustom // 커스텀 인터페이스도 함께 상속
{
	// 간단한 쿼리는 DataJPA로 작성 가능
    List<Member> findByUsername(String username);
}


/* UserRepositoryCustom.java */
public interface UserRepositoryCustom {
    List<UserDto> search(UserSearchCondition condition); // 동적 쿼리
    Page<UserDto> searchPage(UserSearchCondition condition, Pageable pageable); // 페이징 쿼리
}

/* UserSearchCondition.java */
@Data
public class UserSearchCondition {

    private String roomName;
    private String username;
    private Integer ageGoe;
    private Integer ageLoe;

}
```

위에서 예제로 설명한 `Querydsl` 의 다양한 쿼리들을 `DataJPA` 에 적용할 수 있게 되었다.

이때 주의할 점은 `DataJPA` 의 커스텀 클래스의 네이밍을 아래와 같이 맞추어줘야 인식이 가능하다는 점이다.

```java
// 반드시 'DataJPA 인터페이스 클래스 이름' + Impl 로 네이밍을 해야함!
public class UserRepositoryImpl implements UserRepositoryCustom {

	/* Querydsl을 이용하여 커스텀 쿼리 구현 */

}
```

그 다음부터는 스프링 컨테이너를 통해 주입받은 동일한 `DataJPA` 객체를 사용하여 `Querydsl` 의 커스텀 쿼리들을 사용할 수 있다.

# 마치며

`DataJPA` 를 사용하면서 메소드 네이밍으로는 구현할 수 없는 복잡한 쿼리들을 `JPQL` 없이도 모두 자바 코드로 사용할 수 있는 점이 매우 편리한 것 같다. 물론 `JPA` 의 기능을 그대로 이어받았기 때문에 인라인 뷰를 사용할 수 없거나 복잡한 그룹에 대해 제약사항이 있기는 하다. 하지만 이런 문제들은 `Querydsl` 의 문제라고 할 수는 없으며 복잡한 쿼리를 여러 개의 쿼리로 분리하여 사용하거나 네이티브 쿼리를 작성하는 대체 방법들을 사용하면 된다.

`Querydsl` 을 통해 메소드 체이닝으로 쿼리문을 하나하나 작성하다 보면 그동안 `JPQL` 의 문자열들을 다룰 때 얼마나 귀찮은 점이 많았는지를 생각하게 되며 자바로 쿼리문을 작성하는 진정한 재미를 느낄 수 있었다!

# References

* [Querydsl reference guide 한국어 번역 (v4.0.0)](https://querydsl.com/static/querydsl/4.0.1/reference/ko-KR/html_single/){:target="_blank"}
* [Querydsl reference guide latest version](https://querydsl.com/static/querydsl/latest/reference/html/){:target="_blank"}
* [Baeldung - A Guide to Querydsl with JPA](https://www.baeldung.com/querydsl-with-jpa-tutorial){:target="_blank"}
* [docs.spring.io - Querydsl Extension](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#core.extensions.querydsl){:target="_blank"}