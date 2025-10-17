terraform {
  required_providers {
    aws = {
      version = "~>5.0"
      source  = "hashicorp/aws"
    }
  }
}

# lambda funcion - SOLO UNA LAMBDA
resource "aws_lambda_function" "send_notifications_lambda" {
  filename         = data.archive_file.notification_lambda.output_path
  function_name    = "send-notifications-dev"
  handler          = "sendNotification.handler"
  runtime          = "nodejs20.x"
  timeout          = 900
  memory_size      = 512
  role             = aws_iam_role.lambda_execution_role.arn
  source_code_hash = data.archive_file.notification_lambda.output_base64sha256

  environment {
    variables = {
      GMAIL_APP_PASSWORD  = "zyfh mnzd byut egyd",
      GMAIL_USER          = "santiagoandresalvarezpereira@gmail.com",
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.notifications_table.name
      ERROR_TABLE_NAME    = aws_dynamodb_table.notifications_error_table.name
      S3_BUCKET_NAME      = aws_s3_bucket.templates_bucket.bucket
      S3_ERRORS_BUCKET    = aws_s3_bucket.errors_bucket.bucket
      SQS_QUEUE_URL       = aws_sqs_queue.notification_email_sqs.url
      REGION              = var.aws_region
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_custom_policy,
  ]
}

# IAM Role para Lambda
resource "aws_iam_role" "lambda_execution_role" {
  name               = "${var.project_name}-lambda-role-${var.stage}"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  tags = {
    Name        = "Lambda Execution Role"
    Environment = var.stage
    Project     = var.project_name
  }
}

# IAM Policy para Lambda (AGREGAR)
resource "aws_iam_policy" "lambda_policy_v2" {
  name        = "${var.project_name}-lambda-policy-v2-${var.stage}"
  description = "IAM policy for notifications lambda function"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility",
          "sqs:SendMessage"
        ]
        Resource = [
          aws_sqs_queue.notification_email_sqs.arn,
          aws_sqs_queue.notification_email_error_sqs.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.notifications_table.arn,
          aws_dynamodb_table.notifications_error_table.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.templates_bucket.arn}/*",
          "${aws_s3_bucket.templates_bucket.arn}",
          "${aws_s3_bucket.errors_bucket.arn}",
          "${aws_s3_bucket.errors_bucket.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_custom_policy" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.lambda_policy_v2.arn
}

# IAM Policy Attachment for basic Lambda execution
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Cambiar el nombre del CloudWatch 
resource "aws_cloudwatch_log_group" "lambda_log_group_v2" {             
  name              = "/aws/lambda/${var.project_name}-v2-${var.stage}" 
  retention_in_days = 14

  tags = {
    Name        = "Lambda Log Group"
    Environment = var.stage
    Project     = var.project_name
  }
}



resource "aws_s3_bucket" "templates_bucket" {
  bucket = "infernobank-notifications-templates-dev-${var.stage}-new"
}

# Política de bucket para templates
resource "aws_s3_bucket_policy" "templates_bucket_policy" {
  bucket = aws_s3_bucket.templates_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution_role.arn
        }
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.templates_bucket.arn,
          "${aws_s3_bucket.templates_bucket.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_s3_bucket" "errors_bucket" {
  bucket = "infernobank-notifications-errors-dev-${var.stage}-new"
}

# Política de bucket para errores
resource "aws_s3_bucket_policy" "errors_bucket_policy" {
  bucket = aws_s3_bucket.errors_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLambdaAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_execution_role.arn
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.errors_bucket.arn,
          "${aws_s3_bucket.errors_bucket.arn}/*"
        ]
      }
    ]
  })
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# DynamoDB Tables según contratos
resource "aws_dynamodb_table" "notifications_table" {
  name           = "notification-table"
  billing_mode   = "PROVISIONED"
  read_capacity  = 20
  write_capacity = 20
  hash_key       = "uuid"
  range_key      = "createdAt"

  attribute {
    name = "uuid"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }
}

resource "aws_dynamodb_table" "notifications_error_table" {
  name           = "notification-error-table"
  billing_mode   = "PROVISIONED"
  read_capacity  = 20
  write_capacity = 20
  hash_key       = "uuid"
  range_key      = "createdAt"

  attribute {
    name = "uuid"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }
}

# SQS Queues según contratos
resource "aws_sqs_queue" "notification_email_error_sqs" {
  name                       = "notification-email-error-sqs"
  visibility_timeout_seconds = 70
}

# SQS Queue principal - notification-email-sqs
resource "aws_sqs_queue" "notification_email_sqs" {
  name                        = "notification-email-sqs"
  fifo_queue                  = false
  content_based_deduplication = false
  visibility_timeout_seconds  = 930

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_email_error_sqs.arn
    maxReceiveCount     = 2
  })
}

# SQS Event Source Mapping - Solo UNA lambda maneja todo
resource "aws_lambda_event_source_mapping" "sqs_lambda_trigger" {
  event_source_arn                   = aws_sqs_queue.notification_email_sqs.arn
  function_name                      = aws_lambda_function.send_notifications_lambda.arn
  batch_size                         = 1
  maximum_batching_window_in_seconds = 5

  depends_on = [aws_iam_role_policy_attachment.lambda_custom_policy]
}

resource "aws_api_gateway_rest_api" "notifications_api" {
  name        = "${var.project_name}-api-${var.stage}"
  description = "API Gateway for Inferno Bank Notifications"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# API Gateway Resource
resource "aws_api_gateway_resource" "notifications_resource" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  parent_id   = aws_api_gateway_rest_api.notifications_api.root_resource_id
  path_part   = "send-notification"
}

# API Gateway Method (POST)
resource "aws_api_gateway_method" "notifications_post" {
  rest_api_id   = aws_api_gateway_rest_api.notifications_api.id
  resource_id   = aws_api_gateway_resource.notifications_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

# API Gateway Integration (POST)
resource "aws_api_gateway_integration" "notifications_integration" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.notifications_resource.id
  http_method = aws_api_gateway_method.notifications_post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.send_notifications_lambda.invoke_arn
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "notifications_deployment" {
  depends_on = [aws_api_gateway_integration.notifications_integration]

  rest_api_id = aws_api_gateway_rest_api.notifications_api.id

  lifecycle {
    create_before_destroy = true
  }

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.notifications_resource.id,
      aws_api_gateway_method.notifications_post.id,
      aws_api_gateway_integration.notifications_integration.id,
    ]))
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "notifications_stage" {
  deployment_id = aws_api_gateway_deployment.notifications_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.notifications_api.id
  stage_name    = var.stage
}

# Lambda Permission para API Gateway
resource "aws_lambda_permission" "api_gateway_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.send_notifications_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.notifications_api.execution_arn}/*/*"
}
