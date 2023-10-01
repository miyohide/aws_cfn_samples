import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as Cdkproject from '../../lib/cdkproject-stack';

test('IAM Role Created', () => {
    const app = new cdk.App({});
    const stack = new Cdkproject.CdkprojectStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    // IAM Roleが想定通り作られているか
    template.resourceCountIs('AWS::IAM::Role', 2);
    template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
            Statement: [{
                Effect: 'Allow',
                Principal: {
                    Service: Match.anyValue()
                },
                Action: 'sts:AssumeRole'
            }]
        },
        ManagedPolicyArns: [
            'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
            'arn:aws:iam::aws:policy/AmazonRDSFullAccess'
        ],
    });
    template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
            Statement: [{
                Effect: 'Allow',
                Principal: {
                    Service: 'monitoring.rds.amazonaws.com'
                },
                Action: 'sts:AssumeRole'
            }]
        },
        ManagedPolicyArns: [
            'arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole'
        ],
    });
    template.resourceCountIs('AWS::IAM::InstanceProfile', 1);
    template.hasResourceProperties('AWS::IAM::InstanceProfile', {
        Roles: Match.anyValue()
    })
});
