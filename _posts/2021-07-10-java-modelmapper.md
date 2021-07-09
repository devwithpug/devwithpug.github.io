---
title: 'ModelMapper 제대로 알고 사용하자!'
categories: java
tags: ['java', 'modelmapper']
header:
    teaser: /assets/teasers/modelmapper.jpg
---

# 개요

자바로 프로젝트를 하다 보면 너무나 당연하게 `ModelMapper` 라이브러리를 사용하는 것 같다. 기본적으로 사용되는 매핑 메소드만 사용할 줄 알아도 __지능적인 오브젝트 매핑__ 을 제공하는 `ModelMapper` 를 손쉽게 사용할 수 있기 때문에 모두들 많이 사용하고 있는 것 같다.

그런데, 조금 복잡한 로직에서 희미한 연관관계를 갖는 클래스들의 매핑은 내가 생각한 대로 안될 때가 많았다..!

앞으로 유용하게 사용할 것 같고 한번 `ModelMapper` 를 사용한 이후로는 setter를 이용한 객체 초기화는 절대 하지 않으므로 이참에 `ModelMapper` 라이브러리에 대해 자세히 알아보고 정리해보았다.

# 사용 전 세팅

`ModelMapper` 라이브러리를 사용하기 전에 간단한 설정이 필요하다.

## 의존성 추가

* `build.gradle`
  
```gradle
implementation 'org.modelmapper:modelmapper:2.4.2'
```

maven, gradle 과 같은 프로젝트에서 의존성을 추가하여 간단히 라이브러리를 가져오자.

## 변환 클래스들 정의

다양한 매핑 예시를 위해 아래와 같은 임의 클래스들을 선언하였다.

```java
/* 모든 클래스 Constructor, Getter, Setter 생략 */

class Address {
    String street;
    String city;
}

class Name {
    String firstName;
    String lastName;
}

class Customer {
    Name name;
}

class OrderDto {
    String customerFirstName;
    String customerLastName;
    String billingStreet;
    String billingCity;
}
```

# ModelMapper 제대로 알기

## 간단한 예시

* `ModelMapper.map(Object source, Class<D> destinationType)` 

```java
Order order = new Order(
        new Customer(new Name("FIRSTNAME", "LASTNAME")),
        new Address("STREET", "CITY")
);

ModelMapper modelMapper = new ModelMapper();

OrderDto result = modelMapper.map(order, OrderDto.class);
```

* 실행 결과

