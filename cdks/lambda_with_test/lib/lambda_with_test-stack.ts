import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class LambdaWithTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // AWS CDKを使ってRubyランタイムのLambda関数を作成する
    const lambdaFunction = new cdk.aws_lambda.Function(this, 'RubyLambda', {
      runtime: cdk.aws_lambda.Runtime.RUBY_3_4,
      handler: 'index.handler',
      code: cdk.aws_lambda.Code.fromInline(`
require 'json'

def handler(event:, context:)
  time = Time.now.strftime('%Y-%m-%d %H:%M:%S')
  response = {
    "statusCode": 200,
    "body": JSON.generate({
      message: 'Hello from Lambda!',
      time: time
    })
  }
  response
end
      `),
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
    });
  }
}
