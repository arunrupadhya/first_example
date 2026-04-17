# AWS Secrets Manager Setup

This project now supports loading sensitive configuration from AWS Secrets Manager during application startup.

## Required app setting

Set the secret name before starting the backend:

- `AWS_SECRET_NAME`
- optional: `AWS_SECRETS_REGION`

## Recommended secret JSON

Store a JSON payload in AWS Secrets Manager with these app keys:

```json
{
  "SPRING_DATASOURCE_URL": "jdbc:postgresql://<host>:5432/<db>",
  "DB_USERNAME": "<db-user>",
  "DB_PASSWORD": "<db-password>",
  "AWS_ACCESS_KEY_ID": "<optional-access-key>",
  "AWS_SECRET_ACCESS_KEY": "<optional-secret-key>",
  "AWS_S3_BUCKET_NAME": "<bucket-name>",
  "AWS_REGION": "us-east-1",
  "MAIL_USERNAME": "<smtp-user>",
  "GOOGLE_OAUTH2_CLIENT_ID": "<client-id>",
  "GOOGLE_OAUTH2_CLIENT_SECRET": "<client-secret>",
  "GOOGLE_OAUTH2_REFRESH_TOKEN": "<refresh-token>",
  "JWT_SECRET": "<32+ char jwt secret>",
  "AWS_BEDROCK_MODEL_ID": "anthropic.claude-3-sonnet-20240229-v1:0"
}
```

## Notes

- These keys now map directly to the backend configuration.
- MAIL_PASSWORD is not required because email auth is handled through OAuth2 refresh token flow.
- If AWS keys are omitted, the app uses the default AWS credential chain.
- Local startup still works with environment variables if you prefer not to use Secrets Manager.
