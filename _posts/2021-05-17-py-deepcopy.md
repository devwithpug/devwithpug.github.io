---
title: '파이썬의 얕은 복사(shallow copy), 깊은 복사(deep copy)'
categories: python
tags: ['python', 'deepcopy']
header:
    teaser: /assets/teasers/python.jpg
---

# 개요

탐색 알고리즘 문제를 풀다보면 리스트에 대한 참조를 많이 하게 된다. DFS 알고리즘을 예로 들면 parent node에서 leaf node까지 탐색을 한 후에 recursion을 통해 이전 노드로 되돌아가게 된다. 

이 때 이전 탐색의 결과가 현재 탐색에 영향을 주면 안되기 때문에 기존에 사용하던 리스트 슬라이싱을 이용하여 복사를 했었다.

그런데 2차원 리스트를 복사하는 경우에 문제가 생겨서 크게 당황했었다.

```python
original = [[1, 2], [3, 4], [5]]
new = original[:] # 리스트 슬라이싱을 이용한 복사

new[2].append(6)

# original  [[1, 2], [3, 4], [5, 6]]
# new       [[1, 2], [3, 4], [5, 6]]
```

위와 같은 예로 2차원 리스트에서는 복사의 결과가 내 예상과 맞지 않았다.

그 이유는 mutable 객체인 리스트가 복사 되었지만 리스트 내부의 객체들은 복사되지 않았기 때문이다.(얕은 복사)

## mutable, immutable 객체

| 클래스     | 구분      |
| :--------- | :-------- |
| list       | mutable   |
| set        | mutable   |
| dict       | mutable   |
| bool       | immutable |
| int, float | immutable |
| tuple      | immutable |
| str        | immutable |

# 얕은 복사 / shallow copy

방법은 크게 3가지가 있다.

1. 반복문을 통해 새로운 mutable 객체에 값 대입

```python
original = [1, 2, 3, 4, 5]
new = []
for item in original:
    new.append(item)
# new   [1, 2, 3, 4, 5]
```

2. 리스트 슬라이싱을 이용한 복사

```python
original = [1, 2, 3, 4, 5]
new = original[:]
# new   [1, 2, 3, 4, 5]
```

3. copy 라이브러리 이용

```python
import copy

original = [1, 2, 3, 4, 5]
new = copy.copy(original)
# new   [1, 2, 3, 4, 5]
```

## immutable in mutable

immutable 객체들을 담고있는 mutable 객체에 얕은 복사를 사용했을 때는 아무런 문제가 없다. 그 이유는 새롭게 대입된 immutable 객체는 기존의 immutable 객체와 같은 주소를 가지지만 immutable 객체의 수정이 불가능한 특성 때문이다.

```python
original = [1, 2, 3, 4, 5] # immutable 객체 int를 담고있는 mutable 객체
new = original[:]
new[0] = 10
# original  [1, 2, 3, 4, 5]
# new       [10, 2, 3, 4, 5]
```

## mutable in mutable

하지만 얕은복사는 mutable 객체가 담고있는 내부의 객체들은 복사하지 않기 때문에 mutable in mutable의 경우 완전한 복사가 이루어지지 않는다.

```python
original = [[1, 2], [3, 4], [5]] # 2차원 리스트(mutable in mutable)
new = original[:]

# 최상위 mutable 객체는 복사 O
# id(original)      2346170478336
# id(new)           2346170478272
#
# 내부의 mutable 객체는 복사 X
# id(original[0])   2346170477824
# id(new[0])        2346170477824
```

# 깊은 복사 / deep copy

## 깊은 복사 직접 구현

recursion을 이용하여 깊은 복사 함수를 아래와 같이 만들어보았다. 이를 응용하여 `set`, `dict`에 대한 깊은 복사도 구현 가능하다.

```python
def my_deepcopy(mutable):
    # mutable 객체인 경우 해당 값 return
    if not type(mutable) in (list, set, dict):
        return mutable
    # list인 경우
    if type(mutable) is list:
        new = [] # 깊은 복사를 위한 새로운 mutable 객체 생성
        for item in mutable:
            new.append(my_deepcopy(item)) # recursion
    elif type(mutable) is set:
        pass # set 구현 생략
    elif type(mutable) is dict:
        pass # dict 구현 생략
    return new
    
original = [[1, 2], [3, 4]]
new = my_deepcopy(original)
new[0][0] = 0
# original  [[1, 2], [3, 4]]
# new       [[0, 2], [3, 4]]
```

## copy.deepcopy()

또 다른 방법은 copy 라이브러리에서 제공하는 deepcopy() 함수를 이용하면 된다.

```python
import copy

original = [[1, 2], [3, 4]]
new = copy.deepcopy(original)
new[0][0] = 0
# original  [[1, 2], [3, 4]]
# new       [[0, 2], [3, 4]]
```

# References

* [위키독스 - 얕은 복사와 깊은 복사](https://wikidocs.net/16038){:target="_blank"}

* [Python 공식 문서 - copy 라이브러리 ](https://docs.python.org/ko/3/library/copy.html){:target="_blank"}
