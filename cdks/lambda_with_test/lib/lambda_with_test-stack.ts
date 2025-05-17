import * as cdk from 'aws-cdk-lib';
import { CfnSchema } from 'aws-cdk-lib/aws-eventschemas';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import path from 'path';
export class LambdaWithTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaName = 'nodejs-lambda-with-test'

    // AWS CDKを使ってRubyランタイムのLambda関数を作成する
    new NodejsFunction(this, `${id}-TestFunction`, {
      runtime: Runtime.NODEJS_LATEST,
      entry: path.join(__dirname, '../lambda/mylambda.ts'),
      handler: 'handler',
      functionName: lambdaName
    });
//     const lambdaFunction = new cdk.aws_lambda.Function(this, 'RubyLambda', {
//       functionName: lambdaName,
//       runtime: cdk.aws_lambda.Runtime.NODEJS_LATEST,
//       handler: 'index.handler',
//       code: cdk.aws_lambda.Code.fromInline(`
// exports.handler = async (event) => {
//   const message = event['message'] || 'Hello'
//   const time = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
//   const response = {
//     "statusCode": 200,
//     "body": JSON.stringify({
//       message: message,
//       time: time
//     })
//   }
//   return response
// };
//       `),
//       memorySize: 128,
//       timeout: cdk.Duration.seconds(30),
//     });

    // testEventを作成
    new CfnSchema(this, `${id}-CfnSchema`, {
      registryName: 'lambda-testevent-schemas',
      type: 'OpenApi3',
      schemaName: `_${lambdaName}-schema`,
      content: JSON.stringify({
        openapi: "3.0.0",
        info: {
          version: "1.0.0",
          title: "Event"
        },
        paths: {},
        components: {
          schemas: {
            Event: {
              type: "object",
              properties: {
                message: {
                  type: "string"
                }
              },
              required: [
                "message"
              ]
            }
          },
          examples: {
            "sample1": {
              value: {
                message: "Hello from Lambda!"
              }
            }
          }
        }
      })
    })
  }
}
