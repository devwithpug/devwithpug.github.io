---
title: 'Debezium Source Connector: schema history에 대해'
categories: messaging
tags: ['messaging', 'kafka', 'debezium', 'cdc']
header:
    teaser: /assets/teasers/debezium-schema-history.png
---

![image](/assets/teasers/debezium-schema-history.png){:.align-center}

# 개요

트랜잭셔널 아웃박스 패턴을 위한 CDC 플랫폼 중 `kafka connect`의 debezium에 대해 리서치를 해보면서 debezium을 적용하기 위해 고려할 점이 생각보다 많았고, 운영 환경에서 간단하게 사용할 만한 기술이 아님을 알게 되었다. 

이번 글에서는 debezium에서 관리하는 스키마 히스토리에 대해 알게 된 점들을 정리해 보고자 한다.

## 세팅

스키마 히스토리를 설명하기에 앞서서 이번 글에서는 `debezium-embedded`를 기준으로 스키마 히스토리를 설정하는 방법들을 정리했다. 설정하는 방법은 `kafka connect`의 debezium 커넥터(Debezium connector for MySql)과 큰 차이가 없다.

> ℹ️ 이 글에서는 `kafka connect` 에서 source connector 플러그인으로 사용되는 `Debezium connector for MySql`과 `debezium-embedded` 에서 사용되는 커넥터를 모두 __debezium 커넥터__ 라고 부릅니다.

