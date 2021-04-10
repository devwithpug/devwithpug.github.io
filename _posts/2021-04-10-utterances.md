---
layout: post
title: 'DISQUS -> Utterances 블로그 댓글 시스템 변경'
comments: true
categories:
    - blog
---

# 블로그 댓글 시스템 변경 (21/4/9)

개인 블로그를 만들어가면서 댓글 시스템으로 DISQUS를 사용해오고 있었는데 이번에 Utterances로 전환하게 되었는데 간단하게 내용을 정리해보려고 합니다.

## DISQUS의 광고

Jekyll 블로그를 처음 시작하면서 여러 설정을 하던 중 DISQUS의 간단한 블로그 댓글 환경 구축에 대해 알게 되었고 이를 잘 사용해오고 있었습니다. 그런데 블로그의 DISQUS 댓글 상단에 자동으로 광고가 생성되더군요. 기존에 광고 차단 확장플러그인을 사용해온지라 전혀 몰랐습니다.

댓글 창보다 광고화면이 훨씬 크고 모바일 환경에서는 화면 전체에 광고가 노출될 만큼 광고의 비중이 커서 제거 할 수 있는 방법을 찾아보았고 유일한 방법은 DISQUS에서 제공하는 프리미엄 서비스에 구독하여 한달마다 요금을 내야했습니다.

* DISQUS Pricing Plans

![](https://user-images.githubusercontent.com/69145799/114167833-6b41f580-996a-11eb-8db7-26fd6a5975d6.png)

개인 블로그의 목적이 수익도 아니고 오로지 공부를 위한 블로그이기 때문에 DISQUS보다 가볍고, 광고가 없는 다른 댓글 시스템을 찾아봐야 겠다고 생각했습니다.

# Utterances

Utterances는 Github 레포지토리에서 제공하는 Issue 시스템을 기반으로 하여 블로그의 댓글을 작성할 수 있게 해주는 lightweight한 댓글 위젯입니다.

## 장점

![](https://user-images.githubusercontent.com/69145799/114168229-ee634b80-996a-11eb-990a-58f93bce88e9.png)

위 사진의 내용처럼 Utterances의 장점들은 개발자에게 친화적인, 간단하고 가벼운, 무엇보다 Github스러운 점이 아닌가 생각했습니다.

따라서 DISQUS를 대신할 댓글 시스템으로 Utterances를 선택하게 되었습니다.

## 적용

먼저 Utterances는 Github 레포지토리의 Issue를 댓글 시스템으로 이용하기 때문에 이를 연동할 레포지토리가 필요합니다. 간단하게 Utterances를 사용할 레포지토리에 설치해주면 됩니다.

[Github 레포지토리에 Utterances 설치](https://github.com/apps/utterances){:target="_blank"}

설치가 완료되었으면 Utterances를 설정해야 합니다. 공식 홈페이지에서 설정을 진행합니다.

[Utterances 홈페이지](https://utteranc.es){:target="_blank"}

Utterances 홈페이지에서 하나하나 설명에 맞게 설정해주면 됩니다.

1. 사용할 사용자명/레포지토리명 기입
2. 블로그 글의 댓글들을 Github Issue에 어떤 방식으로 매핑할 지
3. (선택) Github Issue에 추가적으로 명시할 label 정하기
4. Utterances Theme 설정

![](https://user-images.githubusercontent.com/69145799/114169316-5d8d6f80-996c-11eb-9446-1444acce72ff.png)

설정이 모두 끝나게 되면 위와 같은 HTML 스크립트 코드가 생성됩니다. 이를 복사한 후 자신의 블로그 설정에 맞게 추가해주시면 됩니다.

### poole / hyde 블로그에 적용

저는 Jekyll 블로그 테마로 [poole / Hyde](https://github.com/poole/hyde){:target="_blank"} 를 이용하고 있습니다.

먼저 `/_includes` 디렉토리 안에 `comments.html`을 추가해주었습니다.

* `/_includes/comments.html`

```html
{% raw %}{% if page.comments %}
<div id="utteranc_thread"></div>
<script src="https://utteranc.es/client.js"
        repo="devwithpug/devwithpug.github.io"
        issue-term="pathname"
        label="comment"
        theme="github-light"
        crossorigin="anonymous"
        async>
</script>
{% endif %}{% endraw %}
```

그 다음 블로그에서 `comments.html`을 불러오기 위해 해당 내용을 추가해줘야 합니다. 블로그 포스트 아래에 댓글이 나오도록 `/_layouts/post.html` 을 수정해주었습니다.

* `/_layouts/post.html`

```html
{% raw %}---
layout: default
---

<div class="post">
  ...생략...
  {{ content }}
</div>

<!-- comments 라인 추가 -->
{% include comments.html %}

<div class="related">
  ...생략...
</div>{% endraw %}
```

이제 Jekyll 블로그에 Utterances 적용은 완료되었고, 댓글 기능을 사용할 게시글에 대해 설정을 추가해주면 됩니다.

* `/_posts/게시글.md`

```
// comments: true 로 설정

---
layout: post
title: '블로그 댓글 시스템 변경 DISQUS -> Utterances'
comments: true 
categories:
    - blog
---
```

![](https://user-images.githubusercontent.com/69145799/114171119-cfff4f00-996e-11eb-96ae-20e6355f9f8d.png)

게시글 하단에 정상적으로 Utterances가 나오게 되었습니다. 댓글을 작성하게 되면 아래 사진 처럼 Github 레포지토리의 Issue로 등록됩니다.

![](https://user-images.githubusercontent.com/69145799/114171313-118ffa00-996f-11eb-9acc-ecc0832d59fd.png)

저는 Issue 매핑 방식을 페이지 경로 이름으로 설정했습니다. 처음 Utterances를 설정 할 때 여러가지 선택지가 있으니까 개인 취향에 맞게 설정하면 될것 같습니다.

# References

* [https://utteranc.es](https://utteranc.es){:target="_blank"}

* [poole / Hyde (Github Repository)](https://github.com/poole/hyde){:target="_blank"}