![image](https://user-images.githubusercontent.com/69145799/125110388-75b58c00-e11f-11eb-99c2-fd3acd9c9ce5.png){:.align-center}

> ⬆ 각 클래스 프로퍼티들의 연관관계를 자동으로 판단하여 매핑이 되었다.

이처럼 `ModelMapper` 에서는 `map(source, destination)` 메소드가 호출되면 `source` 와 `destination` 의 타입을 분석하여 매칭 전략 및 기타 설정값에 따라 일치하는 속성을 결정하게 된다. 그런 다음 결정한 매칭 항목들에 대해 데이터를 매핑하는 것이다.

위처럼 `source` 와 `destination` 의 객체 타입이나 프로퍼티가 다른 경우에도 설정된 매칭 전략에 따라서 최선의 매핑 과정을 수행하게 된다.

하지만 위와 같이 암시적으로 일치하는 프로퍼티들의 연관관계가 존재하지 않거나 이러한 연관관계가 모호한 경우, 매핑이 원활히 이루어지지 않을 수도 있으며, 다양한 설정 방법들을 아래의 예를 통해 정리해보았다.

## Type Map

아래와 같은 객체 매핑이 필요할 때를 예로 들어보았다.

```java
/* 모든 클래스 Constructor, Getter, Setter 생략 */

public class Item {
    private String name;
    private Integer stock;
    private Integer price;
    private Double discount;
}
class Bill {
    private String itemName;
    private Integer qty;
    private Integer singlePrice;
    private Boolean sale;
}
```

```java
Item itemA = new Item("itemA", 10, 1500, true);
Bill bill = modelMapper.map(itemA, Bill.class);
```

첫 번째 예제보다 간단해 보이지만 `ModelMapper.map()` 의 결과는 아래와 같다.

![image](https://user-images.githubusercontent.com/69145799/125112264-e493e480-e121-11eb-89e5-b182a3e92f36.png){:.align-center}

> ⬆ ModelMapper 의 기본 매칭 전략으로는 모호한 연관 관계들은 매핑되지 않는다.

따라서 `ModelMapper` 에서는 위의 문제를 해결하기 위해 `Type Map` 기능을 제공한다.

### TypeMap<S, D>

`TypeMap` 인터페이스를 구현함으로써 매핑 설정을 캡슐화(Encapsulating) 하여 `ModelMapper` 객체의 매핑 관계를 설정해 줄 수 있다.

### 매핑 관계 추가

먼저 위의 예시에서 우리가 원하는 매핑 전략은 다음과 같다.

* Item.stock -> Bill.qty
* Item.price -> Bill.singlePrice
* Item.sale -> Bill.discount

`수량` 과 `가격` 의 경우 아래와 같이 메서드 레퍼런스를 통해 간단히 설정이 가능하다.

```java
modelMapper.typeMap(Item.class, Bill.class).addMappings(mapper -> {
        mapper.map(Item::getStock, Bill::setQty);
        mapper.map(Item::getPrice, Bill::setSinglePrice);
    });

Bill bill2 = modelMapper.map(itemA, Bill.class);
```

* 실행 결과

![image](https://user-images.githubusercontent.com/69145799/125113335-80722000-e123-11eb-81bb-556dd48b8ec1.png)

> ⬆ 임의로 커스터마이징한 매핑 관계가 정상적으로 적용되었다.

__하지만__ `Item.sale`, `Bill.discount` __와 같이 클래스 타입이 다른 경우 추가적인 방법이 필요하다!!__

### 파라미터 타입 변환

매핑하려는 데이터의 `source` 와 `destination` 타입이 다른 경우, `Converter` 인터페이스를 사용하여 유연하게 값을 설정해 줄 수 있다.

위와 같은 예제에서 `Item.sale == true` 인 경우 할인율을 `20.0` 으로 설정해 준다고 가정해보자.

`mapper.using(Converter<S, D>)` 와 같은 패턴을 이용하면 유연한 타입 변환이 가능하다. `using` 은 말 그대로 다음과 같은 Converter 규칙을 사용하겠다는 것이다.

```java
modelMapper.typeMap(Item.class, Bill.class).addMappings(mapper -> {
        mapper.map(Item::getStock, Bill::setQty);
        mapper.map(Item::getPrice, Bill::setSinglePrice);
        mapper.using((Converter<Boolean, Double>) context -> context.getSource() ? 20.0 : 0.0)
                .map(Item::isSale, Bill::setDiscount);
    });

Bill bill2 = modelMapper.map(request, Bill.class);
```

* 실행 결과

![image](https://user-images.githubusercontent.com/69145799/125114496-017de700-e125-11eb-8b4e-edc12da508d1.png){:.align-center}

> ⬆ Converter를 통해 정상적으로 타입이 변환 되었다.

### 매핑 skip 하기

위와는 별개로 클래스의 특정 프로퍼티는 매핑이 이루어지지 않도록 설정하는 것도 가능하다.

```java
modelMapper.typeMap(Item.class, Bill.class).addMappings(mapper -> {
        mapper.map(Item::getStock, Bill::setQty);
        mapper.map(Item::getPrice, Bill::setSinglePrice);
        mapper.using((Converter<Boolean, Double>) context -> context.getSource() ? 20.0 : 0.0)
                .map(Item::isSale, Bill::setDiscount);
        mapper.skip(Bill::setItemName); // skip 추가
    });
Bill bill2 = modelMapper.map(itemA, Bill.class);
```

* 실행 결과

![image](https://user-images.githubusercontent.com/69145799/125116653-02fcde80-e128-11eb-84d8-236fe716f626.png){:.align-center}

> ⬆ Bill.itemName 값의 매핑이 임의로 스킵 되었다.

### null인 속성 값만 매핑 skip 하기

객체에 새로운 값들을 한번에 업데이트해줄 때, `ModelMapper` 의 기본 매칭 전략을 사용하면 null 값까지 함께 업데이트가 되는 문제가 생기므로 이를 위해서 매핑 설정을 해줄 수 있다.

```java
ModelMapper modelMapper = new ModelMapper();
modelMapper.getConfiguration().setSkipNullEnabled(true);
```

## Validation

`ModelMapper` 는 기본적으로 매칭 전략에 맞지 않는 속성들은 null 값으로 초기화하게 되는데 개발자의 입장에서는 어떤 객체에 대해 모든 속성값들이 정상적으로 매핑되었는지 검증이 필요할 때가 있다.

이때는 `ModelMapper().validate()` 를 이용하여 매핑 검증이 실패하는 경우 예외 처리를 해주기 때문에 추가적인 예외 핸들링이 가능하다.

```java
modelMapper = new ModelMapper();
Bill bill3 = modelMapper.map(itemA, Bill.class);
try {
    modelMapper.validate();
} catch (ValidationException e) {
    /* Exception Handling */
}
```

## Strategies

앞에서 설정한 여러 가지 조건들에 의해 `ModelMapper` 는 지능적인 오브젝트 매핑을 수행한다. 

하지만 객체들의 매칭 전략을 하나하나씩 임의로 설정해 주어야 한다면 편의성을 위해서 `ModelMapper` 라이브러리를 사용하는 것이 아니게 되므로.. 특정 매칭 전략을 입력해 주지 않고도 다른 매칭 전략을 사용할 수 있게끔 추가적인 매칭 전략을 제공한다.

```java
modelMapper.getConfiguration().setMatchingStrategy(MatchingStrategies.STANDARD) // STANDARD 전략
modelMapper.getConfiguration().setMatchingStrategy(MatchingStrategies.LOOSE) // LOOSE 전략
modelMapper.getConfiguration().setMatchingStrategy(MatchingStrategies.STRICT) // STRICT 전략
```

`STANDARD`, `LOOSE`, `STRICT` 전략이 있으며 `ModelMapper` 공식 문서에서는 다음과 같이 설명하고 있다.

### STANDARD

기본 매칭 전략으로서 `STANDARD` 전략을 사용하면 `source`와 `destination` 의 속성들을 지능적으로 매치시킬 수 있다.

* 토큰은 어떤 순서로든 일치될 수 있다.
* 모든 `destination` 속성 이름 토큰이 일치해야 한다.
* 모든 `source` 속성 이름은 일치하는 토큰이 하나 이상 있어야 한다.

위 조건들을 충족하지 못하는 경우 매칭에 실패하게 된다. (null)

### LOOSE

느슨한 매칭 전략으로서 `LOOSE` 전략을 사용하면 계층 구조의 마지막 `destination` 속성만 일치하도록 요구하여 `source`와 `destination` 을 느슨하게 매치시킬 수 있다.

* 토큰은 어떤 순서로든 일치될 수 있다.
* 마지막 `destination` 속성 이름에는 모든 토큰이 일치해야 한다.
* 마지막 `source` 속성 이름은 일치하는 토큰이 하나 이상 있어야 한다.

느슨한 일치 전략은 속성 계층 구조가 매우 다른 `source`, `destination` 객체에 사용하는 데에 이상적이다.

ex) 맨 앞에서 설명한 `Order`, `OrderDto` 와 같이 객체의 속성이 계층 구조를 가지는 경우!

### STRICT

엄격한 일치 전략으로서 `STRICT` 전략을 사용하면 `source` 속성을 `destination` 속성과 엄격하게 일치시킬 수 있다. 따라서 불일치나 모호성이 발생하지 않도록 완벽한 일치 정확도를 얻을 수 있다. 하지만 `source` 와 `destination` 의 속성 이름들이 서로 __정확하게__ 일치해야 한다.

* 토큰들은 엄격한 순서로 일치해야 한다.
* 모든 `destination` 속성 이름 토큰이 일치해야 한다.
* 모든 `source` 속성 이름에는 모든 토큰이 일치해야 한다.

`STRICT` 전략을 통해 앞에서 다룬 `TypeMap` 을 사용하지 않고도 모호함이나 예기치 않은 매핑이 발생하지 않도록 하는 경우에 간편하게 사용이 가능하다. 하지만 반드시 매칭되어야 하는 속성의 이름들이 서로 정확하게 일치해야 한다.

# References

* [modelmapper.org - User Manual](http://modelmapper.org/user-manual/){:target="_blank"}
  
* [stackoverflow - how calculate a value from source and set it to destination](https://stackoverflow.com/questions/59610414/modelmapper-how-calculate-a-value-from-source-and-set-it-to-destination){:target="_blank"}