> ℹ️ 이 글에서 다루는 `debezium-embedded` 환경은 [github repo](https://github.com/devwithpug/debezium-mysql-connector-embedded-study){:target="_blank"}에서 확인 가능합니다.

# 스키마 히스토리

클라이언트가 db에 쿼리를 날릴 때, 클라이언트는 db의 현재 스키마를 사용한다.   
그러나 db 스키마는 언제든지 변경될 수 있으므로 debezium 커넥터는 `insert`, `update`, `delete` 작업이 __기록될 당시의 스키마__ 를 식별할 수 있어야 한다. 

마찬가지로 debezium 커넥터가 모든 이벤트에 반드시 현재 스키마를 적용할 수는 없다. 이벤트가 비교적 오래된 경우, 현재 스키마가 적용되기 전의 이벤트일 수 있기 때문이다.

## 스키마 히스토리 생성 예제

스키마 히스토리가 어떻게 생성되는지 확인해보기 위해 아래와 같은 테이블을 생성했다.

```sql
create table if not exists `debezium`.`test_table`(
    `id` bigint PRIMARY KEY NOT NULL AUTO_INCREMENT,
    `msg` varchar(255) NOT NULL
);
```

그리고, debezium mysql connector 가 설정된 `kafka connect`를 실행하면 아래와 같은 스냅샷 단계를 거치면서 스키마 히스토리가 생성된다.
> ℹ️ 스냅샷 단계의 자세한 설명은 [debezium 공식 문서](https://debezium.io/documentation/reference/stable/connectors/mysql.html#mysql-snapshots){:target="_blank"}를 참고 바랍니다.

```
2023-09-13T22:38:38.494+09:00  INFO 5878 --- [rce-coordinator] .d.r.RelationalSnapshotChangeEventSource : Snapshot step 1 - Preparing
2023-09-13T22:38:38.496+09:00  INFO 5878 --- [rce-coordinator] .d.r.RelationalSnapshotChangeEventSource : Snapshot step 2 - Determining captured tables
2023-09-13T22:38:38.496+09:00  INFO 5878 --- [rce-coordinator] i.d.c.m.MySqlSnapshotChangeEventSource   : Read list of available databases
2023-09-13T22:38:38.520+09:00  INFO 5878 --- [rce-coordinator] i.d.c.m.MySqlSnapshotChangeEventSource   : 	 list of available databases is: [debezium, information_schema, mysql, performance_schema, sys]
2023-09-13T22:38:38.520+09:00  INFO 5878 --- [rce-coordinator] i.d.c.m.MySqlSnapshotChangeEventSource   : Read list of available tables in each database
2023-09-13T22:38:38.555+09:00  INFO 5878 --- [rce-coordinator] i.d.c.m.MySqlSnapshotChangeEventSource   : 	snapshot continuing with database(s): [information_schema, performance_schema, debezium, mysql, sys]
2023-09-13T22:38:38.556+09:00  INFO 5878 --- [rce-coordinator] .d.r.RelationalSnapshotChangeEventSource : Adding table debezium.test_table to the list of capture schema tables
2023-09-13T22:38:38.557+09:00  INFO 5878 --- [rce-coordinator] .d.r.RelationalSnapshotChangeEventSource : Snapshot step 3 - Locking captured tables [debezium.test_table]
2023-09-13T22:38:38.564+09:00  INFO 5878 --- [rce-coordinator] i.d.c.m.MySqlSnapshotChangeEventSource   : Flush and obtain global read lock to prevent writes to database
2023-09-13T22:38:38.570+09:00  INFO 5878 --- [rce-coordinator] .d.r.RelationalSnapshotChangeEventSource : Snapshot step 4 - Determining snapshot offset
2023-09-13T22:38:38.575+09:00  INFO 5878 --- [rce-coordinator] i.d.c.m.MySqlSnapshotChangeEventSource   : Read binlog position of MySQL primary server
2023-09-13T22:38:38.578+09:00  INFO 5878 --- [rce-coordinator] i.d.c.m.MySqlSnapshotChangeEventSource   : 	 using binlog 'binlog.000002' at position '3803' and gtid ''
2023-09-13T22:38:38.579+09:00  INFO 5878 --- [rce-coordinator] .d.r.RelationalSnapshotChangeEventSource : Snapshot step 5 - Reading structure of captured tables
2023-09-13T22:38:38.579+09:00  INFO 5878 --- [rce-coordinator] i.d.c.m.MySqlSnapshotChangeEventSource   : All eligible tables schema should be captured, capturing: [debezium.test_table]
2023-09-13T22:38:39.168+09:00  INFO 5878 --- [rce-coordinator] i.d.c.m.MySqlSnapshotChangeEventSource   : Reading structure of database 'debezium'
2023-09-13T22:38:39.231+09:00  INFO 5878 --- [rce-coordinator] .d.r.RelationalSnapshotChangeEventSource : Snapshot step 5.a - Creating connection pool
2023-09-13T22:38:39.231+09:00  INFO 5878 --- [rce-coordinator] .d.r.RelationalSnapshotChangeEventSource : Created connection pool with 1 threads
2023-09-13T22:38:39.231+09:00  INFO 5878 --- [rce-coordinator] .d.r.RelationalSnapshotChangeEventSource : Snapshot step 6 - Persisting schema history
2023-09-13T22:38:39.265+09:00  INFO 5878 --- [rce-coordinator] i.d.c.m.MySqlSnapshotChangeEventSource   : Releasing global read lock to enable MySQL writes
2023-09-13T22:38:39.268+09:00  INFO 5878 --- [rce-coordinator] i.d.c.m.MySqlSnapshotChangeEventSource   : Writes to MySQL tables prevented for a total of 00:00:00.7
2023-09-13T22:38:39.268+09:00  INFO 5878 --- [rce-coordinator] .d.r.RelationalSnapshotChangeEventSource : Snapshot step 7 - Snapshotting data
2023-09-13T22:38:39.269+09:00  INFO 5878 --- [rce-coordinator] .d.r.RelationalSnapshotChangeEventSource : Creating snapshot worker pool with 1 worker thread(s)
2023-09-13T22:38:39.270+09:00  INFO 5878 --- [rce-coordinator] .d.r.RelationalSnapshotChangeEventSource : For table 'debezium.test_table' using select statement: 'SELECT `id`, `msg` FROM `debezium`.`test_table`'
2023-09-13T22:38:39.283+09:00  INFO 5878 --- [rce-coordinator] i.d.c.m.MySqlSnapshotChangeEventSource   : Estimated row count for table debezium.test_table is OptionalLong[0]
2023-09-13T22:38:39.285+09:00  INFO 5878 --- [pool-5-thread-1] .d.r.RelationalSnapshotChangeEventSource : Exporting data from table 'debezium.test_table' (1 of 1 tables)
2023-09-13T22:38:39.301+09:00  INFO 5878 --- [pool-5-thread-1] .d.r.RelationalSnapshotChangeEventSource : 	 Finished exporting 1 records for table 'debezium.test_table' (1 of 1 tables); total duration '00:00:00.016'
2023-09-13T22:38:39.306+09:00  INFO 5878 --- [rce-coordinator] .d.p.s.AbstractSnapshotChangeEventSource : Snapshot - Final stage
2023-09-13T22:38:39.306+09:00  INFO 5878 --- [rce-coordinator] .d.p.s.AbstractSnapshotChangeEventSource : Snapshot completed
```

스냅샷이 완료된 후, 생성된 스키마 히스토리를 보면 아래와 같다.

```
{"source":{"server":"local-test"},"position":{"ts_sec":1694612318,"file":"binlog.000002","pos":3803,"snapshot":true},"ts_ms":1694612319142,"databaseName":"","ddl":"SET character_set_server=utf8mb4, collation_server=utf8mb4_bin","tableChanges":[]}
{"source":{"server":"local-test"},"position":{"ts_sec":1694612319,"file":"binlog.000002","pos":3803,"snapshot":true},"ts_ms":1694612319160,"databaseName":"debezium","ddl":"DROP TABLE IF EXISTS `debezium`.`test_table`","tableChanges":[]}
{"source":{"server":"local-test"},"position":{"ts_sec":1694612319,"file":"binlog.000002","pos":3803,"snapshot":true},"ts_ms":1694612319172,"databaseName":"debezium","ddl":"DROP DATABASE IF EXISTS `debezium`","tableChanges":[]}
{"source":{"server":"local-test"},"position":{"ts_sec":1694612319,"file":"binlog.000002","pos":3803,"snapshot":true},"ts_ms":1694612319177,"databaseName":"debezium","ddl":"CREATE DATABASE `debezium` CHARSET utf8mb4 COLLATE utf8mb4_bin","tableChanges":[]}
{"source":{"server":"local-test"},"position":{"ts_sec":1694612319,"file":"binlog.000002","pos":3803,"snapshot":true},"ts_ms":1694612319179,"databaseName":"debezium","ddl":"USE `debezium`","tableChanges":[]}
{"source":{"server":"local-test"},"position":{"ts_sec":1694612319,"file":"binlog.000002","pos":3803,"snapshot":true},"ts_ms":1694612319230,"databaseName":"debezium","ddl":"CREATE TABLE `test_table` (\n  `id` bigint NOT NULL AUTO_INCREMENT,\n  `msg` varchar(255) COLLATE utf8mb4_bin NOT NULL,\n  PRIMARY KEY (`id`)\n) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin","tableChanges":[{"type":"CREATE","id":"\"debezium\".\"test_table\"","table":{"defaultCharsetName":"utf8mb4","primaryKeyColumnNames":["id"],"columns":[{"name":"id","jdbcType":-5,"typeName":"BIGINT","typeExpression":"BIGINT","charsetName":null,"position":1,"optional":false,"autoIncremented":true,"generated":true,"comment":null,"hasDefaultValue":false,"enumValues":[]},{"name":"msg","jdbcType":12,"typeName":"VARCHAR","typeExpression":"VARCHAR","charsetName":"utf8mb4","length":255,"position":2,"optional":false,"autoIncremented":false,"generated":false,"comment":null,"hasDefaultValue":false,"enumValues":[]}],"attributes":[]},"comment":null}]}
```

각각의 스키마 히스토리가 json 포맷으로 한 라인씩 저장되어 있는데, 가장 마지막 히스토리를 자세히 보면 아래와 같다.

```json
{
  "source": {
    "server": "local-test"
  },
  "position": {
    "ts_sec": 1694612319,
    "file": "binlog.000002",
    "pos": 3803,
    "snapshot": true
  },
  "ts_ms": 1694612319230,
  "databaseName": "debezium",
  "ddl": "CREATE TABLE `test_table` (\n  `id` bigint NOT NULL AUTO_INCREMENT,\n  `msg` varchar(255) COLLATE utf8mb4_bin NOT NULL,\n  PRIMARY KEY (`id`)\n) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin",
  "tableChanges": [
    {
      "type": "CREATE",
      "id": "\"debezium\".\"test_table\"",
      "table": {
        "defaultCharsetName": "utf8mb4",
        "primaryKeyColumnNames": [
          "id"
        ],
        "columns": [
          {
            "name": "id",
            "jdbcType": -5,
            "typeName": "BIGINT",
            "typeExpression": "BIGINT",
            "charsetName": null,
            "position": 1,
            "optional": false,
            "autoIncremented": true,
            "generated": true,
            "comment": null,
            "hasDefaultValue": false,
            "enumValues": []
          },
          {
            "name": "msg",
            "jdbcType": 12,
            "typeName": "VARCHAR",
            "typeExpression": "VARCHAR",
            "charsetName": "utf8mb4",
            "length": 255,
            "position": 2,
            "optional": false,
            "autoIncremented": false,
            "generated": false,
            "comment": null,
            "hasDefaultValue": false,
            "enumValues": []
          }
        ],
        "attributes": []
      },
      "comment": null
    }
  ]
}
```

위 히스토리는 스키마 변경 이벤트 메시지이고, 다음과 같은 필드를 가지고 있다.

- `ddl`: 스키마 변경을 초래하는 ddl (create, alter, drop)
- `databaseName`: ddl 문이 적용되는 데이터베이스의 이름이다. 이때 데이터베이스 이름은 메시지 key 역할을 한다.
- `pos` binlog에서 해당 ddl의 위치
- `tableChanges`: 스키마 적용 후 전체 테이블 스키마의 구조화된 표현이다. `tableChanges` 필드에는 테이블의 각 column에 대한 항목의 배열이 포함된다. 구조화된 표현은 json 또는 avro 포맷으로 데이터를 제공하기 때문에, 컨슈머는 ddl parser를 통해 먼저 처리하지 않고도 데이터를 쉽게 읽을 수 있다.

> ℹ️ debezium 커넥터의 스키마 변경 이벤트 포맷은 인큐베이팅 중이며 예고 없이 변경될 수 있다고 한다.   
> 이 글은 __debezium-embedded, debeizum-conenctor-mysql 2.3.2.Final__ 버전을 기준으로 작성하였습니다.

스키마 변경 후 발생하는 이벤트를 올바르게 처리하기 위해, MySQL은 데이터에 영향을 미치는 row-level 변경뿐만 아니라, 데이터베이스에 적용되는 ddl 문도 binlog에 포함한다. debezium 커넥터는 binlog에서 이러한 ddl 문을 발견하면 이를 파싱 하여 각 테이블의 스키마의 __인메모리 데이터__ 를 업데이트한다. debezium 커넥터는 이 스키마 표현을 사용하여 각 `insert`, `update`, `delete` 작업 시점에 테이블의 구조를 식별하고 적절한 cdc 이벤트를 생성한다.

만약 debezium 커넥터가 크래시 또는 정상 종료(graceful stop) 후 재시작 하면, debezium 커넥터는 스키마 히스토리 데이터를 읽고 debezium 커넥터가 시작되는 binlog의 시점까지 모든 ddl 문의 구문을 분석하여 해당 시점에 존재했던 테이블 구조를 다시 빌드한다.(인 메모리)

# 스키마 히스토리 데이터 관리

스키마 히스토리는 해당 시점의 테이블 구조를 위해 반드시 필요한 데이터임을 알게 되었다. 그런데, 이러한 스키마 히스토리를 debezium 커넥터에서는 따로 저장하지 않고, 인 메모리로만 관리한다. 

즉, __debezium 커넥터의 상태와 관계없이 스키마 히스토리는 완전하게 보존되어야 함을 의미한다.__ 이번에는 스키마 히스토리 데이터를 관리하는 방법에 대해 알아보려 한다.

debezium 에서는 두 가지 방법을 제공한다.

1. `KafkaSchemaHistory`: kafka 토픽으로 관리
2. `FileSchemaHistory`: 파일로 관리

## KafkaSchemaHistory

debezium 커넥터에서는 기본으로 kafka 토픽을 통해 스키마 히스토리 데이터를 관리하는 방법을 제시한다.

데이터베이스의 테이블에 적용되는 스키마 변경 이벤트를 생성하도록 debezium 커넥터를 구성할 수 있는데, 이때 debezium 커넥터는 `topic.prefix` 설정 프로퍼티의 값으로 kafka 토픽에 스키마 히스토리를 기록한다. 

기본적으로는 `payload` 필드를 보내고, 선택적으로 `schema` 필드도 히스토리 데이터에 포함할 수 있다.

kafka 토픽을 통해 스키마 히스토리를 관리하는 경우 몇 가지 고려할 점이 있다.

### 설정

#### 토픽 생성

먼저, 데이터베이스의 스키마 히스토리 데이터를 관리할 kafka 토픽을 생성해야 한다. 

```bash
$ bin/kafka-topics.sh --create --topic <topic_name> --partitions 1 --replication-factor <number-of-replication-factor> --bootstrap-server <broker host:port> --config retention.ms=-1
```

토픽을 생성할 때 주의할 점은 파티션을 1개로 설정해야 하고, 토픽의 retention을 가능하다면 무제한(-1)으로 설정하는 것이 좋은데, 그 이유는 아래에서 자세히 설명한다.

#### debezium 커넥터 설정

- (1) `debezium-embedded`

`debezium-embedded`의 경우 debezium engine을 구성할 때, 아래와 같이 설정 값을 넘겨주면 된다.

```kotlin
    @Bean
    fun engine(): EmbeddedEngine {
        return EmbeddedEngine.BuilderImpl()
            .using(embeddedEngineConfig())
            .build()
    }

    private fun embeddedEngineConfig() = io.debezium.config.Configuration.from(
        mapOf(
            "schema.history.internal" to KafkaSchemaHistory::class.java.name,
            "schema.history.internal.kafka.topic" to "{스키마 히스토리를 저장할 kafka 토픽 명}"
            "schema.history.internal.kafka.bootstrap.servers" to "{kafka 서버 주소}"
            // 다른 설정 값 생략
        )
    )
```

- (2) `kafka conenct`

`kafka connect`를 통해 서버를 구성하는 경우, source connector를 생성할 때, 아래와 같이 `json` 포맷으로 설정값을 넘겨주면 된다.

```json
# POST (kafka-conenct-host):(port)/connectors

{
  "name": "my-test-connector",
  "config": {
    "schema.history.internal.kafka.bootstrap.servers": "localhost:9092",
    "schema.history.internal.kafka.topic": "debezium-history-events"
    # 다른 설정 값 생략
  }
}
```

### 토픽의 파티션 개수

데이터베이스의 스키마 히스토리 토픽은 __파티션을 반드시 1개로 구성해야 한다.__ 

그 이유는 kafka가 동작하는 방식 때문이다. debezium 커넥터가 내보내는 이벤트 레코드의 순서 보장을 위해서는 파티션을 여러 개로 나누면 안 되기 때문이다. 토픽의 파티션을 여러개로 나누어 이벤트 레코드를 파티션 별로 분할하는 것은 일관된 전역 순서를 유지하는 것과 맞지 않다.

따라서, 직접 스키마 히스토리 토픽을 생성할 때 파티션 수를 1로 지정하거나, 스키마 히스토리 토픽을 자동 생성하는 경우에는 kafka의 `num.partitions` 값을 1로 설정해야 한다.

### 토픽의 retention 설정

토픽의 retention 에 대해 설명하기 전에 debezium 에서 제공하는 여러 스냅샷 모드에 대해 알 필요가 있다.

debezium은 스냅샷을 실행할 때 다양한 모드를 사용할 수 있다. 스냅샷 모드는 `snapshot.mode` 설정값에 의해 결정되며, 기본 값은 `initial` 이다.

- 스냅샷 모드

> ℹ️ `snapshot.mode`
> - `initial` - 서버의 오프셋이 기록되지 않은 경우에만 스냅샷을 실행한다.
> - `initial_only` - 서버의 오프셋이 기록되지 않은 경우에 초기 스냅샷까지만 실행한다.(binlog에서 변경 이벤트는 읽지 않는다)
> - `when_needed` - debezium 커넥터가 스냅샷이 필요하다고 판단할 때 실행한다.(아래 경우 참고)
>   - 서버의 오프셋이 기록되지 않은 경우
>   - 기록된 오프셋이 사용할 수 없는 binlog 위치 또는 GTID를 지정하는 경우
> - `never` - 스냅샷을 사용하지 않는다. 처음 시작될 때 서버의 binlog 시작 부분부터 읽는다. binlog가 데이터베이스의 전체 기록을 포함하도록 보장되는 경우에만 유효하다.(binlog의 보관 기간이 무제한이어야 한다)
> - `schema_only` - 스냅샷 시점의 테이블 구조만 스냅샷으로 찍는다. 지금부터 발생하는 변경 사항만 토픽으로 보내는 경우에 유용하다.
> - `schema_only_recovery` - 손상되거나 손실된 데이터베이스 복구하거나 예기치 못하게 스키마 히스토리 데이터가 크게 증가하는 경우 이를 정리하는 작업이 필요하다. 
이때, `schema_only_recovery` 모드를 통해 복구가 가능한데, 이를 위해선 히스토리 스키마의 데이터가 완전히 보존되어야 한다. 즉, 토픽의 retention을 infinite로 설정해 주어야 한다.

여기서 주의 깊게 보아야 하는 스냅샷 모드는 `never`, `schema_only_recovery` 라고 생각한다. 

- `schema_only_recovery`

먼저 `schema_only_recovery` 의 경우, 특정 상황에서 복구가 필요한 경우에 사용할 수 있는 모드임을 알 수 있다. 하지만 복구를 하기 위해선 히스토리 스키마의 데이터가 완전히 보존되어야 한다. 

스키마 히스토리를 kafka 토픽으로 관리하고, 비상 상황에도 안전하게 복구를 진행하기 위해서는 __토픽의 retention을 무제한으로 설정해야 한다.__ 

retention 은 kafka broker를 통해 손쉽게 설정을 변경할 수 있지만, kafka의 메시지 retention을 무제한으로 설정한다는 것은 고민이 필요할 수 있다. kafka는 데이터를 영구적으로 보관하는 데이터베이스의 용도로 설계한 것이 아니다. 물론 특별한 케이스들을 위해서 retention을 무제한으로 가져갈 수 있겠지만, 프로덕션 환경에서 토픽의 retention을 무제한으로 설정하는 것에 대해서는 더 깊은 고민이 필요하다.

- `never`

두 번째는 `never`의 경우이다. 앞서 말한 `schema_only_recovery`가 토픽의 retention을 무제한으로 설정해야 하는데, 그게 어렵다면 스냅샷을 사용하지 않는 `never` 모드에 대해 고민해볼 수 있다. 

하지만, 스냅샷 모드를 `never` 로 설정하는 경우 스냅샷 자체를 사용하지 않으므로 __debezium 커넥터로 실행될 때마다 서버의 binlog를 시작 지점부터 읽게 된다.(binlog를 영구 보관해야한다)__ 

binlog를 영구 보관하는 케이스가 실제 있는지는 모르지만, binlog를 영구적으로 보관하려면 binlog를 보관하는 저장소에 대한 고민이 필요하다. 

또한, 매우 오래된 데이터베이스의 binlog가 어마어마하게 많이 쌓여있다고 가정했을 때, debezium 커넥터가 실행되면서 binlog의 시작 부분부터 전부 읽어야 한다면, 이와 연관된 문제가 발생할 것 같다는 생각이 든다.

- 정리

데이터베이스의 스키마 히스토리를 kafka 토픽을 통해 관리하는 KafkaSchemaHistory 방법은 `kafka connect`를 사용하는 인프라 구조에서 간단하게 구성할 수 있는 방법이지만, 개인적인 생각으로는 이를 실제 운영에서 사용하기 위해서 더 깊은 고민이 필요하다고 느낀다.

## FileSchemaHistory

> 🛑 __주의!__   
> `kafka connect`의 `Debezium connector for MySql` 플러그인에서는 FileSchemaHistory 설정이 불가능하다.(현재 공식 문서 기준으로 제공되고 있지 않다) 

debezium 에서는 파일을 통해 스키마 히스토리를 관리할 수 있는 방법을 제공한다. 

KafkaSchemaHistory 와 다르게, 스키마 히스토리 데이터를 파일로 직접 관리하기 때문에, kafka 토픽으로 관리할 때 고려할 점들을 모두 신경 쓰지 않고 오로지 파일을 직접 관리할 수 있다는 것이 장점이라고 생각한다.

파일을 위해 복잡한 설정을 할 필요 없이, 스키마 히스토리 데이터 파일을 저장할 경로만 지정해 주면 설정이 끝난다.

### 설정

```kotlin
    private fun embeddedEngineConfig() = io.debezium.config.Configuration.from(
        mapOf(
            "schema.history.internal" to FileSchemaHistory::class.java.name,
            "schema.history.internal.file.filename" to "schemahistory.dat", // 스키마 히스토리 데이터 파일 경로
            // 다른 설정 값 생략
        )
    )
```

FileSchemaHistory를 설정한 뒤 `debezium-embedded` 서버를 실행하면 설정한 경로에 아래와 같이 스키마 히스토리 데이터가 저장된 것을 확인할 수 있다.

```
{"source":{"server":"local-test"},"position":{"ts_sec":1694612318,"file":"binlog.000002","pos":3803,"snapshot":true},"ts_ms":1694612319142,"databaseName":"","ddl":"SET character_set_server=utf8mb4, collation_server=utf8mb4_bin","tableChanges":[]}
{"source":{"server":"local-test"},"position":{"ts_sec":1694612319,"file":"binlog.000002","pos":3803,"snapshot":true},"ts_ms":1694612319160,"databaseName":"debezium","ddl":"DROP TABLE IF EXISTS `debezium`.`test_table`","tableChanges":[]}
{"source":{"server":"local-test"},"position":{"ts_sec":1694612319,"file":"binlog.000002","pos":3803,"snapshot":true},"ts_ms":1694612319172,"databaseName":"debezium","ddl":"DROP DATABASE IF EXISTS `debezium`","tableChanges":[]}
{"source":{"server":"local-test"},"position":{"ts_sec":1694612319,"file":"binlog.000002","pos":3803,"snapshot":true},"ts_ms":1694612319177,"databaseName":"debezium","ddl":"CREATE DATABASE `debezium` CHARSET utf8mb4 COLLATE utf8mb4_bin","tableChanges":[]}
{"source":{"server":"local-test"},"position":{"ts_sec":1694612319,"file":"binlog.000002","pos":3803,"snapshot":true},"ts_ms":1694612319179,"databaseName":"debezium","ddl":"USE `debezium`","tableChanges":[]}
{"source":{"server":"local-test"},"position":{"ts_sec":1694612319,"file":"binlog.000002","pos":3803,"snapshot":true},"ts_ms":1694612319230,"databaseName":"debezium","ddl":"CREATE TABLE `test_table` (\n  `id` bigint NOT NULL AUTO_INCREMENT,\n  `msg` varchar(255) COLLATE utf8mb4_bin NOT NULL,\n  PRIMARY KEY (`id`)\n) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin","tableChanges":[{"type":"CREATE","id":"\"debezium\".\"test_table\"","table":{"defaultCharsetName":"utf8mb4","primaryKeyColumnNames":["id"],"columns":[{"name":"id","jdbcType":-5,"typeName":"BIGINT","typeExpression":"BIGINT","charsetName":null,"position":1,"optional":false,"autoIncremented":true,"generated":true,"comment":null,"hasDefaultValue":false,"enumValues":[]},{"name":"msg","jdbcType":12,"typeName":"VARCHAR","typeExpression":"VARCHAR","charsetName":"utf8mb4","length":255,"position":2,"optional":false,"autoIncremented":false,"generated":false,"comment":null,"hasDefaultValue":false,"enumValues":[]}],"attributes":[]},"comment":null}]}
```

# Wrap-up

이 글에서는 아래와 같은 내용을 다루었다.

1. 스키마 히스토리의 생성
2. 스키마 히스토리 데이터의 포맷
3. 스키마 히스토리의 역할
4. 스키마 히스토리 데이터를 관리하는 두 가지 방법
5. debezium 커넥터의 스냅샷 모드
6. 스키마 히스토리를 kafka 토픽으로 관리할 때 고려할 점

kafka connect를 통해 파이프라인을 구축하는 경우 MySQL을 사용하는 많은 사람들이 debezium 사용을 고려해 볼 것 같은데, 이러한 고민에 도움이 되길 바라면서 글을 정리해 보았다. 좋은 기술도 적절하게 사용해야 좋은 결과를 얻을 수 있기도 하고.. debezium 을 프로덕션 레벨에서 사용하기 위해 고려할 점이 많은 것 같다는 생각이 들었다. 

> 이 글은 debezium 을 사용하기 전에 고민했던 부분들을 정리했던 글입니다.   
> 잘못된 정보 또는 더 나은 방법이 있을 수 있습니다 😊   
> 글에 수정이 필요하거나 의견이 있는 경우 자유롭게 코멘트를 남겨주세요.

# References

- [Debezium connector for MySQL](https://debezium.io/documentation/reference/stable/connectors/mysql.html){:target="_blank"}
- [Embedding Debezium Connectors](https://debezium.io/documentation/reference/stable/operations/embedded.html){:target="_blank"}