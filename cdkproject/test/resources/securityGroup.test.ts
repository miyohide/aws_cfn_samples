import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as Cdkproject from '../../lib/cdkproject-stack';

test('SecurityGroup Created', () => {
    const app = new cdk.App({});
    const stack = new Cdkproject.CdkprojectStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    // Security Groupが想定通り作られているか
    template.resourceCountIs('AWS::EC2::SecurityGroup', 3);
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: "for ALB",
        VpcId: Match.anyValue()
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: "for EC2",
        VpcId: Match.anyValue()
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: "for RDS",
        VpcId: Match.anyValue()
    });

    template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 4);
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: "tcp",
        CidrIp: "0.0.0.0/0",
        FromPort: 80,
        ToPort: 80,
        GroupId: Match.anyValue()
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: "tcp",
        CidrIp: "0.0.0.0/0",
        FromPort: 443,
        ToPort: 443,
        GroupId: Match.anyValue()
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: "tcp",
        FromPort: 80,
        ToPort: 80,
        GroupId: Match.anyValue(),
        SourceSecurityGroupId: Match.anyValue()
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: "tcp",
        FromPort: 3306,
        ToPort: 3306,
        GroupId: Match.anyValue(),
        SourceSecurityGroupId: Match.anyValue()
    });
});
