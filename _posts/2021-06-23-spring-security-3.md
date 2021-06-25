---
title: '스프링 시큐리티 - 권한 계층(RoleHierarchy) 구현'
categories: spring
tags: ['spring', 'springsecurity', 'java']
header:
    teaser: /assets/teasers/springsecurity.jpg
last_modified_at: 2021-06-25T00:00:00+09:00
---

스프링 시큐리티를 공부하면서 인가 권한을 계층적으로 구성하는 방법에 대해 정리해보았다.

- - -

# 개요

스프링 시큐리티에서 제공하는 기본적인 인가 정책을 사용할 때 각각의 인가 권한(Role)은 연관 관계를 가지지 않는다.

예로 들어보면 

`ROLE_USER`, `ROLE_MANAGER`, `ROLE_ADMIN` 과 같은 3가지 Role이 있다고 할 때, 어드민 권한을 가진 어카운트는 매니저, 유저 권한도 함께 가지도록 서비스를 구현하는 것이 좋겠지만 __이들 간의 계층 관계가 자동으로 수립되지는 않는다.__

# 권한 계층 구현

## RoleHierarchy 인터페이스 사용

스프링 시큐리티에서는 권한 계층을 위한 `RoleHierarchy` 인터페이스를 제공한다.

![image](https://user-images.githubusercontent.com/69145799/122933809-ef244f00-d3a9-11eb-9608-399bc49bc537.png){:.align-center}

Example을 보면 권한 계층을 `ROLE_A > ROLE_B > ROLE_C` 와 같이 표현하는 것을 알 수 있다.

### RoleHierarchyImpl

스프링 시큐리티에서는 `RoleHierarchy` 의 구현체 또한 제공한다.

```java
public void setHierarchy(String roleHierarchyStringRepresentation) {
    this.roleHierarchyStringRepresentation = roleHierarchyStringRepresentation;
    logger.debug(LogMessage.format("setHierarchy() - The following role hierarchy was set: %s",
            roleHierarchyStringRepresentation));
    buildRolesReachableInOneStepMap();
    buildRolesReachableInOneOrMoreStepsMap();
}

private void buildRolesReachableInOneStepMap() {
    this.rolesReachableInOneStepMap = new HashMap<>();
    for (String line : this.roleHierarchyStringRepresentation.split("\n")) {
        // Split on > and trim excessive whitespace
        String[] roles = line.trim().split("\\s+>\\s+");
        for (int i = 1; i < roles.length; i++) {
            String higherRole = roles[i - 1];
            GrantedAuthority lowerRole = new SimpleGrantedAuthority(roles[i]);
            Set<GrantedAuthority> rolesReachableInOneStepSet;
            if (!this.rolesReachableInOneStepMap.containsKey(higherRole)) {
                rolesReachableInOneStepSet = new HashSet<>();
                this.rolesReachableInOneStepMap.put(higherRole, rolesReachableInOneStepSet);
            }
            else {
                rolesReachableInOneStepSet = this.rolesReachableInOneStepMap.get(higherRole);
            }
            rolesReachableInOneStepSet.add(lowerRole);
            logger.debug(LogMessage.format(
                    "buildRolesReachableInOneStepMap() - From role %s one can reach role %s in one step.",
                    higherRole, lowerRole));
        }
    }
}
```

조금 복잡하지만.. `buildRolesReachableInOneStepMap()`을 살펴보면 권한 계층 관계를 스트링으로 받아서 파싱하는 것을 확인 할 수 있다. 앞에서 본 인터페이스의 Example과 동일하다.

작동 원리는 다음과 같다.

1. `FilterSecurityInterceptor` 에서 `AccessDecisionManager` 에게 인가 처리를 요청
2. `AccessDecisionManager` 가 `AccessDecisionVoter` 에게 인가 처리 위임
3. `AccessDecisionVoter` 인터페이스의 구현체인 `RoleVoter`를 상속 받는 `RoleHierarchyVoter` 클래스로 인가 여부 판단

```java
public class RoleHierarchyVoter extends RoleVoter {

	private RoleHierarchy roleHierarchy = null;

	public RoleHierarchyVoter(RoleHierarchy roleHierarchy) {
		Assert.notNull(roleHierarchy, "RoleHierarchy must not be null");
		this.roleHierarchy = roleHierarchy;
	}
```
`RoleHierarchyVoter` 클래스는 다음과 같이 `RoleHierarchy` 객체를 가지고 생성되므로 `RoleHierarchy` 객체를 생성하여 넘겨주기만 하면 된다.

이를 DB와 연동하여 직접 DB에서 권한 계층 정보를 받아 `RoleHierarchy` 객체로 생성한 후에 `RoleHierarchyVoter`를 생성해보려고한다.

### 구현

* 권한 계층을 저장하는 엔티티

```java
@Entity
@Table(name = "ROLE_HIERARCHY")
@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
@ToString
public class RoleHierarchy implements Serializable {

    @Id
    @GeneratedValue
    private Long id;

    @Column(name = "child_name")
    private String childName;

    @ManyToOne(cascade = {CascadeType.ALL}, fetch = FetchType.LAZY)
    @JoinColumn(name = "parents_name", referencedColumnName = "child_name")
    private RoleHierarchy parentName;

    @OneToMany(mappedBy = "parentName", cascade = {CascadeType.ALL})
    private Set<RoleHierarchy> roleHierarchy = new HashSet<RoleHierarchy>();
}
```

* 권한 계층 엔티티 Repository

```java
public interface RoleHierarchyRepository extends JpaRepository<RoleHierarchy, Long> {
    RoleHierarchy findByChildName(String roleName);
}
```

* DB 테이블 구성

![image](https://user-images.githubusercontent.com/69145799/122935234-247d6c80-d3ab-11eb-9e54-4d743ecbdacc.png){:.align-center}

* 권한 계층 엔티티를 스트링으로 변환하는 서비스 클래스(인터페이스 생략)

```java
@Service
public class RoleHierarchyServiceImpl implements RoleHierarchyService {

    @Autowired
    private RoleHierarchyRepository roleHierarchyRepository;

    @Transactional
    @Override
    public String findAllHierarchy() {

        List<RoleHierarchy> roleHierarchies = roleHierarchyRepository.findAll();

        Iterator<RoleHierarchy> iterator = roleHierarchies.iterator();
        StringBuilder concatRoles = new StringBuilder();
        while (iterator.hasNext()) {
            RoleHierarchy roleHierarchy = iterator.next();
            if (roleHierarchy.getParentName() != null) {
                concatRoles.append(roleHierarchy.getParentName().getChildName());
                concatRoles.append(" > ");
                concatRoles.append(roleHierarchy.getChildName());
                concatRoles.append("\n");
            }
        }
        return concatRoles.toString();
    }
}
```

* SecurityConfig에서 권한 계층 설정

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    // 1 RoleHierarchyImpl 빈 생성
    @Bean
    public RoleHierarchyImpl roleHierarchy() {
        RoleHierarchyImpl roleHierarchy = new RoleHierarchyImpl();
        return roleHierarchy;
    }
    // 2 RoleHierarchyVoter 생성
    @Bean
    public AccessDecisionVoter<? extends Object> roleVoter() {
        RoleHierarchyVoter roleHierarchyVoter = new RoleHierarchyVoter(roleHierarchy());
        return roleHierarchyVoter;
    }
    // 3 생성한 Voter를 담은 Voter 리스트 전달
    private List<AccessDecisionVoter<?>> getAccessDecisionVoters() {
        List<AccessDecisionVoter<? extends Object>> accessDecisionVoters = new ArrayList<>();
        accessDecisionVoters.add(roleVoter()); // 계층 voter
        return accessDecisionVoters;
    }
    // 4 AffirmativeBased 규칙 사용
    private AccessDecisionManager affirmativeBased() {
        AffirmativeBased affirmativeBased = new AffirmativeBased(getAccessDecisionVoters());
        return affirmativeBased;
    }
    // 5 커스텀 필터 생성(FilterSecurityInterceptor 를 상속받는 클래스)
    @Bean
    public PermitAllFilter customFilterSecurityInterceptor() throws Exception {
        PermitAllFilter permitAllFilter = new PermitAllFilter(permitAllResources);
        permitAllFilter.setSecurityMetadataSource(urlFilterInvocationSecurityMetadataSource());
        permitAllFilter.setAccessDecisionManager(affirmativeBased());
        permitAllFilter.setAuthenticationManager(authenticationManagerBean());
        return permitAllFilter;
    }
    // 6 커스텀 필터 설정
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            /* 생략 */
        .and()
                // 기존 FilterSecurityInterceptor 앞에 커스텀 필터 추가
                .addFilterBefore(customFilterSecurityInterceptor(), FilterSecurityInterceptor.class)
        ;
    }
}
```

* SecurityInitializer 클래스 생성

```java
// @Configuration 이 완료된 후에 실행됨
@Component
public class SecurityInitializer implements ApplicationRunner {

