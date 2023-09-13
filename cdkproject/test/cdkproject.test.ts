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

  // VPCが想定通り作られているか
  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.hasResourceProperties('AWS::EC2::VPC', {
    CidrBlock: '10.0.0.0/16',
    Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-vpc'}]
  });

  // Subnetが想定通り作られているか
  template.resourceCountIs('AWS::EC2::Subnet', 6);
  template.hasResourceProperties('AWS::EC2::Subnet', {
    CidrBlock: '10.0.11.0/24',
    AvailabilityZone: 'ap-northeast-1a',
    Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-subnet-public-1a'}]
  });
  template.hasResourceProperties('AWS::EC2::Subnet', {
    CidrBlock: '10.0.12.0/24',
    AvailabilityZone: 'ap-northeast-1c',
    Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-subnet-public-1c'}]
  });
  template.hasResourceProperties('AWS::EC2::Subnet', {
    CidrBlock: '10.0.21.0/24',
    AvailabilityZone: 'ap-northeast-1a',
    Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-subnet-app-1a'}]
  });
  template.hasResourceProperties('AWS::EC2::Subnet', {
    CidrBlock: '10.0.22.0/24',
    AvailabilityZone: 'ap-northeast-1c',
    Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-subnet-app-1c'}]
  });
  template.hasResourceProperties('AWS::EC2::Subnet', {
    CidrBlock: '10.0.31.0/24',
    AvailabilityZone: 'ap-northeast-1a',
    Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-subnet-db-1a'}]
  });
  template.hasResourceProperties('AWS::EC2::Subnet', {
    CidrBlock: '10.0.32.0/24',
    AvailabilityZone: 'ap-northeast-1c',
    Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-subnet-db-1c'}]
  });
});
