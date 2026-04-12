update "anchor_events"
set "beta_group_qr_code" = nullif(
  (select "value" from "config" where "key" = 'wechat_beta_group_qr_code'),
  ''
)
where
  "beta_group_qr_code" is null
  or btrim("beta_group_qr_code") = '';

delete from "config"
where "key" = 'wechat_beta_group_qr_code';