    @Autowired
    private RoleHierarchyService roleHierarchyService;
    @Autowired
    private RoleHierarchyImpl roleHierarchy;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // 서비스 클래스를 통해 DB에서 계층 권한 가져와서 계층 설정
        String allHierarchy = roleHierarchyService.findAllHierarchy();
        roleHierarchy.setHierarchy(allHierarchy);
    }
}
```

### 성공

* 인가 권한이 필요한 페이지 접근

[![image](https://user-images.githubusercontent.com/69145799/122941818-b20f8b00-d3b0-11eb-9c42-04c118953961.png)](https://user-images.githubusercontent.com/69145799/122941818-b20f8b00-d3b0-11eb-9c42-04c118953961.png){:.align-center}

> ⬆ 생성한 RoleHierarchyVoter가 인가 결정에 참여하는 것을 확인할 수 있다.

`ROLE_ADMIN > ROLE_MANAGER > ROLE_USER` 

위와 같이 권한 계층이 설정되어 하위 계층의 인가 권한이 없어도 해당 url에 접근이 가능했다!

### 아쉬운 점

__구현은 성공적으로 마무리 했지만 권한 계층을 표현하는 방법이 아쉬웠다.__

`ROLE_ADMIN > ROLE_MANAGER\nROLE_MANAGER > ROLE_USER` 

위와 같이 `StringBuilder`를 이용하여 하나의 문자열로 생성하는 방법 말고 `HashMap` 자료형을 이용하여 parent와 child 권한을 key, value로 표현하여 구현해보고 싶었다.

## Map을 이용한 파싱 구현

### 변경 점

* `RoleHierarchyImpl` 을 상속받는 `CustomRoleHierarchyImpl` 생성

```java
public class CustomRoleHierarchyImpl extends RoleHierarchyImpl {

