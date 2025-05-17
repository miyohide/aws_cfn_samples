import * as cdk from 'aws-cdk-lib';
import { CfnSchema } from 'aws-cdk-lib/aws-eventschemas';
import { Construct } from 'constructs';

export class LambdaWithTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaName = 'ruby-lambda-with-test'

    // AWS CDKを使ってRubyランタイムのLambda関数を作成する
    const lambdaFunction = new cdk.aws_lambda.Function(this, 'RubyLambda', {
      functionName: lambdaName,
      runtime: cdk.aws_lambda.Runtime.RUBY_3_4,
      handler: 'index.handler',
      code: cdk.aws_lambda.Code.fromInline(`
require 'json'

def handler(event:, context:)
  message = event['message'] || 'Hello'
  time = Time.now.strftime('%Y-%m-%d %H:%M:%S')
  response = {
    "statusCode": 200,
    "body": JSON.generate({
      message: message,
      time: time
    })
  }
  response
end
      `),
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
    });

    // testEventを作成
    new CfnSchema(this, `${id}-CfnSchema`, {
      registryName: 'lambda-testevent-schemas',
      type: 'OpenApi3',
      schemaName: `_${lambdaName}-schema`,
      content: JSON.stringify({
        "openapi": "3.0.0",
        "info": {
          "version": "1.0.0",
          "title": "TestEvent"
        },
        "paths": {},
        "components": {
          "schemas": {
            "Event": {
              "type": "object",
              "properties": {
                "message": {
                  "type": "string"
                }
              },
              "required": [
                "message"
              ]
            }
          },
          examples: {
            "sample1": {
              "value": {
                "message": "Hello from Lambda!"
              }
            }
          }
        }
      })
    })
  }
}
