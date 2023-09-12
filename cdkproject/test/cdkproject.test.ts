import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Cdkproject from '../lib/cdkproject-stack';

test('VPC Created', () => {
  const app = new cdk.App();
  const stack = new Cdkproject.CdkprojectStack(app, 'MyTestStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::EC2::VPC', {
    CidrBlock: '10.0.0.0/16',
    Tags: [{ 'Key': 'Name', 'Value': 'cdkproject-development-vpc'}]
  });
});