    // String -> Map 변경
    private Map<String, String> roleHierarchyMapRepresentation = null;

    private Map<String, Set<GrantedAuthority>> rolesReachableInOneStepMap = null;
    private Map<String, Set<GrantedAuthority>> rolesReachableInOneOrMoreStepsMap = null;

    // 생성자 변경
    public void setHierarchy(Map<String, String> roleHierarchyMapRepresentation) {
        this.roleHierarchyMapRepresentation = roleHierarchyMapRepresentation;

        buildRolesReachableInOneStepMap();
        buildRolesReachableInOneOrMoreStepsMap();
    }

    // 기존 roleHierarchyStringRepresentation을 사용하는 구문 변경
    private void buildRolesReachableInOneStepMap() {
        this.rolesReachableInOneStepMap = new HashMap<>();

        roleHierarchyMapRepresentation.forEach((parent, child) -> {
            String higherRole = parent;
            GrantedAuthority lowerRole = new SimpleGrantedAuthority(child);
            Set<GrantedAuthority> rolesReachableInOneStepSet;
            if (!this.rolesReachableInOneStepMap.containsKey(higherRole)) {
                rolesReachableInOneStepSet = new HashSet<>();
                this.rolesReachableInOneStepMap.put(higherRole, rolesReachableInOneStepSet);
            }
            else {
                rolesReachableInOneStepSet = this.rolesReachableInOneStepMap.get(higherRole);
            }
            rolesReachableInOneStepSet.add(lowerRole);
        });
    }
    /* 나머지 메소드 생략 */
}
```

* SecurityConfig 변경

```java
// CustomRoleHierarchyImpl 사용
@Bean
public CustomRoleHierarchyImpl roleHierarchy() {
    CustomRoleHierarchyImpl roleHierarchy = new CustomRoleHierarchyImpl();
    return roleHierarchy;
}
```

* RoleHierarchyServiceImpl 에 Map 메소드 추가

```java
@Service
public class RoleHierarchyServiceImpl implements RoleHierarchyService {

    /* 생략 */

    // 추가
    @Transactional
    public Map<String, String> findAllHierarchyToMap() {
        List<RoleHierarchy> roleHierarchies = roleHierarchyRepository.findAll();
        Map<String, String> map = new HashMap<>();

        for (RoleHierarchy roleHierarchy : roleHierarchies) {
            if (roleHierarchy.getParentName() != null) {
                map.put(roleHierarchy.getParentName().getChildName(), roleHierarchy.getChildName());
            }
        }
        return map;
    }
}
```

* SecurityInitializer 변경

```java
@Component
public class SecurityInitializer implements ApplicationRunner {

    @Autowired
    private RoleHierarchyService roleHierarchyService;
    // CustomRoleHierarchyImpl 사용
    @Autowired
    private CustomRoleHierarchyImpl roleHierarchy;

    // 구현한 findAllHierarchyToMap() 사용
    @Override
    public void run(ApplicationArguments args) throws Exception {
        Map<String, String> allHierarchyToMap = roleHierarchyService.findAllHierarchyToMap();
        roleHierarchy.setHierarchy(allHierarchyToMap);
    }
}
```

### 성공

[![image](https://user-images.githubusercontent.com/69145799/122948863-31ec2400-d3b6-11eb-9b7e-3d23b70eb2ca.png)](https://user-images.githubusercontent.com/69145799/122948863-31ec2400-d3b6-11eb-9b7e-3d23b70eb2ca.png){:.align-center}

> ⬆ 기존의 스트링 표현법이 아닌 `HashMap` 객체로 권한 계층이 표현되고 있는 것을 확인할 수 있다!

# References

* [Inflearn - 정수원님 스프링 시큐리티 강의](https://www.inflearn.com/course/코어-스프링-시큐리티/){:target="_blank"}
* [docs.spring.io - Hierarchical Roles](https://docs.spring.io/spring-security/site/docs/current/reference/html5/#authz-hierarchical-roles){:target="_blank"}