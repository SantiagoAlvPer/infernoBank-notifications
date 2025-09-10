output "api_gateway_invoke_url" {
  description = "URL para probar con Postman"
  value       = "https://${aws_api_gateway_rest_api.notifications_api.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.notifications_stage.stage_name}/send-notification"
}

output "sqs_queue_url" {
  description = "URL de la cola SQS"
  value       = aws_sqs_queue.notification_email_sqs.url
}

output "dynamodb_table_name" {
  description = "Nombre de la tabla DynamoDB"
  value       = aws_dynamodb_table.notifications_table.name
}

output "dynamodb_table_error_name" {
  description = "Nombre de la tabla DynamoDB para errores"
  value       = aws_dynamodb_table.notifications_error_table.name
}

# output "s3_bucket_name" {
#   description = "Nombre del bucket S3"
#   value       = aws_s3_bucket.templates_bucket.bucket
# }