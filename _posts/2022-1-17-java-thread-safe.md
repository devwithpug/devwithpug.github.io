---
title: '자바에서 동시성 문제를 해결하는 3가지 키워드'
categories: java
tags: ['java', 'synchronization']
header:
    teaser: /assets/teasers/java.jpg
---

# 개요

자바로 코드를 작성하다 보면 동시성 문제에 대해 한 번쯤은 생각을 해보게 된다.   
하지만 간단하게 해결할 수 있는 문제가 아니다.. (어렵다😂)

내가 생각하는 스레드와 동시성 관리가 어렵다고 느껴지는 이유는 다음과 같다. 

1. __코드만 보고 동시성 문제의 발생 가능성을 파악하기 쉽지 않다.__
2. 일반적으로 동시성으로 인해 생기는 예외는 __재현하기 어렵다.__
3. 최악의 경우, __동시성 문제가 발생해도 진짜 결함으로 간주되지 않고 일회성 문제로 여겨 무시될 수 있다.__

코드를 작성할 때 대부분 스레드를 크게 신경쓰지는 않지만, 동시성 문제로 인한 결함이 치명적인 결과로 이어질 수 있기 때문에 동시성에 대해 자세히 아는 것이 중요하다. 따라서 관련 키워드를 정리해보았다.

## 간단한 동시성 문제 테스트

```java
private static long count = 0;

@Test
void threadNotSafe() throws Exception {
    int maxCnt = 10;

    for (int i = 0; i < maxCnt; i++) {
        new Thread(() -> {
            count++;
            System.out.println(count);
        }).start();
    }

    Thread.sleep(100); // 모든 스레드가 종료될 때까지 잠깐 대기
    Assertions.assertThat(count).isEqualTo(maxCnt);
}
```

간단한 코드로 테스트를 해보았다. 다수의 스레드들은 공유자원 `static long count` 을 참조하여 값을 증가시킨다.
위 테스트 케이스는 대부분의 경우 아무런 문제 없이 통과한다.
하지만 값을 증가하는 `count++` 연산이 __원자성을 보장하지 않기 때문에__ 아래와 같이 테스트에 실패하는 경우가 생길 수 있다.

