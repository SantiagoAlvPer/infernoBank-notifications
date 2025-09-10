variable "project_name" {
  type        = string
  default     = "infernobank-notifications"
  description = "Project name used for resource naming"
}

variable "file_name" {
  type        = string
  default     = "sendNotification.handler"
  description = "Base name of the Lambda function file (without extension)"
}

variable "stage" {
  type        = string
  default     = "dev"
  description = "Deployment stage (dev, staging, prod)"
}

variable "aws_region" {
  type        = string
  default     = "us-east-2"
  description = "AWS region for deployment"
}
