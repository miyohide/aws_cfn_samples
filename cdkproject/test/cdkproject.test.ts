import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Cdkproject from '../lib/cdkproject-stack';

test('VPC Created', () => {
  // テストではcdk.jsonからはデータを読まないのでここで設定する
  const app = new cdk.App({
    context: {
        'systemName': 'foo',
        'envType': 'bar'
    }
  });
  const stack = new Cdkproject.CdkprojectStack(app, 'MyTestStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::EC2::VPC', {
    CidrBlock: '10.0.0.0/16',
    Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-vpc'}]
  });
});
