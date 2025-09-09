terraform {
  required_providers {
    aws = {
      version = "~>5.0"
      source  = "hashicorp/aws"
    }
  }
}

# lambda funcion
resource "aws_lambda_function" "notifications_lambda" {
  filename         = data.archive_file.notification_lambda.output_path
  function_name    = "${var.project_name}-${var.stage}"
  handler          = "sendNotification.handler.handler"
  runtime          = "nodejs20.x"
  timeout          = 900
  memory_size      = 512
  role            = aws_iam_role.lambda_execution_role.arn
  source_code_hash = data.archive_file.notification_lambda.output_base64sha256

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_custom_policy,
  ]
}

# IAM Role para Lambda
resource "aws_iam_role" "lambda_execution_role" {
  name = "${var.project_name}-lambda-role-${var.stage}"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json

  tags = {
    Name        = "Lambda Execution Role"
    Environment = var.stage
    Project     = var.project_name
  }
}

<<<<<<< Updated upstream
# Política básica de Lambda
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Política personalizada para Lambda
resource "aws_iam_policy" "lambda_policy" {
  name        = "${var.project_name}-lambda-policy-${var.stage}"
  description = "IAM policy for notification lambda function"
=======
# IAM Policy para Lambda (AGREGAR)
resource "aws_iam_policy" "lambda_policy_v2" {                      # Cambiar nombre aquí
  name        = "${var.project_name}-lambda-policy-v2-${var.stage}" # Cambiar nombre aquí
  description = "IAM policy for notifications lambda function"
>>>>>>> Stashed changes

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
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_custom_policy" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

<<<<<<< Updated upstream
# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name              = "/aws/lambda/${var.project_name}-${var.stage}"
=======
# Cambiar el nombre del CloudWatch Log Group (línea 114)
resource "aws_cloudwatch_log_group" "lambda_log_group_v2" {             # Cambiar nombre aquí
  name              = "/aws/lambda/${var.project_name}-v2-${var.stage}" # Cambiar nombre aquí
>>>>>>> Stashed changes
  retention_in_days = 14

  tags = {
    Name        = "Lambda Log Group"
    Environment = var.stage
    Project     = var.project_name
  }
}

<<<<<<< Updated upstream
# DynamoDB Table
resource "aws_dynamodb_table" "notifications_table" {
  name = "notications-table"
  billing_mode = "PROVISIONED"
  read_capacity = 20
=======

# S3 Bucket para templates (AGREGAR - estaba referenciado pero no declarado)
resource "aws_s3_bucket" "templates_bucket" {
  bucket = "${var.project_name}-templates-${var.stage}-${random_string.bucket_suffix.result}"
}

# S3 Bucket para notifications (AGREGAR - referenciado en data.tf)
resource "aws_s3_bucket" "notification_bucket" {
  bucket = "${var.project_name}-notifications-${var.stage}-${random_string.bucket_suffix.result}"
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Lambda function principal
resource "aws_lambda_function" "notifications_lambda" {
  filename         = data.archive_file.notification_lambda.output_path
  function_name    = "${var.project_name}-${var.stage}"
  handler          = "sendNotification.handler.handler"
  runtime          = "nodejs20.x"
  timeout          = 900
  memory_size      = 512
  role             = aws_iam_role.lambda_execution_role.arn
  source_code_hash = data.archive_file.notification_lambda.output_base64sha256

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.notifications_table.name
      ERROR_TABLE_NAME    = aws_dynamodb_table.notications-error-table.name
      S3_BUCKET_NAME      = aws_s3_bucket.templates_bucket.bucket
      REGION              = var.aws_region # Cambiar AWS_REGION por REGION
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_custom_policy,
  ]
}

# Lambda Function para HTTP handler
resource "aws_lambda_function" "http_notifications_lambda" {
  filename         = data.archive_file.notification_lambda.output_path
  function_name    = "${var.project_name}-http-${var.stage}"
  handler          = "httpNotification.handlers.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 512
  role             = aws_iam_role.lambda_execution_role.arn
  source_code_hash = data.archive_file.notification_lambda.output_base64sha256

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.notifications_table.name
      ERROR_TABLE_NAME    = aws_dynamodb_table.notications-error-table.name
      S3_BUCKET_NAME      = aws_s3_bucket.templates_bucket.bucket
      REGION              = var.aws_region # Cambiar AWS_REGION por REGION
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_custom_policy,
  ]
}

resource "aws_lambda_function" "send_notifications_error_lambda" {
  filename         = data.archive_file.notification_lambda.output_path
  function_name    = "${var.project_name}-error-${var.stage}"
  handler          = "errorHandler.handlers.handler"
  runtime          = "nodejs20.x"
  timeout          = 60
  memory_size      = 256
  role             = aws_iam_role.lambda_execution_role.arn
  source_code_hash = data.archive_file.notification_lambda.output_base64sha256

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.notifications_table.name
      ERROR_TABLE_NAME    = aws_dynamodb_table.notications-error-table.name
      S3_BUCKET_NAME      = aws_s3_bucket.templates_bucket.bucket
      REGION              = var.aws_region
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_custom_policy,
  ]
}

resource "aws_lambda_event_source_mapping" "dlq_lambda_trigger" {
  event_source_arn = aws_sqs_queue.ambording_sqs_queue_dlq.arn
  function_name    = aws_lambda_function.send_notifications_error_lambda.arn
  batch_size       = 1


  depends_on = [aws_iam_role_policy_attachment.lambda_custom_policy]
}
# DynamoDB Table
resource "aws_dynamodb_table" "notifications_table" {
  name           = "notications-table"
  billing_mode   = "PROVISIONED"
  read_capacity  = 20
>>>>>>> Stashed changes
  write_capacity = 20
  hash_key = "uuid"
  range_key = "createdAt"

  attribute {
    name = "uuid"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

}

resource "aws_dynamodb_table" "notications-error-table" {
  name = "notications-erro-table"
  billing_mode = "PROVISIONED"
  read_capacity = 20
  write_capacity = 20
  hash_key = "uuid"
  range_key = "createdAt"

  attribute {
    name = "uuid"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "N"
  }
<<<<<<< Updated upstream
  
}
=======
}

# SQS Queues
resource "aws_sqs_queue" "ambording_sqs_queue_dlq" {
  name = var.ambording_sqs_name_dlq
  visibility_timeout_seconds = 70
}

# SQS Queue principal 
resource "aws_sqs_queue" "ambording_sqs_queue" {
  name                        = var.ambording_sqs_name
  fifo_queue                  = false
  content_based_deduplication = false
  visibility_timeout_seconds  = 930

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.ambording_sqs_queue_dlq.arn
    maxReceiveCount     = 5
  })
}

# SQS Event Source Mapping
resource "aws_lambda_event_source_mapping" "sqs_lambda_trigger" {
  event_source_arn                   = aws_sqs_queue.ambording_sqs_queue.arn
  function_name                      = aws_lambda_function.notifications_lambda.arn
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
  uri                     = aws_lambda_function.http_notifications_lambda.invoke_arn
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
  function_name = aws_lambda_function.http_notifications_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.notifications_api.execution_arn}/*/*"
}
>>>>>>> Stashed changes
