data "archive_file" "notification_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../app/dist"
  output_path = "${path.module}/../notification-lambda.zip"
  excludes    = [
    ".DS_Store",
    "Thumbs.db"
  ]
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}