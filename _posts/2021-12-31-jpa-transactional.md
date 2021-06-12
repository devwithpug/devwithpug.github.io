---
title: 'JPA 이슈 정리'
categories: spring
tags: ['spring', 'jpa', 'java']
---

# Issue 들

### DataJPA는 Create, Update를 `save`로 구현한다.

기존 JPA에서는 Create를 수행할 때 `persist()`, Update를 수행할 때 `merge()`를 호출하여 인스턴스의 영속성 관리를 해주었다. DataJPA를 사용할 때는 조금 다른데, 먼저 생성할 Repository에 대한 인터페이스를 생성하고 `JpaRepository`와 같이 DataJPA에서 제공하는 인터페이스를 상속받는다.

```java
import org.springframework.data.jpa.repository.JpaRepository;

@Repository // 생략 가능
public interface MyRepository extends JpaRepository<MyEntity, Integer> {
}
```

그 다음 생성한 Repository를 DI(dependency injection) 해준뒤 사용하는데 이 때 Create, Update 모두 `save()` 메소드를 통해 수행한다. 나는 `save()` 메소드의 구조가 궁금해서 `JpaRepository` 인터페이스의 구현체인 `SimpleJpaRepository` 클래스를 확인해보았다.

![image](https://user-images.githubusercontent.com/69145799/119931587-9a650280-bfbc-11eb-8efd-b667742b4ca4.png)

`save()` 메소드는 DataJPA만의 특이한 점이 있는건 아니었다.

* entity가 새롭게 생성된 경우(Create) `em.persist()`

* 기존의 entity를 수정하는 경우(Update) `em.merge()`

이처럼 두가지 메소드를 `save()`로 묶어서 처리하는 것을 확인할 수 있었다. 더 궁금해서 찾아본 결과 stackoverflow에서 관련 내용을 찾아볼 수 있었다.

> 영속성 API 설계에는 두가지 주요 접근 방식이 있다.
> * __insert/update approach__ `insert` 또는 `update` 메소드를 호출하여 오브젝트를 DB에 입력,수정
> * __Unit of Work approach__ 영속성 라이브러리에 객체들을 추가한 후 작업이 종료 시(트랜잭션이 종료 시) DB에 자동으로 `flush` 하는 접근 방식. 이 때 영속성 라이브러리를 통해 관리되는 객체는 기본 키로 식별된다.
> 
> JPA는 두번째 접근 방식을 따른다. DataJPA의 `save()`는 일반적인 JPA의 `merge()` 방식을 사용하므로 위의 접근 방식처럼 엔티티의 영속성을 관리하게 된다. 따라서 오브젝트를 `save()` 하는 것은 오브젝트의 미리 정의된 `id` 값의 여부에 따라 insert 또는 update를 의미하며 `save()`를 `create()`라고 부르지 않는 이유를 설명한다.
> 
> 출처: [https://stackoverflow.com/a/11881628](https://stackoverflow.com/a/11881628){:target="_blank"}




### DataJPA는 datasource 관련 properties를 명시하지 않으면 자동으로 메모리 DB를 구성해준다

![image](https://user-images.githubusercontent.com/69145799/119930562-a5b72e80-bfba-11eb-86b6-9aafeff230b8.png)

Datasource 설정을 하지 않고 서버를 실행하면 메모리 DB가 생성되어 자동으로 Hibernate를 통해 테이블에 drop(기존 테이블 삭제), create(테이블 생성), alter(제약조건 등록) 해주는 것을 확인할 수 있다. 간단한 디버그를 위해서도 아무런 설정없이 간단하게 DB를 사용할 수 있다.

### 다대일 관계 매핑에서 JoinColumn을 안해주면 알아서 컬럼을 생성해주지만 생성 전략이 아래와 같다.

- JoinColumn 안하면 (FK테이블)_(FK테이블의 PK)의 생성 전략을 가진다.

- ex) Item : Store(PK: store_id) 다대일 관계시 store_store_id (코드로 예시들기)

```java

@Entity
public class Item {
    @ID @GeneratedValue
    @Column(name = "item_id")
    
    @ManyToOne
    // @JoinColumn 생략
    private Store store;

}
@Entity
public class Store {
    ... 생략 ...
    @ID @GeneratedValue
    @Column(name = "store_id")

    @OneToMany(mappedBy = "store")
    private List<Item> items;
}
```

* 실제 데이터베이스에 DDL 결과

![image](https://user-images.githubusercontent.com/69145799/119935095-e49cb280-bfc1-11eb-9d37-e3296d7edb86.png)

### 양방향 매핑 JSON 무한 재귀 문제

REST API를 설계하다보면 양방향 매핑 관계를 가지는 엔티티를 호출할 때 무한 재귀가 발생한다. 아래와 같이 one-to-many 관계를 가지는 간단한 두 엔티티가 있다고 가정하자.

```java
@Entity
public class User {
    public int id;
    public String name;
    public List<Item> userItems;
}

@Entity
public class Item {
    public int id;
    public String itemName;
    public User owner;
}
```

만약 `@RestController` 에서 해당 객체를 리턴하게 되면 문제가  발생한다! JSON은 간단히 Tree 형식의 연속적인(serial) 데이터라고 생각할 수있는데, `User` <-> `Item` 엔티티들은 양방향으로 참조가 가능하므로 엔티티를 JSON 데이터로 직렬화(Serialization)할 때 무한 재귀 문제가 발생하는 것이다.

* __[Jackson – Bidirectional Relationships](https://www.baeldung.com/jackson-bidirectional-relationships-and-infinite-recursion){:target="_blank"}__

링크를 참조하면 이를 방지할 수 있는 여러가지 방법이 있다.

간단하게 적용해볼 수있는 방법들은 다음과 같다.

1. DTO 클래스 만들어서 사용하기

```java
public class ItemDTO {
    private int id;
    private String itemName;
    private int owner_id;

    /* 생성자, getter, setter */
}
```

대부분의 프로젝트에서 DTO 클래스를 구현하면 제약조건에 구애받지 않을 수 있기 때문에 조금더 유연하게 설계가 가능한 장점이 있다.

2. @JsonManagedReference, @JsonBackReference

```java
@Entity
public class User {
    public int id;
    public String name;

    @JsonManagedReference
    public List<Item> userItems;
}

@Entity
public class Item {
    public int id;
    public String itemName;

    @JsonBackReference
    public User owner;
}
```

* 결과

```json
// User의 경우
{
 "id":1,
 "name":"user1",
 "userItems":[{
   "id":2,
   "itemName":"item1"}]
}

// Item의 경우
{
 "id":2,
 "itemName":"item1"
}
```


* `@JsonManagedReference`: 정상적으로 직렬화가 수행된다.
* `@JsonBackReference`: 직렬화에서 생략된다.

3. @JsonIgnore

```java
@Entity
public class User {
    public int id;
    public String name;

    @JsonIgnore
    public List<Item> userItems;
}
```

* 결과

```json
{
 "id":2,
 "itemName":"item1",
 "owner":
    {
        "id":1,
        "name":"user1"
    }
}
```

### @Query 사용 후기 (left join 쉽지않다!)

### More than one row... // 일대일 관계인데 FK 두개이상 연결된 경우

### 다대다 관계 경험 적기, hibernate가 자동으로 다 해준다고!!(datajpa 일수도?)