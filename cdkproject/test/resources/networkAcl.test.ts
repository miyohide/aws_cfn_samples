import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as Cdkproject from '../../lib/cdkproject-stack';

test('NetworkAcl Created', () => {
    const app = new cdk.App({});
    const stack = new Cdkproject.CdkprojectStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    // NetworkAclが想定通り作られているか
    template.resourceCountIs('AWS::EC2::NetworkAcl', 3);
    template.resourceCountIs('AWS::EC2::NetworkAclEntry', 6);
    template.resourceCountIs('AWS::EC2::SubnetNetworkAclAssociation', 6);
    template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
        NetworkAclId: Match.anyValue(),
        Protocol: -1,
        RuleAction: 'allow',
        RuleNumber: 100,
        CidrBlock: '0.0.0.0/0'
    });
    template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
        NetworkAclId: Match.anyValue(),
        Protocol: -1,
        RuleAction: 'allow',
        RuleNumber: 100,
        CidrBlock: '0.0.0.0/0',
        Egress: true
    });
    template.hasResourceProperties('AWS::EC2::SubnetNetworkAclAssociation', {
        NetworkAclId: Match.anyValue(),
        SubnetId: Match.anyValue()
    });
});