![image](https://user-images.githubusercontent.com/69145799/149611483-5dd5455c-376f-4b14-97a8-0ce6593083ce.png){:.align-center}

> ⬆ 테스트 실패 결과 // 1이 두 번 출력 되었다. (0 -> 1 증가 연산에서 동시성 문제가 발생했다)

# 동시성 문제 해결 방법

## 1. synchronized

`synchronized` 키워드를 통해 해당 블럭의 액세스를 동기화할 수 있다.   
간단히 말해서 `synchronized` 가 선언된 블럭에는 동시에 하나의 스레드만 접근할 수 있다.

* 간단한 사용 예제

```java
public class SomeClass {
    // 메서드 전체에 동기화 적용
    public synchronized void foo() { 
        /* critical section */
    }

    // 내부에 동기화 블럭 생성
    public void bar() {
        synchronized (this) {
            /* critical section */
        }
    }
}

// 클래스 내부의 전역 메서드에서 동기화 블럭을 생성하는 방법
public class SomeClass {
    public static void syncMethod() {
        synchronized (SomeClass.class) {
            /* critical section */
        }
    }
}
```

다음은 앞에서 동시성 문제로 인해 실패한 테스트 케이스에 `synchronized` 키워드를 사용해 보았다.

```java
private static long count = 0;

@Test
void threadNotSafe() throws Exception {
    int maxCnt = 10;

    for (int i = 0; i < maxCnt; i++) {
        new Thread(this::plus).start();
    }

    Thread.sleep(100); // 모든 스레드가 종료될 때까지 잠깐 대기
    Assertions.assertThat(count).isEqualTo(maxCnt);
}

public synchronized void plus() { // synchronized 키워드 사용
    count++;
}
```

`synchronized` 를 추가함으로써 위 테스트는 100% 통과할 수 있다.

특정 스레드는 `synchronized` 메서드에 접근 시 블록 전체에 lock을 건다. 
따라서 해당 스레드가 블럭을 빠져나가기 전까지 다른 스레드들은 동기화 처리된 블록에 접근할 수 없다.
하지만, 다른 스레드들은 아무런 작업을 하지 못하고 기다릴 수밖에 없어 자원의 낭비가 발생할 수 있다.

`synchronized` 로 선언된 블록 내부에 복잡한 로직이 들어간다고 생각해 보자. 스레드의 개수가 많으면 많을수록 실행 시간에 엄청난 지연이 생길 것이다. 이를 확인해 보기 위해 간단한 테스트를 해보았다.

### 딜레이 테스트 (1)

가장 먼저 `synchronized` 키워드를 사용하지 않은 경우를 테스트해보았다.

```java
private static long count = 0;

@Test
void threadNotSafe() throws Exception {
    int maxCnt = 1000;

    for (int i = 0; i < maxCnt; i++) {
        new Thread(this::plus).start();
    }

    Thread.sleep(1000); // 1000ms 후에 테스트 종료(결과 값을 확인)
    Assertions.assertThat(count).isEqualTo(maxCnt);
}

public void plus() { // synchronized 를 사용하지 않은 경우 (동시성 제어를 하지 않는 경우)
    count++;
    try {
        Thread.sleep(1); // 추가적인 딜레이(복잡한 로직이 추가된다고 가정)
    } catch (InterruptedException e) {
    }
}
```

`plus()` 함수 내부에 추가적인 딜레이를 발생시켜 보았다. 테스트는 대부분의 경우 통과하지만 `synchronized` 키워드를 사용하지 않는 이상, 처음 테스트와 동일하게 동시성 문제가 발생할 수 있다.
하지만 `Thread.sleep(1)` 딜레이는 큰 영향을 주지 않는다. (각각의 스레드는 독립적으로 실행되며 critical section에 아무런 제약 없이 접근하기 때문)

### 딜레이 테스트 (2)

그렇다면, `synchronized` 키워드를 추가하면 어떨까?

```java
public synchronized void plus() { ... } // synchronized 사용 (해당 블록에 동시에 하나의 스레드만 접근 가능)
```

![image](https://user-images.githubusercontent.com/69145799/149612719-0884a4c3-5a61-4fbf-aea3-a925f98c3bf3.png){:.align-center}

> ⬆ synchronized 사용 테스트 결과

결과가 상당히 흥미로운데, 목표 값인 1000에 턱없이 부족한 결과가 나온 이유는 간단하다.

1. 1000개의 스레드를 생성했다.
2. count를 증가하는 `plus()` 메서드는 동시에 하나의 스레드만 접근 가능하다.
3. 특정 스레드가 `count++` 연산을 끝낸 후 1ms 동안 딜레이를 가지고 나서야 메서드를 빠져나오고 lock을 해제한다.
4. __테스트는 1000ms 후에 종료되므로 1000개의 모든 스레드가 `plus()` 메서드를 실행하기에는 시간이 부족하다.__
5. 비록 시간이 모자라 테스트는 실패했지만, __동시성 제어가 확실히 되고 있다는 점__ 을 확인할 수 있었다.

따라서, 동시성 문제를 해결하기 위해 `synchronized` 키워드는 매우 간단한 해결방법이 될 수 있지만, critical section의 크기및 실행시간에 따라 성능하락 및 자원낭비가 매우 심해지게 된다.

[Uncle Bob(로버트 C. 마틴)의 클린 코드](http://www.yes24.com/Product/Goods/11681152){:target="_blank"} 책에서도 동시성에 대해 다룬 부분이 있는데, 내용은 다음과 같다.

- __공유 자료를 최대한 줄여라.__
- __동기화하는 부분을 최대한 작게 만들어라.__
- __프로세서 수보다 많은 스레드를 돌려보라.__
- __코드에 보조 코드를 넣어 돌려라. 강제로 실패를 일으키게 해보라.__

## 2. volatile

`volatile` 키워드에 대한 [자세한 설명은 다른 블로그를 참고하기 바랍니다.](https://nesoy.github.io/articles/2018-06/Java-volatile){:target="_blank"}

`volatile` 에 대해 간단하게 정리해 보면..

JVM에서 스레드는 실행되고 있는 CPU 메모리 영역에 데이터를 캐싱 한다. (CPU Cache)
따라서 멀티 코어 프로세서에서 다수의 스레드가 변수 a를 공유하더라도 캐싱 된 시점에 따라 데이터가 다를 수 있으며,
서로 다른 코어의 스레드는 데이터 값이 불일치하는 문제가 생긴다.

임의로 데이터를 갱신해 주지 않는 이상 __캐싱 된 데이터가 언제 갱신되는지 또한 정확히 알 수 없다.__

이런 경우 `volatile` 키워드를 사용하여 CPU 메모리 영역에 캐싱 된 값이 아니라 __항상 최신의 값을 가지도록 메인 메모리 영역에서 값을 참조하도록 할 수 있다.__
-> 즉, 동일 시점에 모든 스레드가 동일한 값을 가지도록 동기화한다.

변수 앞에 키워드를 붙여서 선언이 가능하다.

```java
public volatile long count = 0;
```

하지만 `volatile` 을 통해 모든 동기화 문제가 해결되는 건 아니다.

앞에서 예로 들었던 `++` 연산과 같이 원자성이 보장되지 않는 경우 동시성 문제는 동일하게 발생한다.
(단지 멀티 코어에서의 모든 스레드가 캐시 없이 최신의 값을 보게 할 뿐이다!)

```java
private static volatile long count = 0; // volatile 키워드 추가

@Test
void threadNotSafe() throws Exception {
    int maxCnt = 1000;

    for (int i = 0; i < maxCnt; i++) {
        new Thread(() -> count++).start();
    }

    Thread.sleep(100); // 모든 스레드가 종료될때 까지 잠깐 대기
    Assertions.assertThat(count).isEqualTo(maxCnt);
}
```

![image](https://user-images.githubusercontent.com/69145799/149614756-7055cbfb-b48a-4dd3-a757-9815effc4af5.png){:.align-center}

> ⬆ 인텔리제이는 친절하게도 volatile 필드에 비 원자적 연산이 있다는 경고를 해준다 ㅎㅎ

![image](https://user-images.githubusercontent.com/69145799/149614599-42e40249-c115-4bb4-ba6b-14066fd364bc.png){:.align-center}

> ⬆ 동시성 문제로 인해 실패한 케이스 (volatile 키워드도 원자성을 보장하지 않는 연산에서는 동일한 동시성 문제가 발생한다.)

따라서, `volatile` 의 특징은 다음과 같다.

1. mutual exclusion(상호 배제)를 제공하지 않고도 데이터 변경의 가시성을 보장한다.
2. 원자적 연산에서만 동기화를 보장한다.

## 3. Atomic 클래스

앞에서 설명한 두 가지 키워드 `synchronized`, `volatile` 만으로는 동시성 문제를 깔끔하게 해결할 수 없다.

자바에서는 위 문제들을 해결하기 위해, 비-원자적 연산에서도 동기화를 빠르고 쉽게 이용하기 위한 클래스 모음을 제공한다.

`java.util.concurrent.*` (대표적으로 컬렉션, Wrapper 클래스 등이 있다.)

* `java.util.concurrent.atomic.AtomicLong`

```java
public class AtomicLong extends Number implements java.io.Serializable {
	
    private volatile long value; // volatile 키워드가 적용되어 있다.
	
    public final long incrementAndGet() { // value 값을 실제로 증가시키는 메서드
        return U.getAndAddLong(this, VALUE, 1L) + 1L;
    }
	
}
```

* `jdk.internal.misc.Unsafe`

```java
public final class Unsafe {
    // 메모리에 저장된 값과 CPU에 캐시된 값을 비교해 동일한 경우에만 update 수행
    public final long getAndAddLong(Object o, long offset, long delta) {
        long v;
        do {
            v = getLongVolatile(o, offset);
        } while (!weakCompareAndSetLong(o, offset, v, v + delta)); // CAS 알고리즘 (JNI 코드로 이루어져 있다.)
        return v;
    }
}
```

Non-Blocking 임에도 동시성을 보장하는 이유는 `CAS(Compare-and-swap)` 알고리즘을 이용하기 때문이다.

- `volatile` 키워드를 이용하면서 현재 스레드에 저장된 값과 메인 메모리에 저장된 값을 비교한다.
   - 일치하는 경우 새로운 값으로 교체(thread-safe 한 상태이므로 로직 수행)
   - 일치하지 않는 경우 실패 후 재시도(thread-safe 하지 않은 상태였으므로 재시도)

### 성능 비교 테스트

Blocking vs Non-Blocking 에 대해 속도 비교를 간단히 해보았다.

* Blocking (synchronized)

```java
private static long startTime = System.currentTimeMillis();
private static int maxCnt = 1000;
private static long count = 0;

@Test
void threadNotSafe() throws Exception {
    for (int i = 0; i < maxCnt; i++) {
        new Thread(this::plus).start();
    }

    Thread.sleep(2000); // 모든 스레드가 종료될때 까지 잠깐 대기
    Assertions.assertThat(count).isEqualTo(maxCnt);
}

public synchronized void plus() {
    if (++count == maxCnt) {
        System.out.println(System.currentTimeMillis() - startTime);
    }
    try {
        Thread.sleep(1);
    } catch (InterruptedException e) {
    }
}
```

![image](https://user-images.githubusercontent.com/69145799/149615263-d1c059a2-467d-4ee1-a152-eae70a12356c.png){:.align-center}

> 평균 1300ms 정도 소요되었다. (Blocking 연산에서 1000개의 스레드가 각각 1ms의 추가 딜레이를 가지기 때문)


* Non-Blocking (AtomicLong)

```java
private static long startTime = System.currentTimeMillis();
private static int maxCnt = 1000;
private static AtomicLong count2 = new AtomicLong();

@Test
void threadNotSafe2() throws Exception {
    for (int i = 0; i < maxCnt; i++) {
        new Thread(this::plus2).start();
    }

    Thread.sleep(2000); // 모든 스레드가 종료될때 까지 잠깐 대기
    Assertions.assertThat(count2.get()).isEqualTo(maxCnt);
}

public void plus2() {
    if (count2.incrementAndGet() == maxCnt) {
        System.out.println(System.currentTimeMillis() - startTime);
    }
    try {
        Thread.sleep(1);
    } catch (InterruptedException e) {
    }
}
```

![image](https://user-images.githubusercontent.com/69145799/149615309-0dc44641-89f1-40da-a868-21ccca99fb53.png){:.align-center}

> 평균 140ms 정도 소요되었다. (Non-Blocking 연산에서 1ms의 추가 딜레이는 큰 의미가 없다.)

당연한 결과이지만, `synchronized` 키워드는 효과적인 성능과 함께 사용하기에는 큰 어려움이 있다.

# 마무리

테스트에서는 임의로 딜레이를 1ms로 주었기 때문에 결과가 드라마틱 하게 차이 난다고 말할 수도 있다.

```java
public void plus() {
    synchronized (this) {
        if (++count == maxCnt) {
            System.out.println(System.currentTimeMillis() - startTime);
        }
    }
    try {
        Thread.sleep(1);
    } catch (InterruptedException e) {
    }
}
```

위와 같이 `plus()` 메서드에서 동기화가 필요한 부분만 `synchronized` 블록으로 감싸주면 성능하락이 생기지 않는다.

하지만, 실제 프로그래밍에서 위 테스트 코드와 같이 동시성 문제가 예상되는 곳들을 모두 파악해서 `synchronzied` 를 통해 동기화 설정을 할 수 있을까?

복잡한 비즈니스 로직 사이사이에 들어가 있는 비-원자적 연산을 여러개의 `synchronized` 블록으로 설정하는건 가능하겠지만 코드가 복잡해질 것이고, 개발자가 모든 코드에 동시성 문제를 하나하나 검토해야만 완벽하게 적용할 수 있을 것이다.

따라서 기본으로 제공하는 concurrent 패키지의 클래스들을 이용하는 것이 자바에서 동시성 문제를 해결하는 적절한 방법이라고 생각한다.

> __모든 코드는 실제 작성하였으며, 직접 실행한 결과들을 글에 담았습니다.__   
> __내용에 오류가 있을 수 있습니다. 관련 코멘트를 주시면 감사히 받겠습니다.__   
> __모든 의견은 언제나 환영합니다 😊__

# References

* [Atomic Type vs Synchronized](https://n1tjrgns.tistory.com/244){:target="_blank"}
* [자바 고유락과 Synchronization](https://brunch.co.kr/@kd4/156){:target="_blank"}
* [Java volatile이란?](https://nesoy.github.io/articles/2018-06/Java-volatile){:target="_blank"}
* [Oracle Docs - AtomicLong](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/atomic/AtomicLong.html){:target="_blank"}
* [Compare-and-swap](https://en.wikipedia.org/wiki/Compare-and-swap){:target="_blank"}