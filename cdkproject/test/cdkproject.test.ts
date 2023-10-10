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

    // contextに関するテストを実施
    template.hasResourceProperties('AWS::EC2::VPC', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-vpc' }]
    });

    template.hasResourceProperties('AWS::EC2::Subnet', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-subnet-public-1a' }]
    });
    template.hasResourceProperties('AWS::EC2::Subnet', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-subnet-public-1c' }]
    });
    template.hasResourceProperties('AWS::EC2::Subnet', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-subnet-app-1a' }]
    });
    template.hasResourceProperties('AWS::EC2::Subnet', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-subnet-app-1c' }]
    });
    template.hasResourceProperties('AWS::EC2::Subnet', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-subnet-db-1a' }]
    });
    template.hasResourceProperties('AWS::EC2::Subnet', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-subnet-db-1c' }]
    });
    template.hasResourceProperties('AWS::EC2::InternetGateway', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-igw' }]
    });
    template.hasResourceProperties('AWS::EC2::EIP', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-eip-ngw-1a' }]
    });
    template.hasResourceProperties('AWS::EC2::EIP', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-eip-ngw-1c' }]
    });
    template.hasResourceProperties('AWS::EC2::NatGateway', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-ngw-1a' }]
    });
    template.hasResourceProperties('AWS::EC2::NatGateway', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-ngw-1c' }]
    });
    // RouteTableのタグのテスト
    template.hasResourceProperties('AWS::EC2::RouteTable', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-rtb-public' }]
    });
    template.hasResourceProperties('AWS::EC2::RouteTable', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-rtb-app-1a' }]
    });
    template.hasResourceProperties('AWS::EC2::RouteTable', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-rtb-app-1c' }]
    });
    template.hasResourceProperties('AWS::EC2::RouteTable', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-rtb-db' }]
    });
    // Network ACLのタグのテスト
    template.hasResourceProperties('AWS::EC2::NetworkAcl', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-nacl-public' }]
    });
    template.hasResourceProperties('AWS::EC2::NetworkAcl', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-nacl-app' }]
    });
    template.hasResourceProperties('AWS::EC2::NetworkAcl', {
        Tags: [{ 'Key': 'Name', 'Value': 'foo-bar-nacl-db' }]
    });
    template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'foo-bar-role-ec2'
    });
    template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'foo-bar-role-rds'
    });
    template.hasResourceProperties('AWS::IAM::InstanceProfile', {
        InstanceProfileName: 'foo-bar-role-ec2'
    });
});
