alter table "pois"
  drop constraint "pois_pkey";

alter table "pois"
  rename column "id" to "name";

alter table "pois"
  add column "id" bigserial;

alter table "pois"
  add column "full_address" text,
  add column "gcj02" double precision[],
  add column "wgs84" double precision[],
  add column "bd09" double precision[];

alter table "pois"
  add constraint "pois_pkey" primary key ("id"),
  add constraint "pois_name_unique" unique ("name"),
  add constraint "pois_gcj02_pair_check" check ("gcj02" is null or cardinality("gcj02") = 2),
  add constraint "pois_wgs84_pair_check" check ("wgs84" is null or cardinality("wgs84") = 2),
  add constraint "pois_bd09_pair_check" check ("bd09" is null or cardinality("bd09") = 2);
