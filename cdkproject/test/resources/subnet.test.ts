import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Cdkproject from '../../lib/cdkproject-stack';

test('VPC Created', () => {
    const app = new cdk.App({});
    const stack = new Cdkproject.CdkprojectStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    // Subnetが想定通り作られているか
    template.resourceCountIs('AWS::EC2::Subnet', 6);
    template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: '10.0.11.0/24',
        AvailabilityZone: 'ap-northeast-1a',
    });
    template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: '10.0.12.0/24',
        AvailabilityZone: 'ap-northeast-1c',
    });
    template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: '10.0.21.0/24',
        AvailabilityZone: 'ap-northeast-1a',
    });
    template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: '10.0.22.0/24',
        AvailabilityZone: 'ap-northeast-1c',
    });
    template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: '10.0.31.0/24',
        AvailabilityZone: 'ap-northeast-1a',
    });
    template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: '10.0.32.0/24',
        AvailabilityZone: 'ap-northeast-1c',
    });
});
