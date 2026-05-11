insert into "feedback_questionnaire_templates" (
  "key",
  "version",
  "title",
  "definition"
)
values (
  'food_tasting_post_event_feedback',
  '1.0.0',
  '餐饮试吃活动反馈',
  '{
    "key": "food_tasting_post_event_feedback",
    "version": "1.0.0",
    "title": "餐饮试吃活动反馈",
    "questions": [
      {
        "id": "overall_experience",
        "type": "single_choice",
        "label": "这次体验整体如何？",
        "required": true,
        "options": [
          { "value": "good", "label": "满意" },
          { "value": "okay", "label": "一般" },
          {
            "value": "bad",
            "label": "不满意",
            "requires": [{ "questionId": "comment" }]
          }
        ]
      },
      {
        "id": "comment",
        "type": "textarea",
        "label": "有什么想补充的？",
        "required": false,
        "maxLength": 1000
      },
      {
        "id": "photo",
        "type": "image_upload",
        "label": "可选：上传现场或凭证图片",
        "required": false,
        "purpose": "feedback"
      }
    ]
  }'::jsonb
)
on conflict ("key", "version") do update
set
  "title" = excluded."title",
  "definition" = excluded."definition",
  "updated_at" = now();
