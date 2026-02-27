# DEPLOYMENT of PartnerUp MVP-HA Backend

- Aliyun RDS PostgreSQL (Serverless version)
- Aliyun FC + Custom Runtime + Custom Layer (with CICD)
- Aliyun FC timer function `job_runner_trigger` (template: `apps/backend/fc-job-runner-trigger/s.yaml`; calls backend `/internal/jobs/tick`, supports comma-separated multi URL via `ALIYUN_FC_JOB_RUNNER_TICK_URL`)
- Aliyun OSS (Auto-cleanup)
