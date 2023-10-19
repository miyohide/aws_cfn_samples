import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as Cdkproject from '../../lib/cdkproject-stack';

test('EC2 Created', () => {
    const app = new cdk.App({});
    const stack = new Cdkproject.CdkprojectStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    // EC2が想定通り作られているか
    template.resourceCountIs('AWS::EC2::Instance', 2);
    template.hasResourceProperties('AWS::EC2::Instance', {
        AvailabilityZone: 'ap-northeast-1a',
        IamInstanceProfile: Match.anyValue(),
        ImageId: Match.anyValue(),
        InstanceType: 't2.micro',
        SecurityGroupIds: Match.anyValue(),
        SubnetId: Match.anyValue()
    });
    template.hasResourceProperties('AWS::EC2::Instance', {
        AvailabilityZone: 'ap-northeast-1c',
        IamInstanceProfile: Match.anyValue(),
        ImageId: Match.anyValue(),
        InstanceType: 't2.micro',
        SecurityGroupIds: Match.anyValue(),
        SubnetId: Match.anyValue()
    });
});
