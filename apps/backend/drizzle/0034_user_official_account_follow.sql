alter table users
  add column if not exists wechat_official_account_followed_at timestamp;
